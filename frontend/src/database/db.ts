// Gestor y Adaptador de Base de Datos SQLite para La Palmera POS

export interface QueryResult {
  rowsAffected: number;
  lastInsertId: number;
}

export interface IDatabaseConnection {
  execute(query: string, bindValues?: any[]): Promise<QueryResult>;
  select<T = any>(query: string, bindValues?: any[]): Promise<T[]>;
  close(): Promise<boolean>;
}

// Comprobación si la aplicación está corriendo dentro de Tauri
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

class BrowserFallbackDB implements IDatabaseConnection {
  private memoryStore: Map<string, any[]> = new Map();
  private initialized = false;

  constructor() {
    this.initFromLocalStorage();
  }

  private initFromLocalStorage() {
    try {
      const saved = localStorage.getItem('lapalmera_mock_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(k => {
          let list = parsed[k];
          if (k === 'categorias' && Array.isArray(list)) {
            const OFFICIAL_16 = [
              { nombre: 'Bebidas y Refrescos', descripcion: 'Gaseosas, jugos, aguas minerales y energéticas', color: '#2563eb', icono: 'bi-cup-straw' },
              { nombre: 'Abarrotes y Despensa', descripcion: 'Arroz, fideos, aceites, harinas, salsas y legumbres', color: '#16a34a', icono: 'bi-basket' },
              { nombre: 'Panadería y Pastelería', descripcion: 'Pan fresco diario, hallullas, marraquetas, empanadas y pasteles', color: '#d97706', icono: 'bi-cake2' },
              { nombre: 'Lácteos y Huevos', descripcion: 'Leches, yogures, mantequillas, cremas y huevos de campo', color: '#0891b2', icono: 'bi-egg' },
              { nombre: 'Cecinas y Fiambrería', descripcion: 'Jamones, salamis, vienesas, arrollados y quesos laminados', color: '#dc2626', icono: 'bi-pie-chart' },
              { nombre: 'Snacks y Galletas', descripcion: 'Papas fritas, galletas dulces y saladas, ramitas y frutos secos', color: '#ea580c', icono: 'bi-cookie' },
              { nombre: 'Golosinas y Chocolates', descripcion: 'Chocolates, gomitas, caramelos, chicles y confites', color: '#db2777', icono: 'bi-gift' },
              { nombre: 'Limpieza y Aseo del Hogar', descripcion: 'Detergentes, cloro, lavalozas, desinfectantes y bolsas de basura', color: '#059669', icono: 'bi-droplet' },
              { nombre: 'Higiene y Cuidado Personal', descripcion: 'Jabones, champú, pastas dentales, desodorantes y papel higiénico', color: '#7c3aed', icono: 'bi-person-heart' },
              { nombre: 'Congelados y Helados', descripcion: 'Helados, hamburguesas, nuggets, papas prefritas y verduras', color: '#0284c7', icono: 'bi-snow' },
              { nombre: 'Frutas y Verduras', descripcion: 'Frutas y verduras frescas seleccionadas de temporada', color: '#65a30d', icono: 'bi-apple' },
              { nombre: 'Carnes y Aves', descripcion: 'Vacuno, pollo, cerdo, carnes para asado y carbón', color: '#b91c1c', icono: 'bi-fire' },
              { nombre: 'Cervezas, Vinos y Licores', descripcion: 'Cervezas nacionales e importadas, vinos, piscos y destilados', color: '#9333ea', icono: 'bi-cup-hot' },
              { nombre: 'Cigarrillos y Tabacos', descripcion: 'Cigarrillos, tabaco para armar, papelillos y encendedores', color: '#4b5563', icono: 'bi-lightning' },
              { nombre: 'Mascotas', descripcion: 'Alimentos secos y húmedos para perros y gatos, premios y arena', color: '#f97316', icono: 'bi-heart' },
              { nombre: 'Desayuno y Café', descripcion: 'Café en grano e instantáneo, té, yerba mate, azúcar y cereales', color: '#78350f', icono: 'bi-cup' },
            ];

            const seenNames = new Set<string>();
            const valid: any[] = [];
            for (const c of list) {
              if (c && typeof c.nombre === 'string' && c.nombre.trim() !== '') {
                const norm = c.nombre.trim().toLowerCase();
                if (!seenNames.has(norm)) {
                  seenNames.add(norm);
                  valid.push({ ...c, id: valid.length + 1, activo: true });
                }
              }
            }

            for (const off of OFFICIAL_16) {
              const norm = off.nombre.trim().toLowerCase();
              if (!seenNames.has(norm)) {
                seenNames.add(norm);
                valid.push({ ...off, id: valid.length + 1, activo: true });
              }
            }

            list = valid;
          }
          if (k === 'sync_queue' && Array.isArray(list)) {
            list = list.map((q: any) => ({
              ...q,
              estado: q.estado || 'pendiente',
              intentos: Number(q.intentos) || 0,
              creado_en: q.creado_en || new Date().toISOString(),
            }));
          }
          if (k === 'productos' && Array.isArray(list)) {
            list = list.map((p: any) => ({
              ...p,
              activo: p.activo !== undefined && p.activo !== null ? (p.activo === 1 || p.activo === true || p.activo === '1') : true,
              stock_actual: Number(p.stock_actual ?? p.stockActual ?? 0),
            }));
          }
          this.memoryStore.set(k, list);
        });

        // Asegurar que ventas offline en localStorage tengan su entrada en sync_queue si quedaron pendientes
        const ventasList = this.memoryStore.get('ventas') || [];
        const queueList = this.memoryStore.get('sync_queue') || [];
        for (const v of ventasList) {
          if (v && v.id) {
            const alreadyInQueue = queueList.some((q: any) => q.tabla === 'ventas' && (Number(q.registro_id) === Number(v.id) || (q.payload_json && JSON.parse(q.payload_json)?.folio === v.folio)));
            if (!alreadyInQueue) {
              const qId = queueList.length > 0 ? Math.max(...queueList.map((q: any) => Number(q.id) || 0)) + 1 : 1;
              queueList.push({
                id: qId,
                tabla: 'ventas',
                registro_id: v.id,
                operacion: 'INSERT',
                payload_json: JSON.stringify(v),
                estado: 'pendiente',
                intentos: 0,
                creado_en: v.fecha || new Date().toISOString(),
              });
            }
          }
        }
        this.memoryStore.set('sync_queue', queueList);
        this.saveToLocalStorage();
      }
    } catch (e) {
      console.warn('No se pudo cargar la base local fallback:', e);
    }
  }

  private saveToLocalStorage() {
    try {
      const obj: Record<string, any[]> = {};
      this.memoryStore.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem('lapalmera_mock_db', JSON.stringify(obj));
    } catch (e) {
      console.warn('Error guardando en localStorage fallback:', e);
    }
  }

  async execute(query: string, bindValues: any[] = []): Promise<QueryResult> {
    const trimmed = query.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith('CREATE TABLE') || upper.startsWith('CREATE INDEX') || upper.startsWith('PRAGMA')) {
      return { rowsAffected: 0, lastInsertId: 0 };
    }

    if (upper.startsWith('INSERT INTO') || upper.startsWith('INSERT OR IGNORE INTO')) {
      const match = query.match(/INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+([a-zA-Z0-9_]+)(?:\s*\(([^)]+)\))?/i);
      const tableName = match ? match[1].toLowerCase() : 'unknown';
      const list = this.memoryStore.get(tableName) || [];
      const newId = list.length > 0 ? Math.max(...list.map((r: any) => Number(r.id) || 0)) + 1 : 1;

      const record: any = { id: newId };

      if (match && match[2]) {
        const columns = match[2].split(',').map(c => c.trim().toLowerCase());
        columns.forEach((col, idx) => {
          if (idx < bindValues.length && bindValues[idx] !== undefined) {
            record[col] = bindValues[idx];
          }
        });
      }

      if (record.id === undefined || record.id === null) {
        record.id = newId;
      }

      // Upsert para categorias si hay ON CONFLICT(nombre) o INSERT OR IGNORE
      if (tableName === 'categorias' && record.nombre) {
        const normName = String(record.nombre).toLowerCase().trim();
        const existingIndex = list.findIndex((c: any) => String(c.nombre || '').toLowerCase().trim() === normName);
        if (existingIndex >= 0) {
          list[existingIndex] = { ...list[existingIndex], ...record, id: list[existingIndex].id };
          this.memoryStore.set(tableName, list);
          this.saveToLocalStorage();
          return { rowsAffected: 1, lastInsertId: Number(list[existingIndex].id) || newId };
        }
      }

      // Upsert para productos si ya existe el código
      if (tableName === 'productos' && record.codigo) {
        const existingIndex = list.findIndex((p: any) => String(p.codigo) === String(record.codigo));
        if (existingIndex >= 0) {
          list[existingIndex] = { ...list[existingIndex], ...record, id: list[existingIndex].id };
          this.memoryStore.set(tableName, list);
          this.saveToLocalStorage();
          return { rowsAffected: 1, lastInsertId: Number(list[existingIndex].id) || newId };
        }
      }

      // Upsert para clientes si ya existe el rut
      if (tableName === 'clientes' && record.rut) {
        const existingIndex = list.findIndex((cl: any) => cl.rut && String(cl.rut).toLowerCase().trim() === String(record.rut).toLowerCase().trim());
        if (existingIndex >= 0) {
          list[existingIndex] = { ...list[existingIndex], ...record, id: list[existingIndex].id };
          this.memoryStore.set(tableName, list);
          this.saveToLocalStorage();
          return { rowsAffected: 1, lastInsertId: Number(list[existingIndex].id) || newId };
        }
      }

      if (tableName === 'sync_queue') {
        if (!record.estado) record.estado = 'pendiente';
        if (record.intentos === undefined) record.intentos = 0;
        if (!record.creado_en) record.creado_en = new Date().toISOString();
      }

      list.push(record);
      this.memoryStore.set(tableName, list);
      this.saveToLocalStorage();
      return { rowsAffected: 1, lastInsertId: Number(record.id) || newId };
    }

    if (upper.startsWith('UPDATE')) {
      const updateMatch = query.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
      const tableName = updateMatch ? updateMatch[1].toLowerCase() : null;
      if (tableName && this.memoryStore.has(tableName)) {
        const list = this.memoryStore.get(tableName) || [];
        
        // Manejar UPDATE sync_queue SET estado = 'completado' WHERE id = ?
        if (tableName === 'sync_queue' && upper.includes("ESTADO = 'COMPLETADO'")) {
          const idVal = Number(bindValues[0]);
          const item = list.find((q: any) => Number(q.id) === idVal);
          if (item) {
            item.estado = 'completado';
            item.sincronizado_en = new Date().toISOString();
            this.saveToLocalStorage();
            return { rowsAffected: 1, lastInsertId: 0 };
          }
        }

        // Manejar UPDATE sync_queue SET intentos = intentos + 1, ultimo_error = ? WHERE id = ?
        if (tableName === 'sync_queue' && upper.includes('INTENTOS = INTENTOS + 1')) {
          const err = bindValues[0];
          const idVal = Number(bindValues[1]);
          const item = list.find((q: any) => Number(q.id) === idVal);
          if (item) {
            item.intentos = (Number(item.intentos) || 0) + 1;
            item.ultimo_error = err;
            this.saveToLocalStorage();
            return { rowsAffected: 1, lastInsertId: 0 };
          }
        }

        // Manejar UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?
        if (query.includes('stock_actual = stock_actual - ?')) {
          const qty = Number(bindValues[0]) || 0;
          const prodId = Number(bindValues[1]);
          const prod = list.find((p: any) => Number(p.id) === prodId);
          if (prod) {
            prod.stock_actual = Math.max(0, (Number(prod.stock_actual) || 0) - qty);
            this.saveToLocalStorage();
            return { rowsAffected: 1, lastInsertId: 0 };
          }
        }

        // Manejar UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?
        if (query.includes('stock_actual = stock_actual + ?')) {
          const qty = Number(bindValues[0]) || 0;
          const prodId = Number(bindValues[1]);
          const prod = list.find((p: any) => Number(p.id) === prodId);
          if (prod) {
            prod.stock_actual = (Number(prod.stock_actual) || 0) + qty;
            this.saveToLocalStorage();
            return { rowsAffected: 1, lastInsertId: 0 };
          }
        }

        // Manejar UPDATE caja_sesiones SET field = field + ? WHERE id = ?
        const fieldAddMatch = query.match(/SET\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\s*\+\s*\?\s+WHERE\s+id\s*=\s*\?/i);
        if (fieldAddMatch) {
          const field = fieldAddMatch[1].toLowerCase();
          const amount = Number(bindValues[0]) || 0;
          const sessId = Number(bindValues[1]);
          const sess = list.find((s: any) => Number(s.id) === sessId);
          if (sess) {
            sess[field] = (Number(sess[field]) || 0) + amount;
            this.saveToLocalStorage();
            return { rowsAffected: 1, lastInsertId: 0 };
          }
        }

        // Manejar UPDATE genérico por ID: UPDATE table SET col1 = ..., col2 = ... WHERE id = ?
        const idVal = Number(bindValues[bindValues.length - 1]);
        const item = list.find((r: any) => Number(r.id) === idVal);
        if (item) {
          // Extraer nombres de columnas asignadas
          const setClauseMatch = query.match(/SET\s+([\s\S]+?)\s+WHERE\s+id\s*=\s*\?/i);
          if (setClauseMatch) {
            const assignments = setClauseMatch[1].split(',').map(s => s.trim());
            let vIdx = 0;
            for (const assign of assignments) {
              const colMatch = assign.match(/^([a-zA-Z0-9_]+)\s*=/);
              if (colMatch) {
                const col = colMatch[1].toLowerCase();
                if (assign.includes('?')) {
                  const val = bindValues[vIdx];
                  vIdx++;
                  if (val !== undefined) {
                    item[col] = val;
                  }
                }
              }
            }
            this.saveToLocalStorage();
            return { rowsAffected: 1, lastInsertId: 0 };
          }
        }
      }
      return { rowsAffected: 1, lastInsertId: 0 };
    }

    if (upper.startsWith('DELETE FROM')) {
      const match = query.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i);
      const tableName = match ? match[1].toLowerCase() : null;
      if (tableName && this.memoryStore.has(tableName)) {
        if (bindValues.length > 0 && bindValues[0] !== undefined) {
          const idToDelete = Number(bindValues[0]);
          const list = (this.memoryStore.get(tableName) || []).filter((r: any) => Number(r.id) !== idToDelete);
          this.memoryStore.set(tableName, list);
        } else {
          // Si no hay bindValues (ej: DELETE FROM ventas), vaciar la tabla completa
          this.memoryStore.set(tableName, []);
        }
        this.saveToLocalStorage();
      }
      return { rowsAffected: 1, lastInsertId: 0 };
    }

    return { rowsAffected: 1, lastInsertId: 1 };
  }

  public clearAll(): void {
    this.memoryStore.clear();
    this.initializeTables();
    this.saveToLocalStorage();
  }

  async select<T = any>(query: string, bindValues: any[] = []): Promise<T[]> {
    const upper = query.toUpperCase();
    const match = query.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    const tableName = match ? match[1].toLowerCase() : null;

    if (!tableName || !this.memoryStore.has(tableName)) {
      return [] as T[];
    }

    let list = [...(this.memoryStore.get(tableName) || [])];

    // Helper para extraer fecha YYYY-MM-DD uniforme de cualquier registro
    const extractDateIso = (r: any): string => {
      const raw = r.fecha || r.creado_en || r.fecha_apertura || r.fecha_compra || '';
      if (!raw) return '';
      if (typeof raw === 'string') {
        if (raw.endsWith('Z')) {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          }
        }
        return raw.slice(0, 10);
      }
      return '';
    };

    // 1. Simulación de JOINs para enriquecer campos relacionados
    if (tableName === 'productos') {
      const cats = this.memoryStore.get('categorias') || [];
      const provs = this.memoryStore.get('proveedores') || [];
      list = list.map((p: any) => {
        const cat = cats.find((c: any) => Number(c.id) === Number(p.categoria_id));
        const prov = provs.find((pr: any) => Number(pr.id) === Number(p.proveedor_id));
        return {
          ...p,
          categoria_nombre: cat ? cat.nombre : p.categoria_nombre || null,
          proveedor_nombre: prov ? prov.nombre : p.proveedor_nombre || null,
        };
      });
    } else if (tableName === 'venta_items') {
      const ventas = this.memoryStore.get('ventas') || [];
      list = list.map((item: any) => {
        const v = ventas.find((sale: any) => Number(sale.id) === Number(item.venta_id));
        return {
          ...item,
          venta_estado: v ? v.estado : 'completada',
          venta_fecha: v ? v.fecha : null,
          venta_metodo: v ? v.metodo_pago_principal : 'efectivo',
        };
      });
    } else if (tableName === 'cliente_movimientos') {
      const ventas = this.memoryStore.get('ventas') || [];
      list = list.map((m: any) => {
        const v = ventas.find((sale: any) => Number(sale.id) === Number(m.venta_id));
        return {
          ...m,
          venta_folio: v ? (v.folio || v.id) : null,
          numero_boleta: v ? v.numero_boleta : null,
        };
      });
    } else if (tableName === 'inventario_movimientos') {
      const users = this.memoryStore.get('usuarios') || [];
      list = list.map((m: any) => {
        const u = users.find((user: any) => Number(user.id) === Number(m.usuario_id));
        return {
          ...m,
          usuario_nombre_db: u ? u.nombre : 'Sistema',
        };
      });
    }

    // 2. Manejo de cláusulas WHERE dinámicas y genéricas
    if (upper.includes('WHERE')) {
      let bIdx = 0;

      // a. Filtros por Código o Código de Barras (exacto o con TRIM)
      if (upper.includes('CODIGO') && !upper.includes('LIKE')) {
        if (upper.includes('OR') && (upper.includes('CODIGO_BARRAS') || upper.includes('CODIGO'))) {
          const targetCode = String(bindValues[bIdx] || '').trim().toLowerCase();
          bIdx = bindValues.length;
          if (targetCode) {
            list = list.filter((r: any) =>
              String(r.codigo || '').trim().toLowerCase() === targetCode ||
              String(r.codigo_barras || '').trim().toLowerCase() === targetCode
            );
          }
        } else if (upper.includes('TRIM(CODIGO) = ?') || upper.includes('TRIM(P.CODIGO) = ?') || upper.includes('CODIGO = ?')) {
          const targetCode = String(bindValues[bIdx] || '').trim().toLowerCase();
          bIdx++;
          list = list.filter((r: any) => String(r.codigo || '').trim().toLowerCase() === targetCode);
        } else if (upper.includes('TRIM(CODIGO_BARRAS) = ?') || upper.includes('CODIGO_BARRAS = ?')) {
          const targetBar = String(bindValues[bIdx] || '').trim().toLowerCase();
          bIdx++;
          list = list.filter((r: any) => String(r.codigo_barras || '').trim().toLowerCase() === targetBar);
        }
      }

      // b. Filtro por clave en configuración
      if (tableName === 'configuracion' && upper.includes('CLAVE = ?') && bindValues.length > 0) {
        const targetClave = String(bindValues[0]);
        list = list.filter((r: any) => String(r.clave) === targetClave);
      }

      // c. Filtro por ID único
      if ((upper.includes('WHERE ID = ?') || upper.includes('WHERE P.ID = ?') || upper.includes('WHERE C.ID = ?') || upper.includes('WHERE M.ID = ?') || upper.includes('WHERE V.ID = ?')) && bindValues.length > 0) {
        const targetId = Number(bindValues[0]);
        list = list.filter((r: any) => Number(r.id) === targetId);
      }

      // d. Filtro por Foreign Keys
      if (upper.includes('CLIENTE_ID = ?') && bindValues.length > 0) {
        const cId = Number(bindValues[0]);
        list = list.filter((r: any) => Number(r.cliente_id) === cId);
      }
      if (upper.includes('COMPRA_ID = ?') && bindValues.length > 0) {
        const compId = Number(bindValues[0]);
        list = list.filter((r: any) => Number(r.compra_id) === compId);
      }
      if (upper.includes('VENTA_ID = ?') && bindValues.length > 0) {
        const vId = Number(bindValues[0]);
        list = list.filter((r: any) => Number(r.venta_id) === vId);
      }
      if (upper.includes('CAJA_SESION_ID = ?') && bindValues.length > 0) {
        const sId = Number(bindValues[0]);
        list = list.filter((r: any) => Number(r.caja_sesion_id) === sId);
      }
      if (upper.includes('CATEGORIA_ID = ?') && bindValues.length > 0) {
        const catId = Number(bindValues[0]);
        list = list.filter((r: any) => Number(r.categoria_id) === catId);
      }
      if (upper.includes('PROVEEDOR_ID = ?') && bindValues.length > 0) {
        const provId = Number(bindValues[0]);
        list = list.filter((r: any) => Number(r.proveedor_id) === provId);
      }

      // e. Filtro por estado
      if (upper.includes("IN ('COMPLETADA', 'CONFIRMADA')") || upper.includes('IN ("COMPLETADA", "CONFIRMADA")')) {
        list = list.filter((r: any) => {
          const st = String(r.estado || r.venta_estado || '').toLowerCase();
          return st === 'completada' || st === 'confirmada';
        });
      } else if (upper.includes("ESTADO = 'ANULADA'") || upper.includes('LOWER(ESTADO) = \'ANULADA\'') || upper.includes('LOWER(ESTADO) = "ANULADA"')) {
        list = list.filter((r: any) => String(r.estado || '').toLowerCase() === 'anulada');
      } else if (upper.includes("ESTADO != 'ANULADA'") || upper.includes('ESTADO != "ANULADA"')) {
        list = list.filter((r: any) => String(r.estado || '').toLowerCase() !== 'anulada');
      } else if (upper.includes("ESTADO = 'PENDIENTE'") || upper.includes('ESTADO = "PENDIENTE"')) {
        list = list.filter((r: any) => String(r.estado).toLowerCase() === 'pendiente');
      } else if (upper.includes("ESTADO = 'ABIERTA'") || upper.includes('ESTADO = "ABIERTA"')) {
        list = list.filter((r: any) => String(r.estado).toLowerCase() === 'abierta');
      } else if (upper.includes("ESTADO = 'COMPLETADA'") || upper.includes('ESTADO = "COMPLETADA"')) {
        list = list.filter((r: any) => String(r.estado).toLowerCase() === 'completada');
      } else if (upper.includes('ESTADO = ?') && bindValues.length > 0) {
        const st = String(bindValues[bindValues.length - 1]).toLowerCase();
        list = list.filter((r: any) => String(r.estado || '').toLowerCase() === st);
      }

      // e2. Filtro por Método de Pago
      if (upper.includes('METODO_PAGO_PRINCIPAL') && bindValues.length > 0) {
        const metVal = bindValues.find(v => typeof v === 'string' && ['efectivo', 'debito', 'credito', 'transferencia', 'fiado'].includes(v.toLowerCase()));
        if (metVal) {
          list = list.filter((r: any) => String(r.metodo_pago_principal || r.venta_metodo || '').toLowerCase() === metVal.toLowerCase());
        }
      }

      // f. Filtro por activo
      if (upper.includes('ACTIVO = 1') || upper.includes('P.ACTIVO = 1')) {
        list = list.filter((r: any) => r.activo === 1 || r.activo === true || r.activo === '1');
      } else if (upper.includes('ACTIVO = 0') || upper.includes('P.ACTIVO = 0')) {
        list = list.filter((r: any) => r.activo === 0 || r.activo === false || r.activo === '0');
      } else if ((upper.includes('ACTIVO = ?') || upper.includes('P.ACTIVO = ?')) && bindValues.length > 0) {
        const actVal = bindValues.find(v => typeof v === 'number' && (v === 0 || v === 1));
        if (actVal !== undefined) {
          list = list.filter((r: any) => (actVal === 1 ? (r.activo === 1 || r.activo === true || r.activo === '1') : (r.activo === 0 || r.activo === false || r.activo === '0')));
        }
      }

      // g. Filtros de Fechas
      if (upper.includes('DATE(') || upper.includes('FECHA')) {
        const dateValues = bindValues.filter(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));
        if (dateValues.length > 0) {
          const dFrom = dateValues[0];
          const dTo = dateValues[dateValues.length - 1];

          if (upper.includes('>=') && dFrom) {
            list = list.filter((r: any) => {
              const f = extractDateIso(r) || (r.venta_fecha ? extractDateIso({ fecha: r.venta_fecha }) : '');
              return f ? f >= dFrom : true;
            });
          }
          if (upper.includes('<=') && dTo) {
            list = list.filter((r: any) => {
              const f = extractDateIso(r) || (r.venta_fecha ? extractDateIso({ fecha: r.venta_fecha }) : '');
              return f ? f <= dTo : true;
            });
          }
        }

        // Filtro relativo de días: date('now', '-' || ? || ' days', 'localtime')
        if (upper.includes("' DAYS'") || upper.includes("DAYS', 'LOCALTIME'")) {
          const numDays = bindValues.find(v => typeof v === 'number');
          if (numDays !== undefined) {
            const threshold = new Date(Date.now() - numDays * 86400000);
            const pad = (n: number) => String(n).padStart(2, '0');
            const threshIso = `${threshold.getFullYear()}-${pad(threshold.getMonth() + 1)}-${pad(threshold.getDate())}`;
            list = list.filter((r: any) => extractDateIso(r) >= threshIso);
          }
        }
      }

      // h. Filtros de Búsqueda LIKE
      if (upper.includes('LIKE')) {
        const term = bindValues.find(v => typeof v === 'string' && v.includes('%'));
        if (term) {
          const clean = String(term).replace(/%/g, '').toLowerCase().trim();
          if (clean) {
            list = list.filter((r: any) =>
              String(r.nombre || '').toLowerCase().includes(clean) ||
              String(r.codigo || '').toLowerCase().includes(clean) ||
              String(r.codigo_barras || '').toLowerCase().includes(clean) ||
              String(r.rut || '').toLowerCase().includes(clean) ||
              String(r.telefono || '').toLowerCase().includes(clean) ||
              String(r.contacto || '').toLowerCase().includes(clean) ||
              String(r.folio || '').toLowerCase().includes(clean) ||
              String(r.numero_boleta || '').toLowerCase().includes(clean)
            );
          }
        }
      }
    }

    // 3. Manejar Agregaciones y Métricas

    // 3.1 Métricas avanzadas de Ventas (Dashboard y Reportes)
    if (tableName === 'ventas' && (upper.includes('SUM(V.TOTAL)') || upper.includes('MONTO_TOTAL') || upper.includes('TOTAL_VENTAS') || upper.includes('TOTAL_EFECTIVO'))) {
      const total_ventas = list.length;
      const monto_total = list.reduce((sum, r) => sum + Number(r.total || 0), 0);
      const total_efectivo = list.filter(r => String(r.metodo_pago_principal || '').toLowerCase() === 'efectivo').reduce((sum, r) => sum + Number(r.total || 0), 0);
      const total_debito = list.filter(r => String(r.metodo_pago_principal || '').toLowerCase() === 'debito').reduce((sum, r) => sum + Number(r.total || 0), 0);
      const total_transferencia = list.filter(r => String(r.metodo_pago_principal || '').toLowerCase() === 'transferencia').reduce((sum, r) => sum + Number(r.total || 0), 0);
      const total_fiado = list.filter(r => String(r.metodo_pago_principal || '').toLowerCase() === 'fiado').reduce((sum, r) => sum + Number(r.total || 0), 0);
      return [{
        total_ventas,
        total: total_ventas,
        count: total_ventas,
        monto_total,
        total_efectivo,
        total_debito,
        total_transferencia,
        total_fiado,
      }] as unknown as T[];
    }

    // 3.2 Costo total de venta_items
    if (tableName === 'venta_items' && upper.includes('COSTO_TOTAL')) {
      const costo_total = list.reduce((sum, vi) => sum + (Number(vi.cantidad || 0) * Number(vi.costo_unitario || 0)), 0);
      return [{ costo_total }] as unknown as T[];
    }

    // 3.3 Conteo de ventas anuladas
    if (tableName === 'ventas' && upper.includes('ANULADAS')) {
      return [{ anuladas: list.length }] as unknown as T[];
    }

    // 3.4 Resumen de compras
    if (tableName === 'compras' && (upper.includes('TOTALCOMPRADO') || upper.includes('TOTAL_COMPRADO') || upper.includes('SUM(TOTAL)'))) {
      const totalComprado = list.reduce((sum, r) => sum + Number(r.total || 0), 0);
      return [{ cantidad: list.length, totalComprado, total_comprado: totalComprado }] as unknown as T[];
    }

    // 3.5 Estadísticas de catálogo de productos
    if (tableName === 'productos' && (upper.includes('LOW_STOCK') || upper.includes('OUT_OF_STOCK') || upper.includes('TOTAL_VALUE'))) {
      const total = list.length;
      const low_stock = list.filter((p: any) => Number(p.stock_actual) <= Number(p.stock_minimo) && Number(p.stock_actual) > 0).length;
      const out_of_stock = list.filter((p: any) => Number(p.stock_actual) <= 0).length;
      const total_value = list.reduce((sum, p: any) => sum + (Number(p.stock_actual || 0) * Number(p.precio_costo || 0)), 0);
      return [{ total, low_stock, out_of_stock, total_value }] as unknown as T[];
    }

    // 3.6 Agrupaciones GROUP BY
    if (upper.includes('GROUP BY')) {
      if (upper.includes('METODO_PAGO_PRINCIPAL') || upper.includes('METODO')) {
        const groups: Record<string, { metodo: string; cantidad: number; monto: number }> = {};
        for (const r of list) {
          const met = String(r.metodo_pago_principal || 'EFECTIVO').toUpperCase();
          if (!groups[met]) groups[met] = { metodo: met, cantidad: 0, monto: 0 };
          groups[met].cantidad += 1;
          groups[met].monto += Number(r.total || 0);
        }
        return Object.values(groups) as unknown as T[];
      }

      if (upper.includes('PRODUCTO_ID') || upper.includes('TOTAL_VENDIDO')) {
        const prods: Record<string, any> = {};
        for (const it of list) {
          const k = String(it.producto_id || it.codigo || it.nombre);
          if (!prods[k]) {
            prods[k] = { producto_id: it.producto_id, codigo: it.codigo, nombre: it.nombre, total_vendido: 0, total_ingresos: 0 };
          }
          prods[k].total_vendido += Number(it.cantidad || 0);
          prods[k].total_ingresos += Number(it.subtotal || 0);
        }
        let topList = Object.values(prods).sort((a: any, b: any) => b.total_vendido - a.total_vendido);
        const limitMatch = query.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
          topList = topList.slice(0, parseInt(limitMatch[1], 10));
        }
        return topList as unknown as T[];
      }

      if (upper.includes('FECHA') || upper.includes('FECHA_DIA')) {
        const byDate: Record<string, { fecha_dia: string; total_ventas: number; monto_total: number }> = {};
        for (const r of list) {
          const f = extractDateIso(r);
          if (!byDate[f]) byDate[f] = { fecha_dia: f, total_ventas: 0, monto_total: 0 };
          byDate[f].total_ventas += 1;
          byDate[f].monto_total += Number(r.total || 0);
        }
        return Object.values(byDate).sort((a: any, b: any) => a.fecha_dia.localeCompare(b.fecha_dia)) as unknown as T[];
      }
    }

    // 3.7 Máximo folio
    if (upper.includes('MAX(FOLIO)')) {
      const maxFolio = list.reduce((max, r) => Math.max(max, Number(r.folio || r.id || 0)), 0);
      return [{ maxF: maxFolio, max_folio: maxFolio }] as unknown as T[];
    }

    // 3.8 Conteo genérico
    if (upper.includes('COUNT(')) {
      return [{ c: list.length, count: list.length, total: list.length }] as unknown as T[];
    }

    // 4. Ordenamiento: ORDER BY ... DESC / ASC
    if (upper.includes('ORDER BY')) {
      if (upper.includes('ORDER BY ID DESC') || upper.includes('ORDER BY P.ID DESC') || upper.includes('ORDER BY FOLIO DESC') || upper.includes('ORDER BY M.ID DESC') || upper.includes('ORDER BY V.ID DESC')) {
        list.sort((a, b) => (Number(b.id || b.folio) || 0) - (Number(a.id || a.folio) || 0));
      } else if (upper.includes('ORDER BY ID ASC') || upper.includes('ORDER BY P.ID ASC')) {
        list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      } else if (upper.includes('ORDER BY P.NOMBRE ASC') || upper.includes('ORDER BY NOMBRE ASC')) {
        list.sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
      } else if (upper.includes('ORDER BY FECHA DESC')) {
        list.sort((a, b) => String(b.fecha || b.creado_en || '').localeCompare(String(a.fecha || a.creado_en || '')));
      }
    }

    // 5. Paginación con LIMIT y OFFSET
    const offsetMatch = query.match(/OFFSET\s+(\d+)/i);
    const offset = offsetMatch ? parseInt(offsetMatch[1], 10) : 0;
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const lim = parseInt(limitMatch[1], 10);
      list = list.slice(offset, offset + lim);
    } else if (offset > 0) {
      list = list.slice(offset);
    }

    return list as T[];
  }

  async close(): Promise<boolean> {
    return true;
  }
}

