import { Purchase, PurchaseItem } from '../../types/inventory';
import { dbManager } from '../db';
import { syncService } from '../../services/syncService';

export const purchaseRepository = {
  async list(filters?: { fechaDesde?: string; fechaHasta?: string; proveedorId?: string | number; estado?: string; limit?: number; page?: number }): Promise<Purchase[]> {
    const db = await dbManager.getConnection();
    let query = 'SELECT * FROM compras WHERE 1=1';
    const params: any[] = [];

    if (filters?.fechaDesde) {
      query += ' AND date(fecha) >= date(?)';
      params.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query += ' AND date(fecha) <= date(?)';
      params.push(filters.fechaHasta);
    }
    if (filters?.proveedorId) {
      query += ' AND proveedor_id = ?';
      params.push(Number(filters.proveedorId));
    }
    if (filters?.estado) {
      query += ' AND estado = ?';
      params.push(filters.estado);
    }

    query += ' ORDER BY fecha DESC, id DESC';

    if (filters?.limit) {
      const limit = Number(filters.limit);
      const page = Number(filters.page) || 1;
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const rows = await db.select<any>(query, params);
    const compras: Purchase[] = [];

    for (const r of rows) {
      const items = await db.select<any>(
        'SELECT * FROM compra_items WHERE compra_id = ? ORDER BY id ASC',
        [r.id]
      );

      compras.push({
        id: r.id,
        folio: r.folio || r.id,
        numeroFactura: r.numero_factura || undefined,
        proveedorId: r.proveedor_id || undefined,
        proveedorNombre: r.proveedor_nombre || undefined,
        fecha: r.fecha || r.creado_en,
        subtotal: Number(r.subtotal ?? 0),
        impuestoTotal: Number(r.impuesto_total ?? 0),
        total: Number(r.total ?? 0),
        estado: r.estado || 'completada',
        usuarioId: r.usuario_id || 1,
        usuarioNombre: r.usuario_nombre || undefined,
        notas: r.notas || undefined,
        items: items.map((i: any) => ({
          id: i.id,
          compraId: i.compra_id,
          productoId: i.producto_id,
          codigo: i.codigo,
          nombre: i.nombre,
          cantidad: Number(i.cantidad ?? 0),
          costoUnitario: Number(i.costo_unitario ?? 0),
          subtotal: Number(i.subtotal ?? 0),
        })),
      });
    }

    return compras;
  },

  async count(filters?: { fechaDesde?: string; fechaHasta?: string; proveedorId?: string | number; estado?: string }): Promise<number> {
    const db = await dbManager.getConnection();
    let query = 'SELECT COUNT(*) as total FROM compras WHERE 1=1';
    const params: any[] = [];

    if (filters?.fechaDesde) {
      query += ' AND date(fecha) >= date(?)';
      params.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query += ' AND date(fecha) <= date(?)';
      params.push(filters.fechaHasta);
    }
    if (filters?.proveedorId) {
      query += ' AND proveedor_id = ?';
      params.push(Number(filters.proveedorId));
    }
    if (filters?.estado) {
      query += ' AND estado = ?';
      params.push(filters.estado);
    }

    const rows = await db.select<any>(query, params);
    return Number(rows[0]?.total ?? 0);
  },

  async getById(id: string | number): Promise<Purchase | null> {
    const db = await dbManager.getConnection();
    const numId = Number(id);
    const rows = await db.select<any>(
      'SELECT * FROM compras WHERE id = ? OR folio = ? LIMIT 1',
      [numId, numId]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    const items = await db.select<any>(
      'SELECT * FROM compra_items WHERE compra_id = ? ORDER BY id ASC',
      [r.id]
    );

    return {
      id: r.id,
      folio: r.folio || r.id,
      numeroFactura: r.numero_factura || undefined,
      proveedorId: r.proveedor_id || undefined,
      proveedorNombre: r.proveedor_nombre || undefined,
      fecha: r.fecha || r.creado_en,
      subtotal: Number(r.subtotal ?? 0),
      impuestoTotal: Number(r.impuesto_total ?? 0),
      total: Number(r.total ?? 0),
      estado: r.estado || 'completada',
      usuarioId: r.usuario_id || 1,
      usuarioNombre: r.usuario_nombre || undefined,
      notas: r.notas || undefined,
      items: items.map((i: any) => ({
        id: i.id,
        compraId: i.compra_id,
        productoId: i.producto_id,
        codigo: i.codigo,
        nombre: i.nombre,
        cantidad: Number(i.cantidad ?? 0),
        costoUnitario: Number(i.costo_unitario ?? 0),
        subtotal: Number(i.subtotal ?? 0),
      })),
    };
  },

  async create(compraData: Omit<Purchase, 'id'>): Promise<Purchase> {
    const db = await dbManager.getConnection();

    // 1. Obtener siguiente folio consecutivo
    let folio = compraData.folio;
    if (!folio) {
      const maxRows = await db.select<{ maxF: number }>('SELECT MAX(folio) as maxF FROM compras');
      folio = (maxRows[0]?.maxF || 0) + 1;
    }

    // 2. Insertar compra en SQLite
    const res = await db.execute(
      `INSERT INTO compras (
        folio, numero_factura, proveedor_id, proveedor_nombre,
        fecha, subtotal, impuesto_total, total, estado,
        usuario_id, usuario_nombre, notas
      ) VALUES (?, ?, ?, ?, COALESCE(?, datetime('now', 'localtime')), ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(folio),
        compraData.numeroFactura || null,
        compraData.proveedorId ? Number(compraData.proveedorId) : null,
        compraData.proveedorNombre || null,
        compraData.fecha || null,
        Number(compraData.subtotal ?? compraData.total ?? 0),
        Number(compraData.impuestoTotal ?? 0),
        Number(compraData.total ?? 0),
        compraData.estado || 'completada',
        Number(compraData.usuarioId) || 1,
        compraData.usuarioNombre || 'Administrador',
        compraData.notas || null,
      ]
    );

    const compraId = res.lastInsertId;

    // 3. Insertar items y actualizar stock / precio de costo
    for (const item of (compraData.items || [])) {
      const prodId = Number(item.productoId);
      await db.execute(
        `INSERT INTO compra_items (
          compra_id, producto_id, codigo, nombre, cantidad,
          costo_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          compraId,
          prodId,
          item.codigo || '',
          item.nombre || '',
          Number(item.cantidad ?? 0),
          Number(item.costoUnitario ?? 0),
          Number(item.subtotal ?? 0),
        ]
      );

      // Aumentar stock y actualizar precio de costo si aplica
      if (prodId) {
        await db.execute(
          'UPDATE productos SET stock_actual = stock_actual + ?, precio_costo = COALESCE(NULLIF(?, 0), precio_costo) WHERE id = ?',
          [Number(item.cantidad ?? 0), Number(item.costoUnitario ?? 0), prodId]
        );

        // Registrar kardex
        await db.execute(
          `INSERT INTO inventario_movimientos (
            producto_id, producto_nombre, tipo, cantidad,
            stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id
          ) VALUES (
            ?, ?, 'entrada_compra', ?,
            (SELECT stock_actual - ? FROM productos WHERE id = ?),
            (SELECT stock_actual FROM productos WHERE id = ?),
            'Compra #' || ?, ?, ?
          )`,
          [
            prodId,
            item.nombre,
            Number(item.cantidad ?? 0),
            Number(item.cantidad ?? 0),
            prodId,
            prodId,
            compraId,
            compraId,
            Number(compraData.usuarioId) || 1,
          ]
        ).catch((err) => {
          console.warn('[purchaseRepository] Aviso registrando movimiento kardex compra:', err);
        });
      }
    }

    const created = await this.getById(compraId);
    if (!created) {
      throw new Error(`Error recuperando compra recién creada con ID ${compraId}`);
    }

    // Encolar compra para sincronización online
    await syncService.enqueueChange('compras', compraId, 'INSERT', created).catch(() => {});

    return created;
  },

  async getSummary(): Promise<{ cantidad: number; totalComprado: number }> {
    const db = await dbManager.getConnection();
    const rows = await db.select<any>(
      "SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as totalComprado FROM compras WHERE estado != 'anulada'"
    );
    return {
      cantidad: Number(rows[0]?.cantidad ?? 0),
      totalComprado: Number(rows[0]?.totalComprado ?? 0),
    };
  },

  /**
   * Obtiene métricas agregadas de compras por proveedor (total compras, monto, última fecha, productos suministrados)
   */
  async getSupplierStats(): Promise<Record<string, { totalCompras: number; totalMonto: number; ultimaFecha: string | null; totalProductos: number }>> {
    const compras = await this.list();
    const stats: Record<string, { totalCompras: number; totalMonto: number; ultimaFecha: string | null; productosSet: Set<string | number>; totalProductos: number }> = {};

    for (const c of compras) {
      if (c.estado === 'anulada') continue;
      const provKey = String(c.proveedorId || c.proveedorNombre || 'desconocido');
      if (!stats[provKey]) {
        stats[provKey] = {
          totalCompras: 0,
          totalMonto: 0,
          ultimaFecha: null,
          productosSet: new Set(),
          totalProductos: 0,
        };
      }

      stats[provKey].totalCompras += 1;
      stats[provKey].totalMonto += Number(c.total || 0);

      const fecha = c.fecha ? String(c.fecha).slice(0, 10) : null;
      if (fecha && (!stats[provKey].ultimaFecha || fecha > stats[provKey].ultimaFecha!)) {
        stats[provKey].ultimaFecha = fecha;
      }

      for (const item of (c.items || [])) {
        const pKey = item.productoId ? String(item.productoId) : item.codigo || item.nombre;
        if (pKey) stats[provKey].productosSet.add(pKey);
      }
    }

    const result: Record<string, { totalCompras: number; totalMonto: number; ultimaFecha: string | null; totalProductos: number }> = {};
    for (const [key, s] of Object.entries(stats)) {
      result[key] = {
        totalCompras: s.totalCompras,
        totalMonto: s.totalMonto,
        ultimaFecha: s.ultimaFecha,
        totalProductos: s.productosSet.size,
      };
    }
    return result;
  },

  /**
   * Obtiene el desglose de productos comprados a un proveedor específico
   */
  async getSupplierProducts(proveedorId: string | number): Promise<any[]> {
    const compras = await this.list();
    const numId = Number(proveedorId);
    const strId = String(proveedorId);

    const filtered = compras.filter(
      (c) => (c.proveedorId && (Number(c.proveedorId) === numId || String(c.proveedorId) === strId)) && c.estado !== 'anulada'
    );

    const prodsMap: Record<string, {
      productoId: any;
      codigo: string;
      nombre: string;
      totalCantidad: number;
      ultimoPrecio: number;
      menorPrecio: number;
      mayorPrecio: number;
      totalGastado: number;
      ultimaFecha: string;
      comprasCount: number;
    }> = {};

    for (const c of filtered) {
      const fecha = c.fecha ? String(c.fecha).slice(0, 10) : '';
      for (const item of (c.items || [])) {
        const key = String(item.productoId || item.codigo || item.nombre);
        if (!prodsMap[key]) {
          prodsMap[key] = {
            productoId: item.productoId,
            codigo: item.codigo || '',
            nombre: item.nombre || 'Producto',
            totalCantidad: 0,
            ultimoPrecio: Number(item.costoUnitario || 0),
            menorPrecio: Number(item.costoUnitario || 0),
            mayorPrecio: Number(item.costoUnitario || 0),
            totalGastado: 0,
            ultimaFecha: fecha,
            comprasCount: 0,
          };
        }

        const p = prodsMap[key];
        p.totalCantidad += Number(item.cantidad || 0);
        p.totalGastado += Number(item.subtotal || (item.cantidad * item.costoUnitario) || 0);
        p.comprasCount += 1;

        const costo = Number(item.costoUnitario || 0);
        if (costo > 0) {
          if (p.menorPrecio === 0 || costo < p.menorPrecio) p.menorPrecio = costo;
          if (costo > p.mayorPrecio) p.mayorPrecio = costo;
        }

        if (fecha && (!p.ultimaFecha || fecha >= p.ultimaFecha)) {
          p.ultimaFecha = fecha;
          p.ultimoPrecio = costo;
        }
      }
    }

    return Object.values(prodsMap).sort((a, b) => b.totalGastado - a.totalGastado);
  },

  /**
   * Genera el reporte de Comparativa de Precios por Proveedor
   * Compara los precios históricos de compra para cada producto entre distintos proveedores
   */
  async getPriceComparison(): Promise<any[]> {
    const compras = await this.list();
    // Mapa: Producto -> { [ProveedorKey]: { proveedorNombre, ultimoPrecio, menorPrecio, mayorPrecio, totalCantidad, ultimaFecha } }
    const comparisonMap: Record<string, {
      productoId: any;
      codigo: string;
      nombre: string;
      proveedores: Record<string, {
        proveedorId: any;
        proveedorNombre: string;
        ultimoPrecio: number;
        menorPrecio: number;
        mayorPrecio: number;
        totalCantidad: number;
        ultimaFecha: string;
        comprasCount: number;
      }>;
    }> = {};

    for (const c of compras) {
      if (c.estado === 'anulada') continue;
      const provId = c.proveedorId || null;
      const provNombre = c.proveedorNombre || 'Proveedor sin nombre';
      const provKey = String(provId || provNombre);
      const fecha = c.fecha ? String(c.fecha).slice(0, 10) : '';

      for (const item of (c.items || [])) {
        const prodKey = String(item.productoId || item.codigo || item.nombre);
        if (!prodKey) continue;

        if (!comparisonMap[prodKey]) {
          comparisonMap[prodKey] = {
            productoId: item.productoId,
            codigo: item.codigo || '',
            nombre: item.nombre || 'Producto',
            proveedores: {},
          };
        }

        const prodComp = comparisonMap[prodKey];
        if (!prodComp.proveedores[provKey]) {
          prodComp.proveedores[provKey] = {
            proveedorId: provId,
            proveedorNombre: provNombre,
            ultimoPrecio: Number(item.costoUnitario || 0),
            menorPrecio: Number(item.costoUnitario || 0),
            mayorPrecio: Number(item.costoUnitario || 0),
            totalCantidad: 0,
            ultimaFecha: fecha,
            comprasCount: 0,
          };
        }

        const provData = prodComp.proveedores[provKey];
        provData.totalCantidad += Number(item.cantidad || 0);
        provData.comprasCount += 1;

        const costo = Number(item.costoUnitario || 0);
        if (costo > 0) {
          if (provData.menorPrecio === 0 || costo < provData.menorPrecio) provData.menorPrecio = costo;
          if (costo > provData.mayorPrecio) provData.mayorPrecio = costo;
        }

        if (fecha && (!provData.ultimaFecha || fecha >= provData.ultimaFecha)) {
          provData.ultimaFecha = fecha;
          provData.ultimoPrecio = costo;
        }
      }
    }

    const results: any[] = [];

    for (const [_, item] of Object.entries(comparisonMap)) {
      const provList = Object.values(item.proveedores);
      if (provList.length === 0) continue;

      // Ordenar proveedores del más barato al más caro según su menor / último precio
      provList.sort((a, b) => (a.ultimoPrecio || a.menorPrecio) - (b.ultimoPrecio || b.menorPrecio));

      const mejorOpcion = provList[0];
      const peorOpcion = provList[provList.length - 1];

      const precioMasBajo = mejorOpcion.ultimoPrecio || mejorOpcion.menorPrecio;
      const precioMasAlto = peorOpcion.ultimoPrecio || peorOpcion.mayorPrecio;
      const diferencia = precioMasAlto - precioMasBajo;
      const porcentajeAhorro = precioMasAlto > 0 ? Math.round((diferencia / precioMasAlto) * 100) : 0;

      results.push({
        productoId: item.productoId,
        codigo: item.codigo,
        nombre: item.nombre,
        proveedores: provList,
        totalProveedores: provList.length,
        mejorProveedor: mejorOpcion.proveedorNombre,
        mejorProveedorId: mejorOpcion.proveedorId,
        precioMasBajo,
        precioMasAlto,
        ahorroMonto: diferencia,
        porcentajeAhorro,
        tieneMultipleOpcion: provList.length > 1,
      });
    }

    // Ordenar productos: primero los que tienen mayor diferencia de ahorro y múltiples proveedores
    return results.sort((a, b) => {
      if (b.tieneMultipleOpcion !== a.tieneMultipleOpcion) {
        return b.tieneMultipleOpcion ? 1 : -1;
      }
      return b.ahorroMonto - a.ahorroMonto;
    });
  },
};
