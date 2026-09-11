// Servicio de Respaldos y Restauración para La Palmera POS v12
import { BackupRecord } from '../types/storage';
import { storageService } from './storageService';
import { dbManager, isTauriEnvironment } from '../database/db';

const DESKTOP_BACKUP_KEY = 'lapalmera_desktop_backup_dir';
const DEFAULT_DESKTOP_DIR = 'C:\\Users\\statu\\Desktop\\Respaldos_LaPalmera';

export class BackupService {
  private static instance: BackupService;

  private constructor() {}

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  public getDesktopBackupDirectory(): string {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem(DESKTOP_BACKUP_KEY);
      if (custom) return custom;
    }
    return DEFAULT_DESKTOP_DIR;
  }

  public setDesktopBackupDirectory(path: string): void {
    if (typeof window !== 'undefined' && path) {
      localStorage.setItem(DESKTOP_BACKUP_KEY, path);
    }
  }

  /**
   * Genera un respaldo completo de la base de datos de ventas de La Palmera POS v12
   * y lo guarda en la carpeta del Escritorio para que Karla / el usuario pueda subirlo a su nube.
   */
  public async createBackup(tipo: 'manual' | 'automatico' | 'previo_actualizacion' = 'manual', descripcion?: string): Promise<BackupRecord> {
    const config = storageService.getConfig();
    const now = new Date();
    
    // Formato con fecha y hora del día: YYYY-MM-DD_HH-mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const dateFormatted = `${year}-${month}-${day}_${hours}-${minutes}`;
    
    const fileName = `Respaldo_Ventas_LaPalmera_${dateFormatted}.db`;
    const sep = '\\';
    
    const localDestinationPath = `${config.backupsDir}${sep}${fileName}`;
    const desktopDir = this.getDesktopBackupDirectory();
    const desktopDestinationPath = `${desktopDir}${sep}${fileName}`;

    let fileSizeBytes = 176128;
    let desktopCopied = false;

    // Normalizar rutas con barras diagonales estándar para SQLite VACUUM
    const cleanLocalPath = localDestinationPath.replace(/\\/g, '/');
    const cleanDesktopPath = desktopDestinationPath.replace(/\\/g, '/');

    try {
      const db = await dbManager.getConnection();

      // 1. Respaldo local en C:\LaPalmera\backups\
      try {
        await db.execute(`VACUUM INTO '${cleanLocalPath}'`);
      } catch (e) {
        if (isTauriEnvironment()) {
          try {
            const { mkdir } = await import('@tauri-apps/plugin-fs');
            await mkdir(config.backupsDir, { recursive: true });
            await db.execute(`VACUUM INTO '${cleanLocalPath}'`);
          } catch (mkdirErr) {
            console.warn('[Backup] Error reintentando VACUUM local:', mkdirErr);
          }
        }
      }

      // 2. Respaldo directo en la Carpeta del Escritorio (para Nube y Seguridad)
      try {
        if (isTauriEnvironment()) {
          const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
          await mkdir(desktopDir, { recursive: true }).catch(() => {});
          
          const infoText = `================================================================================
LA PALMERA POS v22 — GUÍA DE RESPALDOS PARA SUBIR A LA NUBE
================================================================================

Hola:

Esta carpeta en tu Escritorio contiene los archivos de respaldo (.db) generados
por el sistema La Palmera POS. Cada archivo contiene toda la información de
ventas, inventario, productos, clientes y caja.

--------------------------------------------------------------------------------
PASOS PARA SUBIR TU RESPALDO A TU NUBE PERSONAL (OneDrive / Google Drive):
--------------------------------------------------------------------------------
1. Abre tu navegador de internet e ingresa a tu cuenta personal:
   - Microsoft OneDrive: https://onedrive.live.com
   - O Google Drive: https://drive.google.com

2. En tu nube personal, crea una carpeta llamada: "Respaldos_LaPalmera".

3. Arrastra los archivos (.db) de esta carpeta a tu nube, o haz clic en "Cargar archivos".

4. ¡Listo! Tus datos quedarán respaldados de forma 100% segura en la nube.

Desarrollado por MixelTNT
Fecha de última actualización: ${now.toLocaleString()}
================================================================================`;
          
          await writeTextFile(`${desktopDir}\\COMO_SUBIR_A_LA_NUBE.txt`, infoText).catch(() => {});
        }
        await db.execute(`VACUUM INTO '${cleanDesktopPath}'`);
        desktopCopied = true;
      } catch (deskErr) {
        console.warn('[Backup] Aviso guardando en carpeta de Escritorio:', deskErr);
      }

      // 3. Obtener tamaño real del archivo generado
      if (isTauriEnvironment()) {
        try {
          const { stat } = await import('@tauri-apps/plugin-fs');
          const fileInfo = await stat(desktopCopied ? desktopDestinationPath : localDestinationPath);
          fileSizeBytes = fileInfo.size;
        } catch {}
      }
    } catch (err) {
      console.error('[Backup] Error generando respaldo SQLite:', err);
      throw new Error(`No se pudo generar el archivo de respaldo: ${err}`);
    }

    const backupRecord: BackupRecord = {
      id: Date.now(),
      fileName,
      filePath: desktopCopied ? desktopDestinationPath : localDestinationPath,
      fileSizeBytes,
      tipo,
      descripcion: descripcion || `Respaldo de ventas del día ${day}/${month}/${year} ${hours}:${minutes} (Guardado en Escritorio para Nube)`,
      creadoEn: now.toISOString(),
    };

    // Guardar registro en la base de datos
    try {
      const db = await dbManager.getConnection();
      await db.execute(
        `INSERT INTO respaldos (file_name, file_path, file_size_bytes, tipo, descripcion, creado_en)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          backupRecord.fileName,
          backupRecord.filePath,
          backupRecord.fileSizeBytes,
          backupRecord.tipo,
          backupRecord.descripcion,
          backupRecord.creadoEn,
        ]
      );
    } catch (e) {
      console.warn('[Backup] No se pudo registrar en tabla respaldos:', e);
    }

    return backupRecord;
  }

  public async listBackups(): Promise<BackupRecord[]> {
    try {
      const db = await dbManager.getConnection();
      const rows = await db.select<any>('SELECT * FROM respaldos ORDER BY id DESC');
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: r.id,
          fileName: r.file_name,
          filePath: r.file_path,
          fileSizeBytes: r.file_size_bytes,
          tipo: r.tipo,
          descripcion: r.descripcion,
          creadoEn: r.creado_en,
          checksum: r.checksum,
        }));
      }
    } catch (e) {
      console.warn('[Backup] Error listando respaldos desde base de datos:', e);
    }
    return [];
  }

  public async restoreBackup(backupFilePath: string): Promise<boolean> {
    const config = storageService.getConfig();
    if (!backupFilePath) {
      throw new Error('Ruta de respaldo no válida');
    }

    // Primero creamos un respaldo de seguridad previo a restaurar
    await this.createBackup('previo_actualizacion', 'Copia de seguridad antes de restauración');

    if (isTauriEnvironment()) {
      try {
        const { copyFile, exists } = await import('@tauri-apps/plugin-fs');
        const backupExists = await exists(backupFilePath);
        if (!backupExists) {
          throw new Error('El archivo de respaldo seleccionado no existe.');
        }

        // Cerrar conexión actual si está abierta
        const db = await dbManager.getConnection();
        await db.close();

        // Sobrescribir archivo de base de datos
        await copyFile(backupFilePath, config.databasePath);

        // Reinicializar base de datos
        await dbManager.initialize(config.databasePath);
        return true;
      } catch (err) {
        console.error('[Backup] Error restaurando respaldo:', err);
        throw new Error(`Error en restauración: ${err}`);
      }
    } else {
      return true;
    }
  }
}

export const backupService = BackupService.getInstance();
