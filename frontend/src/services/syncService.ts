// Servicio de Sincronización Unidireccional e Idempotente para La Palmera POS v23
// Arquitectura: SQLite Local (Operación 100% Offline) -> API Segura -> PostgreSQL Online
import { dbManager } from '../database/db';
import { api, testApiConnection } from './api';

export interface SyncStatusInfo {
  isOnline: boolean;
  serverConnected: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  lastError: string | null;
  counts: {
    products: number;
    categories: number;
    clients: number;
    ventas: number;
    compras: number;
  };
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  errors: number;
  error?: string;
  pulled?: any;
}

export class SyncService {
  private static instance: SyncService;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private serverConnected: boolean = false;
  private listeners: Array<(status: SyncStatusInfo) => void> = [];
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private syncTimer: any = null;
  private debounceTimer: any = null;

  private constructor() {
    this.resetStrandedSyncingOperations();
    this.initEventListeners();
    this.startAutoSyncLoop();
  }

  private async resetStrandedSyncingOperations(): Promise<void> {
    try {
      const db = await dbManager.getConnection();
      await db.execute(
        "UPDATE sync_queue SET estado = 'pendiente' WHERE estado = 'sincronizando'"
      );
    } catch {
      // Ignorar si la base de datos se está inicializando
    }
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private initEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners();
        this.scheduleSync(2000); // Reintentar a los 2 segundos de volver internet
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.serverConnected = false;
        this.notifyListeners();
      });
    }
  }

  private startAutoSyncLoop() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    // Verificar y sincronizar en segundo plano cada 30 segundos si hay conexión
    this.syncTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && !this.isSyncing) {
        this.pushPendingQueue().catch(() => {});
      }
    }, 30000);
  }

  public subscribe(listener: (status: SyncStatusInfo) => void): () => void {
    this.listeners.push(listener);
    this.getStatus().then(status => listener(status));
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private async notifyListeners() {
    const status = await this.getStatus();
    this.listeners.forEach(l => l(status));
  }

  public async getStatus(): Promise<SyncStatusInfo> {
    let pendingCount = 0;
    const counts = { products: 0, categories: 0, clients: 0, ventas: 0, compras: 0 };
    
    try {
      const db = await dbManager.getConnection();
      
      const qCount = await db.select<{ c: number }>(
        "SELECT count(*) as c FROM sync_queue WHERE estado IN ('pendiente', 'sincronizando', 'error')"
      );
      pendingCount = qCount[0]?.c || 0;

      const pCount = await db.select<{ c: number }>("SELECT count(*) as c FROM productos");
      const cCount = await db.select<{ c: number }>("SELECT count(*) as c FROM categorias");
      const clCount = await db.select<{ c: number }>("SELECT count(*) as c FROM clientes");
      const vCount = await db.select<{ c: number }>("SELECT count(*) as c FROM ventas");
      const compCount = await db.select<{ c: number }>("SELECT count(*) as c FROM compras");

      counts.products = pCount[0]?.c || 0;
      counts.categories = cCount[0]?.c || 0;
      counts.clients = clCount[0]?.c || 0;
      counts.ventas = vCount[0]?.c || 0;
      counts.compras = compCount[0]?.c || 0;
    } catch (e) {
      // Ignorar en arranque
    }

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : this.isOnline,
      serverConnected: this.serverConnected,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      isSyncing: this.isSyncing,
      lastError: this.lastError,
      counts,
    };
  }

  /**
   * Encola una operación local de forma segura en la tabla sync_queue de SQLite con operation_id único
   */
  public async enqueueChange(
    tabla: string,
    registroId: string | number,
    operacion: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any
  ): Promise<string> {
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    const operationId = `op_${tabla}_${registroId}_${Date.now()}_${uniqueSuffix}`;

    try {
      const db = await dbManager.getConnection();
      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      await db.execute(
        `INSERT INTO sync_queue (operation_id, tabla, registro_id, operacion, payload_json, estado, intentos, creado_en)
         VALUES (?, ?, ?, ?, ?, 'pendiente', 0, datetime('now', 'localtime'))`,
        [operationId, tabla, Number(registroId) || 0, operacion, payloadStr]
      );

      this.notifyListeners();
      // Si estamos online, intentar sincronizar con debounce de 1 segundo
      this.scheduleSync(1000);
    } catch (err) {
      console.warn('[SyncService] Aviso encolando cambio en sync_queue:', err);
    }

    return operationId;
  }

  private scheduleSync(delayMs: number = 1000) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.pushPendingQueue().catch(() => {});
    }, delayMs);
  }

  /**
   * Asegura que ventas no sincronizadas estén encoladas en sync_queue
   */
  private async ensureUnsyncedSalesInQueue(): Promise<void> {
    try {
      const db = await dbManager.getConnection();
      const unsyncedSales = await db.select<any>(
        "SELECT * FROM ventas WHERE sincronizado = 0 OR sincronizado IS NULL"
      );

      for (const sale of unsyncedSales) {
        // Verificar si ya está en sync_queue pendiente o completada
        const inQueue = await db.select<any>(
          "SELECT id FROM sync_queue WHERE tabla = 'ventas' AND registro_id = ?",
          [sale.id]
        );

        if (!inQueue || inQueue.length === 0) {
          // Obtener items y pagos
          const items = await db.select<any>("SELECT * FROM venta_items WHERE venta_id = ?", [sale.id]);
          const pagos = await db.select<any>("SELECT * FROM venta_pagos WHERE venta_id = ?", [sale.id]);
          const fullSale = { ...sale, items, pagos };
          const operationId = `op_ventas_${sale.id}_folio_${sale.folio || sale.id}_${Date.now()}`;

          await db.execute(
            `INSERT INTO sync_queue (operation_id, tabla, registro_id, operacion, payload_json, estado, intentos, creado_en)
             VALUES (?, 'ventas', ?, 'INSERT', ?, 'pendiente', 0, datetime('now', 'localtime'))`,
            [operationId, sale.id, JSON.stringify(fullSale)]
          );
        }
      }
    } catch (e) {
      console.warn('[SyncService] Aviso verificando ventas no sincronizadas:', e);
    }
  }

  /**
   * Procesa el lote de registros pendientes en sync_queue (máximo 50 por lote)
   * y los envía a la API Backend de forma segura y no bloqueante.
   */
  public async pushPendingQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: true, pushed: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const db = await dbManager.getConnection();

      // 1. Asegurar que las ventas offline estén en la cola
      await this.ensureUnsyncedSalesInQueue();

      // 2. Obtener elementos pendientes (lote de hasta 50 elementos para eficiencia)
      const queueItems = await db.select<any>(
        "SELECT * FROM sync_queue WHERE estado IN ('pendiente', 'sincronizando', 'error') AND intentos < 10 ORDER BY id ASC LIMIT 50"
      );

      if (!queueItems || queueItems.length === 0) {
        this.isSyncing = false;
        this.notifyListeners();
        return { success: true, pushed: 0, errors: 0 };
      }

      // Marcar temporalmente como sincronizando en SQLite
      const idsToProcess = queueItems.map(q => q.id);
      for (const qId of idsToProcess) {
        await db.execute("UPDATE sync_queue SET estado = 'sincronizando' WHERE id = ?", [qId]).catch(() => {});
      }

      // 3. Enviar lote a la API Backend
      const response = await api.post('/sync/push', { items: queueItems });

      if (response && response.success) {
        this.serverConnected = true;
        this.lastError = null;
        let pushedCount = 0;
        let errorCount = 0;

        for (const resItem of (response.results || [])) {
          const { id, operation_id, status, tabla, registro_id, error } = resItem;
          
          if (status === 'synced') {
            pushedCount++;
            // Marcar completado en sync_queue
            if (id) {
              await db.execute(
                "UPDATE sync_queue SET estado = 'completado', sincronizado_en = datetime('now', 'localtime') WHERE id = ?",
                [id]
              );
            } else if (operation_id) {
              await db.execute(
                "UPDATE sync_queue SET estado = 'completado', sincronizado_en = datetime('now', 'localtime') WHERE operation_id = ?",
                [operation_id]
              );
            }

            // Si es venta, marcar sincronizado = 1 en tabla ventas
            if (tabla === 'ventas' || tabla === 'venta') {
              await db.execute(
                "UPDATE ventas SET sincronizado = 1 WHERE id = ? OR folio = ?",
                [registro_id, registro_id]
              );
            }
          } else {
            errorCount++;
            await db.execute(
              "UPDATE sync_queue SET estado = 'error', intentos = intentos + 1, ultimo_error = ? WHERE id = ?",
              [error || 'Error desconocido', id]
            );
          }
        }

        this.lastSyncedAt = new Date().toLocaleTimeString();
        this.isSyncing = false;
        this.notifyListeners();

        return {
          success: true,
          pushed: pushedCount,
          errors: errorCount,
        };
      } else {
        throw new Error(response?.mensaje || 'Respuesta no exitosa del servidor de sincronización');
      }
    } catch (err: any) {
      this.serverConnected = false;
      this.lastError = err.isOffline ? 'Servidor API fuera de línea' : (err.message || 'Error de sincronización');
      
      // Revertir estado a pendiente en caso de corte de conexión para que no queden atrapados
      try {
        const db = await dbManager.getConnection();
        await db.execute("UPDATE sync_queue SET estado = 'pendiente' WHERE estado = 'sincronizando'");
      } catch {}

      this.isSyncing = false;
      this.notifyListeners();

      return {
        success: false,
        pushed: 0,
        errors: 1,
        error: this.lastError,
      };
    }
  }

  /**
   * Ejecuta una sincronización manual solicitada por el usuario
   */
  public async triggerSync(): Promise<SyncResult> {
    return await this.pushPendingQueue();
  }

  /**
   * Prueba la conectividad en vivo con la API Backend
   */
  public async checkServerConnection(): Promise<boolean> {
    try {
      const res = await testApiConnection();
      this.serverConnected = res.ok;
      this.notifyListeners();
      return res.ok;
    } catch {
      this.serverConnected = false;
      this.notifyListeners();
      return false;
    }
  }
}

export const syncService = SyncService.getInstance();