class TauriSqliteDB implements IDatabaseConnection {
  private db: any = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    if (this.db) return;
    const Database = (await import('@tauri-apps/plugin-sql')).default;
    // Normalizar la ruta con forward slashes para compatibilidad con URI SQLite en Windows
    const normalized = this.dbPath.replace(/\\/g, '/');
    const uri = `sqlite:${normalized}`;
    console.log(`[TauriSqliteDB] Conectando a SQLite: ${uri}`);
    this.db = await Database.load(uri);
  }

  async execute(query: string, bindValues: any[] = []): Promise<QueryResult> {
    await this.init();
    const res = await this.db.execute(query, bindValues);
    return {
      rowsAffected: res.rowsAffected ?? 0,
      lastInsertId: res.lastInsertId ?? 0,
    };
  }

  async select<T = any>(query: string, bindValues: any[] = []): Promise<T[]> {
    await this.init();
    return await this.db.select(query, bindValues);
  }

  async close(): Promise<boolean> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    return true;
  }
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private connection: IDatabaseConnection | null = null;
  private currentDbPath: string = 'C:\\LaPalmera\\database\\lapalmera.db';
  private isReady: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(customPath?: string): Promise<IDatabaseConnection> {
    if (customPath) {
      this.currentDbPath = customPath;
    }

    if (isTauriEnvironment()) {
      try {
        console.log(`[SQLite] Inicializando base de datos Tauri en: ${this.currentDbPath}`);
        const tauriDb = new TauriSqliteDB(this.currentDbPath);
        await tauriDb.init();
        this.connection = tauriDb;
      } catch (err) {
        console.error(`[SQLite FATAL] Error conectando a Tauri SQLite en '${this.currentDbPath}':`, err);
        this.connection = null;
        this.isReady = false;
        // REGLA CRITICA: En Tauri NO hacer fallback silencioso a BrowserFallbackDB. Lanzar error explícito.
        throw new Error(`[SQLite Fatal] No se pudo conectar a la base de datos local en '${this.currentDbPath}': ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      console.log('[SQLite] Entorno Web/Dev detectado, usando almacén local');
      this.connection = new BrowserFallbackDB();
    }

    // Inicializar esquema
    await this.setupSchema();
    this.isReady = true;
    return this.connection;
  }

  public async getConnection(): Promise<IDatabaseConnection> {
    if (!this.connection || !this.isReady) {
      await this.initialize();
    }
    return this.connection!;
  }

  private async setupSchema(): Promise<void> {
    if (!this.connection) return;
    try {
      const { CREATE_TABLES_SQL } = await import('./schema');
      // Ejecutar declaraciones DDL de forma individual y segura
      const statements = CREATE_TABLES_SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const sql of statements) {
        const cleanSql = sql
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
        if (cleanSql) {
          await this.connection.execute(cleanSql).catch(err => {
            console.warn('[SQLite] Aviso en sentencia DDL (puede existir previamente):', err);
          });
        }
      }

      // Migración segura no destructiva: asegurar columna operation_id en sync_queue
      try {
        await this.connection.execute('ALTER TABLE sync_queue ADD COLUMN operation_id TEXT;');
      } catch {}

      // Ejecutar seeds iniciales si la tabla usuarios está vacía
      await this.runSeeds();
      console.log('[SQLite] Esquema de base de datos verificado y listo.');
    } catch (err) {
      console.error('[SQLite] Error configurando esquema:', err);
    }
  }

  private async runSeeds(): Promise<void> {
    if (!this.connection) return;
    try {
      // Verificar si hay configuración inicial
      const configs = await this.connection.select<{ clave: string }>(
        "SELECT clave FROM configuracion WHERE clave = 'nombre_negocio'"
      );

      if (configs.length === 0) {
        await this.connection.execute(
          "INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)",
          ['nombre_negocio', 'La Palmera POS', 'Nombre oficial del comercio']
        );
        await this.connection.execute(
          "INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)",
          ['moneda_simbolo', '$', 'Símbolo de moneda local']
        );
        await this.connection.execute(
          "INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)",
          ['tipo_boleta', 'termica_80mm', 'Formato de impresión por defecto']
        );
        await this.connection.execute(
          "INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)",
          ['base_datos_version', '1.0.0', 'Versión de migración del esquema']
        );
      }

      // Categorías iniciales por defecto si no existen
      const catCount = await this.connection.select<{ c: number }>("SELECT count(*) as c FROM categorias");
      if (!catCount || catCount[0]?.c === 0) {
        const defaultCats = [
          ['Bebidas y Refrescos', 'Gaseosas, jugos, aguas minerales y energéticas', '#2563eb', 'bi-cup-straw'],
          ['Abarrotes y Despensa', 'Arroz, fideos, aceites, harinas, salsas y legumbres', '#16a34a', 'bi-basket'],
          ['Panadería y Pastelería', 'Pan fresco diario, hallullas, marraquetas, empanadas y pasteles', '#d97706', 'bi-cake2'],
          ['Lácteos y Huevos', 'Leches, yogures, mantequillas, cremas y huevos de campo', '#0891b2', 'bi-egg'],
          ['Cecinas y Fiambrería', 'Jamones, salamis, vienesas, arrollados y quesos laminados', '#dc2626', 'bi-pie-chart'],
          ['Snacks y Galletas', 'Papas fritas, galletas dulces y saladas, ramitas y frutos secos', '#ea580c', 'bi-cookie'],
          ['Golosinas y Chocolates', 'Chocolates, gomitas, caramelos, chicles y confites', '#db2777', 'bi-gift'],
          ['Limpieza y Aseo del Hogar', 'Detergentes, cloro, lavalozas, desinfectantes y bolsas de basura', '#059669', 'bi-droplet'],
          ['Higiene y Cuidado Personal', 'Jabones, champú, pastas dentales, desodorantes y papel higiénico', '#7c3aed', 'bi-person-heart'],
          ['Congelados y Helados', 'Helados, hamburguesas, nuggets, papas prefritas y verduras', '#0284c7', 'bi-snow'],
          ['Frutas y Verduras', 'Frutas y verduras frescas seleccionadas de temporada', '#65a30d', 'bi-apple'],
          ['Carnes y Aves', 'Vacuno, pollo, cerdo, carnes para asado y carbón', '#b91c1c', 'bi-fire'],
          ['Cervezas, Vinos y Licores', 'Cervezas nacionales e importadas, vinos, piscos y destilados', '#9333ea', 'bi-cup-hot'],
          ['Cigarrillos y Tabacos', 'Cigarrillos, tabaco para armar, papelillos y encendedores', '#4b5563', 'bi-lightning'],
          ['Mascotas', 'Alimentos secos y húmedos para perros y gatos, premios y arena', '#f97316', 'bi-heart'],
          ['Desayuno y Café', 'Café en grano e instantáneo, té, yerba mate, azúcar y cereales', '#78350f', 'bi-cup']
        ];

        for (const cat of defaultCats) {
          await this.connection.execute(
            "INSERT OR IGNORE INTO categorias (nombre, descripcion, color, icono, activo) VALUES (?, ?, ?, ?, 1)",
            cat
          );
        }
      }

      // Proveedores iniciales por defecto si no existen
      const provCount = await this.connection.select<{ c: number }>("SELECT count(*) as c FROM proveedores");
      if (!provCount || provCount[0]?.c === 0) {
        const defaultProvs = [
          ['96.792.000-2', 'Distribuidora CCU Chile S.A.', 'Andrés Valenzuela', '+56 9 8123 4567', 'ventas@ccuchile.cl', 'Av. Presidente Eduardo Frei Montalva 9600, Santiago'],
          ['91.144.000-8', 'Embotelladora Andina S.A.', 'Claudia Morales', '+56 9 7234 5678', 'pedidos@koandina.com', 'Av. El Peñón 0123, Puente Alto'],
          ['77.345.678-K', 'Distribuidora Abarrotes Central Ltda.', 'Roberto Fuentes', '+56 9 6345 6789', 'contacto@abarrotescentral.cl', 'Av. Los Pajaritos 4560, Maipú']
        ];
        for (const p of defaultProvs) {
          await this.connection.execute(
            "INSERT OR IGNORE INTO proveedores (rut, nombre, contacto, telefono, email, direccion, activo) VALUES (?, ?, ?, ?, ?, ?, 1)",
            p
          );
        }
      }

      // Productos iniciales por defecto si no existen
      const prodCount = await this.connection.select<{ c: number }>("SELECT count(*) as c FROM productos");
      if (!prodCount || prodCount[0]?.c === 0) {
        const defaultProds = [
          ['BEB-001', '7801610001014', 'Coca-Cola Original 1.5L', 'Bebida gaseosa sabor original 1.5 litros', 'Coca-Cola', 1, 1, 1700, 1100, 48, 10, 'unidad', 0, 1],
          ['ABR-001', '7802500000011', 'Arroz Grado 1 Selección 1kg', 'Arroz grano largo seleccionado 1 kilo', 'Tucapel', 2, 3, 1450, 950, 36, 8, 'unidad', 0, 1],
          ['PAN-001', '7803700000025', 'Pan Hallulla Especial 1kg', 'Pan tradicional recién horneado por kilo', 'Panadería La Palmera', 3, 2, 1350, 850, 25, 5, 'kg', 1, 1]
        ];
        for (const prod of defaultProds) {
          await this.connection.execute(
            "INSERT OR IGNORE INTO productos (codigo, codigo_barras, nombre, descripcion, marca, categoria_id, proveedor_id, precio_venta, precio_costo, stock_actual, stock_minimo, unidad_medida, permite_decimales, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            prod
          );
        }
      }

      // Clientes iniciales para fiar con 30.000 de crédito si no existen
      const cliCount = await this.connection.select<{ c: number }>("SELECT count(*) as c FROM clientes");
      if (!cliCount || cliCount[0]?.c === 0) {
        const defaultClients = [
          ['15.874.321-3', 'Juan Carlos Pérez González', '+56 9 9123 4567', 'juan.perez@gmail.com', 'Calle Los Alerces 742', 'Santiago', 30000, 0],
          ['17.654.321-3', 'María Elena Soto Martínez', '+56 9 8234 5678', 'maria.soto@gmail.com', 'Pasaje Las Flores 158', 'Santiago', 30000, 0],
          ['19.432.109-0', 'Carlos Andrés Muñoz Valdés', '+56 9 7345 6789', 'carlos.munoz@gmail.com', 'Av. Central 890', 'Santiago', 30000, 0]
        ];
        for (const cl of defaultClients) {
          await this.connection.execute(
            "INSERT OR IGNORE INTO clientes (rut, nombre, telefono, email, direccion, ciudad, limite_credito, saldo_deudor, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
            cl
          );
        }
      }

      // Usuarios iniciales por defecto si no existen
      const userCount = await this.connection.select<{ c: number }>("SELECT count(*) as c FROM usuarios");
      if (!userCount || userCount[0]?.c === 0) {
        const defaultUsers = [
          ['yasna', 'Carlos1941', 'Yasna', 'admin'],
          ['karla', 'Karla2004', 'Karla', 'supervisor'],
          ['ventas', '', 'VENTAS', 'cajero']
        ];
        for (const u of defaultUsers) {
          await this.connection.execute(
            "INSERT OR IGNORE INTO usuarios (username, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)",
            u
          );
        }
      }
    } catch (e) {
      console.warn('[SQLite] Aviso en seeds iniciales:', e);
    }
  }

  public async factoryReset(): Promise<void> {
    const conn = await this.getConnection();

    // 1. Desactivar temporalmente foreign keys para evitar bloqueos por dependencias circulares
    try {
      await conn.execute('PRAGMA foreign_keys = OFF;');
    } catch {}

    // 2. Limpieza exhaustiva de todas las tablas
    const tablesToClear = [
      'venta_items',
      'venta_pagos',
      'ventas',
      'compra_items',
      'compras',
      'cliente_movimientos',
      'clientes',
      'inventario_movimientos',
      'caja_movimientos',
      'caja_sesiones',
      'productos',
      'proveedores',
      'sync_queue',
      'respaldos',
      'categorias',
      'usuarios',
      'configuracion'
    ];

    for (const table of tablesToClear) {
      try {
        await conn.execute(`DELETE FROM ${table};`);
      } catch (err) {
        console.warn(`[SQLite Reset] Error limpiando tabla ${table}:`, err);
      }
    }

    try {
      await conn.execute('DELETE FROM sqlite_sequence;');
      await conn.execute('VACUUM;');
      await conn.execute('PRAGMA foreign_keys = ON;');
    } catch (e) {
      // Ignorar si sqlite_sequence no está presente
    }

    // 3. Limpiar BrowserFallbackDB si está en uso
    if (this.fallbackDB) {
      this.fallbackDB.clearAll();
    }

    // 4. Limpiar todas las claves de localStorage y sessionStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('lapalmera_mock_db');
        window.localStorage.removeItem('lapalmera_sales_cache');
        window.localStorage.removeItem('lapalmera_cart_items');
        window.localStorage.removeItem('lapalmera_last_sale');
        window.localStorage.removeItem('lapalmera_dashboard_cache');
        window.localStorage.removeItem('lapalmera_theme');
      }
    } catch (e) {
      console.warn('Error limpiando localStorage:', e);
    }

    // 5. Re-sembrar esquema inicial limpio (configuración, categorías base y usuarios base)
    await this.runSeeds();

    console.log('[SQLite Reset] Base de datos restablecida a valores de fábrica exitosamente.');
  }
}

export const dbManager = DatabaseManager.getInstance();
export const getDatabase = () => dbManager.getConnection();
export const factoryResetDatabase = () => dbManager.factoryReset();
