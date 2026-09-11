// Repositorio SQLite Offline-First para Productos
import { Product } from '../../types/product';
import { dbManager } from '../db';
import { syncService } from '../../services/syncService';

export const productRepository = {
  async list(filters?: { search?: string; categoriaId?: string | number; activo?: boolean }): Promise<Product[]> {
    const db = await dbManager.getConnection();
    let query = `
      SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre 
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.activo !== undefined) {
      query += ' AND p.activo = ?';
      params.push(filters.activo ? 1 : 0);
    }

    if (filters?.categoriaId) {
      query += ' AND p.categoria_id = ?';
      params.push(Number(filters.categoriaId));
    }

    if (filters?.search) {
      query += ' AND (p.nombre LIKE ? OR p.codigo LIKE ? OR p.codigo_barras LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY p.nombre ASC';
    const rows = await db.select<any>(query, params);

    return rows.map(r => ({
      id: r.id,
      codigo: r.codigo,
      codigoBarras: r.codigo_barras,
      nombre: r.nombre,
      descripcion: r.descripcion,
      marca: r.marca,
      categoriaId: r.categoria_id,
      categoriaNombre: r.categoria_nombre,
      proveedorId: r.proveedor_id,
      proveedorNombre: r.proveedor_nombre,
      precioVenta: r.precio_venta,
      precioCosto: r.precio_costo,
      stockActual: r.stock_actual,
      stockMinimo: r.stock_minimo,
      unidadMedida: r.unidad_medida,
      permiteDecimales: Boolean(r.permite_decimales),
      activo: Boolean(r.activo === 1 || r.activo === true || r.activo === '1'),
      imagenUrl: r.imagen_url,
      aplicaIva: Boolean(r.aplica_iva),
      creadoEn: r.creado_en,
      actualizadoEn: r.actualizado_en,
    }));
  },

  async getById(id: string | number): Promise<Product | null> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>(
      `SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre 
       FROM productos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       LEFT JOIN proveedores pr ON p.proveedor_id = pr.id 
       WHERE p.id = ?`,
      [Number(id)]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      codigo: r.codigo,
      codigoBarras: r.codigo_barras,
      nombre: r.nombre,
      descripcion: r.descripcion,
      marca: r.marca,
      categoriaId: r.categoria_id,
      categoriaNombre: r.categoria_nombre,
      proveedorId: r.proveedor_id,
      proveedorNombre: r.proveedor_nombre,
      precioVenta: r.precio_venta,
      precioCosto: r.precio_costo,
      stockActual: r.stock_actual,
      stockMinimo: r.stock_minimo,
      unidadMedida: r.unidad_medida,
      permiteDecimales: Boolean(r.permite_decimales),
      activo: Boolean(r.activo === 1 || r.activo === true || r.activo === '1'),
      imagenUrl: r.imagen_url,
      aplicaIva: Boolean(r.aplica_iva),
      creadoEn: r.creado_en,
      actualizadoEn: r.actualizado_en,
    };
  },

  async getByCode(code: string): Promise<Product | null> {
    const db = await dbManager.getConnection();
    const clean = String(code || '').trim();
    const rows = await db.select<any>(
      `SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre 
       FROM productos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       LEFT JOIN proveedores pr ON p.proveedor_id = pr.id 
       WHERE (TRIM(p.codigo) = ? OR TRIM(p.codigo_barras) = ? OR p.codigo = ? OR p.codigo_barras = ?) LIMIT 1`,
      [clean, clean, clean, clean]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      codigo: r.codigo,
      codigoBarras: r.codigo_barras,
      nombre: r.nombre,
      descripcion: r.descripcion,
      marca: r.marca,
      categoriaId: r.categoria_id,
      categoriaNombre: r.categoria_nombre,
      proveedorId: r.proveedor_id,
      proveedorNombre: r.proveedor_nombre,
      precioVenta: r.precio_venta,
      precioCosto: r.precio_costo,
      stockActual: r.stock_actual,
      stockMinimo: r.stock_minimo,
      unidadMedida: r.unidad_medida,
      permiteDecimales: Boolean(r.permite_decimales),
      activo: Boolean(r.activo === 1 || r.activo === true || r.activo === '1'),
      imagenUrl: r.imagen_url,
      aplicaIva: Boolean(r.aplica_iva),
    };
  },

  async create(data: Partial<Product> & Record<string, any>): Promise<Product> {
    const db = await dbManager.getConnection();
    const cleanCode = String(data.codigo || '').trim();

    // Validar código duplicado antes de insertar
    if (cleanCode) {
      const existing = await db.select<any>('SELECT id, nombre FROM productos WHERE TRIM(codigo) = ?', [cleanCode]);
      if (existing && existing.length > 0) {
        throw new Error(`El código "${cleanCode}" ya está en uso por el producto "${existing[0].nombre}". Por favor utiliza un código diferente.`);
      }
    }

    if (data.codigoBarras && String(data.codigoBarras).trim()) {
      const cleanBar = String(data.codigoBarras).trim();
      const existingBar = await db.select<any>('SELECT id, nombre FROM productos WHERE TRIM(codigo_barras) = ?', [cleanBar]);
      if (existingBar && existingBar.length > 0) {
        throw new Error(`El código de barras "${cleanBar}" ya pertenece al producto "${existingBar[0].nombre}".`);
      }
    }

    const catId = data.categoriaId ?? data.categoria ?? null;
    const provId = data.proveedorId ?? data.proveedorPrincipal ?? null;

    const res = await db.execute(
      `INSERT INTO productos (
        codigo, codigo_barras, nombre, descripcion, marca, categoria_id, proveedor_id,
        precio_venta, precio_costo, stock_actual, stock_minimo,
        unidad_medida, permite_decimales, activo, imagen_url, aplica_iva
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanCode,
        data.codigoBarras ? String(data.codigoBarras).trim() : null,
        data.nombre ? String(data.nombre).trim() : 'Producto',
        data.descripcion || null,
        data.marca || null,
        catId ? Number(catId) : null,
        provId ? Number(provId) : null,
        data.precioVenta ?? 0,
        data.precioCosto ?? 0,
        data.stockActual ?? 0,
        data.stockMinimo ?? 5,
        data.unidadMedida || 'unidad',
        data.permiteDecimales ? 1 : 0,
        data.activo !== false ? 1 : 0,
        data.imagenUrl || null,
        data.aplicaIva !== false ? 1 : 0,
      ]
    );

    const newId = res.lastInsertId;
    const created = await this.getById(newId);

    // Encolar para sincronización
    await syncService.enqueueChange('productos', newId, 'INSERT', created);
    return created!;
  },

  async update(id: string | number, data: Partial<Product> & Record<string, any>): Promise<Product> {
    const db = await dbManager.getConnection();
    const fields: string[] = [];
    const params: any[] = [];

    if (data.codigo !== undefined) {
      fields.push('codigo = ?');
      params.push(String(data.codigo).trim());
    }
    if (data.codigoBarras !== undefined) {
      fields.push('codigo_barras = ?');
      params.push(data.codigoBarras ? String(data.codigoBarras).trim() : null);
    }
    if (data.nombre !== undefined) {
      fields.push('nombre = ?');
      params.push(String(data.nombre).trim());
    }
    if (data.descripcion !== undefined) {
      fields.push('descripcion = ?');
      params.push(data.descripcion || null);
    }
    if (data.marca !== undefined) {
      fields.push('marca = ?');
      params.push(data.marca || null);
    }

    const catId = data.categoriaId !== undefined ? data.categoriaId : (data.categoria !== undefined ? data.categoria : undefined);
    if (catId !== undefined) {
      fields.push('categoria_id = ?');
      params.push(catId ? Number(catId) : null);
    }

    const provId = data.proveedorId !== undefined ? data.proveedorId : (data.proveedorPrincipal !== undefined ? data.proveedorPrincipal : undefined);
    if (provId !== undefined) {
      fields.push('proveedor_id = ?');
      params.push(provId ? Number(provId) : null);
    }

    if (data.precioVenta !== undefined) {
      fields.push('precio_venta = ?');
      params.push(Number(data.precioVenta) || 0);
    }
    if (data.precioCosto !== undefined) {
      fields.push('precio_costo = ?');
      params.push(Number(data.precioCosto) || 0);
    }
    if (data.stockActual !== undefined) {
      fields.push('stock_actual = ?');
      params.push(Number(data.stockActual) || 0);
    }
    if (data.stockMinimo !== undefined) {
      fields.push('stock_minimo = ?');
      params.push(Number(data.stockMinimo) || 5);
    }
    if (data.unidadMedida !== undefined) {
      fields.push('unidad_medida = ?');
      params.push(data.unidadMedida || 'unidad');
    }
    if (data.permiteDecimales !== undefined) {
      fields.push('permite_decimales = ?');
      params.push(data.permiteDecimales ? 1 : 0);
    }
    if (data.activo !== undefined) {
      fields.push('activo = ?');
      params.push(data.activo ? 1 : 0);
    }
    if (data.imagenUrl !== undefined) {
      fields.push('imagen_url = ?');
      params.push(data.imagenUrl || null);
    }
    if (data.aplicaIva !== undefined) {
      fields.push('aplica_iva = ?');
      params.push(data.aplicaIva ? 1 : 0);
    }

    fields.push("actualizado_en = datetime('now', 'localtime')");
    params.push(Number(id));

    if (fields.length > 1) {
      await db.execute(`UPDATE productos SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    const updated = await this.getById(id);
    await syncService.enqueueChange('productos', id, 'UPDATE', updated);
    return updated!;
  },

  async delete(id: string | number): Promise<boolean> {
    const db = await dbManager.getConnection();
    const numId = Number(id);
    if (!numId) return false;

    // 1. Desvincular de venta_items y compra_items primero de forma segura
    await db.execute('UPDATE venta_items SET producto_id = NULL WHERE producto_id = ?', [numId]).catch(() => {});
    await db.execute('UPDATE compra_items SET producto_id = NULL WHERE producto_id = ?', [numId]).catch(() => {});
    await db.execute('UPDATE inventario_movimientos SET producto_id = NULL WHERE producto_id = ?', [numId]).catch(() => {});

    // 2. Eliminar producto
    const res = await db.execute('DELETE FROM productos WHERE id = ?', [numId]);

    // 3. Encolar cambio para sincronización
    await syncService.enqueueChange('productos', numId, 'DELETE', { id: numId }).catch(() => {});

    return res.rowsAffected > 0;
  },

  async deleteMany(ids: (string | number)[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    let deletedCount = 0;
    for (const id of ids) {
      try {
        const ok = await this.delete(id);
        if (ok) deletedCount++;
      } catch (err) {
        console.warn(`[productRepository] Error eliminando producto ${id}:`, err);
      }
    }
    return deletedCount;
  },

  async getKardex(filters?: { productoId?: string | number; fechaDesde?: string; fechaHasta?: string; limit?: number }): Promise<any[]> {
    const db = await dbManager.getConnection();
    let query = `
      SELECT m.*, u.nombre as usuario_nombre_db
      FROM inventario_movimientos m
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.productoId) {
      query += ' AND m.producto_id = ?';
      params.push(Number(filters.productoId));
    }
    if (filters?.fechaDesde) {
      query += ' AND date(m.fecha) >= date(?)';
      params.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query += ' AND date(m.fecha) <= date(?)';
      params.push(filters.fechaHasta);
    }

    query += ' ORDER BY m.id DESC';

    if (filters?.limit) {
      query += ` LIMIT ${Number(filters.limit)}`;
    } else {
      query += ' LIMIT 100';
    }

    const rows = await db.select<any>(query, params);
    return rows.map(r => ({
      id: r.id,
      productoId: r.producto_id,
      productoNombre: r.producto_nombre,
      tipo: r.tipo,
      cantidad: Number(r.cantidad || 0),
      stockAnterior: Number(r.stock_anterior || 0),
      stockNuevo: Number(r.stock_nuevo || 0),
      motivo: r.motivo,
      referenciaId: r.referencia_id,
      usuarioId: r.usuario_id,
      usuarioNombre: r.usuario_nombre_db || 'Sistema',
      fecha: r.fecha,
    }));
  },

  async getStats(): Promise<{ total: number; lowStock: number; outOfStock: number; totalValue: number }> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > 0 THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN stock_actual <= 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(stock_actual * precio_costo) as total_value
      FROM productos
      WHERE activo = 1
    `);

    const r = rows[0] || {};
    return {
      total: r.total || 0,
      lowStock: r.low_stock || 0,
      outOfStock: r.out_of_stock || 0,
      totalValue: r.total_value || 0,
    };
  }
};
