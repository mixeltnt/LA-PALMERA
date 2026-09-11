// Repositorio SQLite para Ventas - La Palmera POS (Modo Autónomo Local)
import { Sale } from '../../types/sale';
import { dbManager } from '../db';
import { syncService } from '../../services/syncService';

export function getLocalDateISO(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const saleRepository = {
  async count(filters?: { fechaDesde?: string; fechaHasta?: string; cajeroId?: string | number; estado?: string; search?: string }): Promise<number> {
    const db = await dbManager.getConnection();
    let query = 'SELECT COUNT(*) as total FROM ventas WHERE 1=1';
    const params: any[] = [];

    if (filters?.fechaDesde) {
      query += " AND (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END) >= date(?)";
      params.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query += " AND (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END) <= date(?)";
      params.push(filters.fechaHasta);
    }
    if (filters?.cajeroId) {
      query += ' AND cajero_id = ?';
      params.push(Number(filters.cajeroId));
    }
    if (filters?.estado) {
      query += ' AND LOWER(estado) = LOWER(?)';
      params.push(filters.estado);
    }
    if (filters?.search) {
      const s = `%${filters.search}%`;
      const num = Number(filters.search);
      if (!isNaN(num) && num > 0) {
        query += ' AND (folio = ? OR cliente_nombre LIKE ? OR metodo_pago_principal LIKE ? OR notas LIKE ?)';
        params.push(num, s, s, s);
      } else {
        query += ' AND (cliente_nombre LIKE ? OR metodo_pago_principal LIKE ? OR notas LIKE ?)';
        params.push(s, s, s);
      }
    }

    const rows = await db.select<any>(query, params);
    return Number(rows[0]?.total ?? rows[0]?.c ?? rows[0]?.count ?? 0);
  },

  async getById(id: string | number): Promise<Sale | null> {
    const db = await dbManager.getConnection();
    const numId = Number(id);
    let rows = await db.select<any>(
      `SELECT v.*, c.nombre as c_nombre, c.rut as c_rut 
       FROM ventas v 
       LEFT JOIN clientes c ON v.cliente_id = c.id 
       WHERE v.id = ? LIMIT 1`,
      [numId]
    );

    // Si no se encuentra por ID, intentar buscar por folio
    if (!rows || rows.length === 0) {
      rows = await db.select<any>(
        `SELECT v.*, c.nombre as c_nombre, c.rut as c_rut 
         FROM ventas v 
         LEFT JOIN clientes c ON v.cliente_id = c.id 
         WHERE v.folio = ? LIMIT 1`,
        [numId]
      );
    }

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    const items = await db.select<any>('SELECT * FROM venta_items WHERE venta_id = ? ORDER BY id ASC', [r.id]);
    const pagos = await db.select<any>('SELECT * FROM venta_pagos WHERE venta_id = ? ORDER BY id ASC', [r.id]);

    const resolvedClienteNombre = r.c_nombre || r.cliente_nombre || (r.cliente_id ? 'Cliente' : null);

    return {
      id: r.id,
      _id: String(r.id),
      folio: Number(r.folio) || r.id,
      numeroVenta: Number(r.folio) || r.id,
      numeroBoleta: r.numero_boleta || `BOL-${r.folio || r.id}`,
      fecha: r.fecha || new Date().toISOString(),
      cajeroId: r.cajero_id,
      cajeroNombre: r.cajero_nombre || 'Yasna',
      usuario: {
        id: r.cajero_id,
        nombre: r.cajero_nombre || 'Yasna',
        username: r.cajero_nombre || 'yasna',
      },
      cajaSesionId: r.caja_sesion_id,
      clienteId: r.cliente_id,
      clienteNombre: resolvedClienteNombre,
      cliente: r.cliente_id ? {
        id: r.cliente_id,
        _id: String(r.cliente_id),
        nombre: resolvedClienteNombre || 'Cliente',
        rut: r.c_rut || '',
      } : (r.cliente_nombre ? { nombre: r.cliente_nombre, rut: '' } : null),
      subtotal: Number(r.subtotal ?? 0),
      descuentoTotal: Number(r.descuento_total ?? 0),
      impuestoTotal: Number(r.impuesto_total ?? 0),
      total: Number(r.total ?? 0),
      montoRecibido: Number(r.monto_recibido ?? 0),
      vuelto: Number(r.vuelto ?? 0),
      metodoPago: (r.metodo_pago_principal || 'efectivo').toUpperCase(),
      metodoPagoPrincipal: r.metodo_pago_principal || 'efectivo',
      estado: r.estado || 'completada',
      motivoAnulacion: r.motivo_anulacion,
      notas: r.notas,
      sincronizado: Boolean(r.sincronizado),
      items: items.map((i: any) => ({
        id: i.id,
        ventaId: i.venta_id,
        productoId: i.producto_id,
        codigo: i.codigo,
        nombre: i.nombre,
        cantidad: Number(i.cantidad ?? 1),
        precioUnitario: Number(i.precio_unitario ?? 0),
        costoUnitario: Number(i.costo_unitario ?? 0),
        descuento: Number(i.descuento ?? 0),
        subtotal: Number(i.subtotal ?? 0),
      })),
      pagos: pagos.map((p: any) => ({
        id: p.id,
        metodo: p.metodo,
        monto: Number(p.monto ?? 0),
        referencia: p.referencia,
      })),
    };
  },

  async list(filters?: { fechaDesde?: string; fechaHasta?: string; cajeroId?: string | number; estado?: string; limit?: number; offset?: number; page?: number; search?: string }): Promise<Sale[]> {
    const db = await dbManager.getConnection();
    let query = `
      SELECT v.*, c.nombre as c_nombre, c.rut as c_rut 
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.fechaDesde) {
      query += " AND (CASE WHEN v.fecha LIKE '%Z' THEN date(datetime(v.fecha), 'localtime') ELSE date(v.fecha) END) >= date(?)";
      params.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query += " AND (CASE WHEN v.fecha LIKE '%Z' THEN date(datetime(v.fecha), 'localtime') ELSE date(v.fecha) END) <= date(?)";
      params.push(filters.fechaHasta);
    }
    if (filters?.cajeroId) {
      query += ' AND v.cajero_id = ?';
      params.push(Number(filters.cajeroId));
    }
    if (filters?.estado) {
      query += ' AND LOWER(v.estado) = LOWER(?)';
      params.push(filters.estado);
    }
    if (filters?.search) {
      const s = `%${filters.search}%`;
      const num = Number(filters.search);
      if (!isNaN(num) && num > 0) {
        query += ' AND (v.folio = ? OR v.cliente_nombre LIKE ? OR c.nombre LIKE ? OR v.metodo_pago_principal LIKE ? OR v.notas LIKE ?)';
        params.push(num, s, s, s, s);
      } else {
        query += ' AND (v.cliente_nombre LIKE ? OR c.nombre LIKE ? OR v.metodo_pago_principal LIKE ? OR v.notas LIKE ?)';
        params.push(s, s, s, s);
      }
    }

    query += ' ORDER BY v.fecha DESC, v.id DESC';

    if (filters?.limit) {
      const limit = Number(filters.limit);
      const page = Number(filters.page) || 1;
      const offset = filters.offset ?? ((page - 1) * limit);
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const rows = await db.select<any>(query, params);
    const sales: Sale[] = [];

    for (const r of rows) {
      const items = await db.select<any>('SELECT * FROM venta_items WHERE venta_id = ? ORDER BY id ASC', [r.id]);
      const pagos = await db.select<any>('SELECT * FROM venta_pagos WHERE venta_id = ? ORDER BY id ASC', [r.id]);

      const resolvedClienteNombre = r.c_nombre || r.cliente_nombre || (r.cliente_id ? 'Cliente' : null);

      sales.push({
        id: r.id,
        _id: String(r.id),
        folio: Number(r.folio) || r.id,
        numeroVenta: Number(r.folio) || r.id,
        numeroBoleta: r.numero_boleta || `BOL-${r.folio || r.id}`,
        fecha: r.fecha || getLocalDateISO(),
        cajeroId: r.cajero_id,
        cajeroNombre: r.cajero_nombre || 'Yasna',
        usuario: {
          id: r.cajero_id,
          nombre: r.cajero_nombre || 'Yasna',
          username: r.cajero_nombre || 'yasna',
        },
        cajaSesionId: r.caja_sesion_id,
        clienteId: r.cliente_id,
        clienteNombre: resolvedClienteNombre,
        cliente: r.cliente_id ? {
          id: r.cliente_id,
          _id: String(r.cliente_id),
          nombre: resolvedClienteNombre || 'Cliente',
          rut: r.c_rut || '',
        } : (r.cliente_nombre ? { nombre: r.cliente_nombre, rut: '' } : null),
        subtotal: Number(r.subtotal ?? 0),
        descuentoTotal: Number(r.descuento_total ?? 0),
        impuestoTotal: Number(r.impuesto_total ?? 0),
        total: Number(r.total ?? 0),
        montoRecibido: Number(r.monto_recibido ?? 0),
        vuelto: Number(r.vuelto ?? 0),
        metodoPago: (r.metodo_pago_principal || 'efectivo').toUpperCase(),
        metodoPagoPrincipal: r.metodo_pago_principal || 'efectivo',
        estado: r.estado || 'completada',
        motivoAnulacion: r.motivo_anulacion,
        notas: r.notas,
        sincronizado: Boolean(r.sincronizado),
        items: items.map(i => ({
          id: i.id,
          ventaId: i.venta_id,
          productoId: i.producto_id,
          codigo: i.codigo,
          nombre: i.nombre,
          cantidad: Number(i.cantidad ?? 1),
          precioUnitario: Number(i.precio_unitario ?? 0),
          costoUnitario: Number(i.costo_unitario ?? 0),
          descuento: Number(i.descuento ?? 0),
          subtotal: Number(i.subtotal ?? 0),
        })),
        pagos: pagos.map(p => ({
          id: p.id,
          metodo: p.metodo,
          monto: Number(p.monto ?? 0),
          referencia: p.referencia,
        })),
      });
    }

    return sales;
  },

  async create(saleData: Omit<Sale, 'id'>): Promise<Sale> {
    const db = await dbManager.getConnection();

    // 1. Generar folio consecutivo seguro
    let folio = saleData.folio;
    if (!folio) {
      const maxRows = await db.select<{ maxF: number }>('SELECT COALESCE(MAX(folio), 0) as maxF FROM ventas');
      folio = (maxRows[0]?.maxF || 0) + 1;
    }
    const numeroBoleta = saleData.numeroBoleta || `BOL-${folio}`;

    // Resolver nombre del cliente si viene id pero no nombre
    let clienteId = saleData.clienteId ? Number(saleData.clienteId) : null;
    let clienteNombre = saleData.clienteNombre || null;
    if (clienteId && !clienteNombre) {
      const cRows = await db.select<any>('SELECT nombre FROM clientes WHERE id = ?', [clienteId]);
      if (cRows.length > 0) clienteNombre = cRows[0].nombre;
    }

    const metodoPrincipal = (saleData.metodoPagoPrincipal || 'efectivo').toLowerCase();
    const fechaVenta = saleData.fecha && !saleData.fecha.endsWith('Z') ? saleData.fecha : getLocalDateISO();

    // 2. Insertar venta en SQLite
    const res = await db.execute(
      `INSERT INTO ventas (
        folio, numero_boleta, fecha, cajero_id, cajero_nombre,
        caja_sesion_id, cliente_id, cliente_nombre,
        subtotal, descuento_total, impuesto_total, total,
        monto_recibido, vuelto, metodo_pago_principal, estado, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(folio),
        numeroBoleta,
        fechaVenta,
        Number(saleData.cajeroId) || 1,
        saleData.cajeroNombre || 'Cajero',
        saleData.cajaSesionId ? Number(saleData.cajaSesionId) : null,
        clienteId,
        clienteNombre,
        Number(saleData.subtotal ?? saleData.total ?? 0),
        Number(saleData.descuentoTotal ?? 0),
        Number(saleData.impuestoTotal ?? 0),
        Number(saleData.total ?? 0),
        Number(saleData.montoRecibido ?? saleData.total ?? 0),
        Number(saleData.vuelto ?? 0),
        metodoPrincipal,
        saleData.estado || 'completada',
        saleData.notas || null,
      ]
    );

    const ventaId = res.lastInsertId;

    // 2.1 Si es VENTA FIADA, aumentar saldo deudor del cliente y registrar movimiento en cuenta corriente
    if ((metodoPrincipal === 'fiado' || saleData.pagos?.some(p => String(p.metodo).toLowerCase() === 'fiado')) && clienteId) {
      const montoFiado = saleData.pagos?.filter(p => String(p.metodo).toLowerCase() === 'fiado').reduce((s, p) => s + Number(p.monto), 0) || Number(saleData.total ?? 0);
      await db.execute(
        'UPDATE clientes SET saldo_deudor = saldo_deudor + ? WHERE id = ?',
        [montoFiado, clienteId]
      );
      const custRows = await db.select<any>('SELECT saldo_deudor FROM clientes WHERE id = ?', [clienteId]);
      const newSaldo = custRows[0]?.saldo_deudor ?? montoFiado;
      await db.execute(
        `INSERT INTO cliente_movimientos (
          cliente_id, tipo_movimiento, monto, saldo_resultante, observacion, venta_id, usuario_id, fecha
        ) VALUES (?, 'VENTA_FIADA', ?, ?, ?, ?, ?, ?)`,
        [
          clienteId,
          montoFiado,
          Number(newSaldo),
          `Venta Fiada #${folio}`,
          ventaId,
          Number(saleData.cajeroId) || 1,
          fechaVenta
        ]
      ).catch((e) => console.warn('[saleRepository] Error registrando cliente_movimientos venta fiada:', e));
    }

    // 3. Insertar ítems y descontar stock
    for (const item of (saleData.items || [])) {
      const prodId = Number(item.productoId);
      await db.execute(
        `INSERT INTO venta_items (
          venta_id, producto_id, codigo, nombre, cantidad,
          precio_unitario, costo_unitario, descuento, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ventaId,
          prodId || 1,
          item.codigo || '',
          item.nombre || 'Producto',
          Number(item.cantidad) || 1,
          Number(item.precioUnitario) || 0,
          Number(item.costoUnitario) || 0,
          Number(item.descuento) || 0,
          Number(item.subtotal) || ((Number(item.cantidad) || 1) * (Number(item.precioUnitario) || 0)),
        ]
      );

      // Descontar inventario
      if (prodId) {
        await db.execute(
          'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
          [Number(item.cantidad) || 1, prodId]
        );

        // Registrar movimiento kardex
        await db.execute(
          `INSERT INTO inventario_movimientos (
            producto_id, producto_nombre, tipo, cantidad,
            stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id
          ) VALUES (
            ?, ?, 'salida_venta', ?,
            (SELECT stock_actual + ? FROM productos WHERE id = ?),
            (SELECT stock_actual FROM productos WHERE id = ?),
            'Venta #' || ?, ?, ?
          )`,
          [
            prodId,
            item.nombre,
            Number(item.cantidad) || 1,
            Number(item.cantidad) || 1,
            prodId,
            prodId,
            Number(folio),
            ventaId,
            Number(saleData.cajeroId) || 1,
          ]
        ).catch((err) => {
          console.warn('[saleRepository] Aviso registrando movimiento kardex:', err);
        });
      }
    }

    // 4. Insertar pagos
    if (saleData.pagos && saleData.pagos.length > 0) {
      for (const pago of saleData.pagos) {
        await db.execute(
          'INSERT INTO venta_pagos (venta_id, metodo, monto, referencia) VALUES (?, ?, ?, ?)',
          [ventaId, pago.metodo, Number(pago.monto ?? 0), pago.referencia || null]
        );
      }
    } else {
      await db.execute(
        'INSERT INTO venta_pagos (venta_id, metodo, monto) VALUES (?, ?, ?)',
        [ventaId, saleData.metodoPagoPrincipal || 'efectivo', Number(saleData.total ?? 0)]
      );
    }

    // 5. Actualizar totales de la sesión de caja si está activa
    if (saleData.cajaSesionId) {
      const field = saleData.metodoPagoPrincipal === 'efectivo' 
        ? 'total_ventas_efectivo'
        : saleData.metodoPagoPrincipal === 'debito'
        ? 'total_ventas_debito'
        : saleData.metodoPagoPrincipal === 'credito'
        ? 'total_ventas_credito'
        : 'total_ventas_transferencia';

      await db.execute(
        `UPDATE caja_sesiones SET ${field} = ${field} + ? WHERE id = ?`,
        [Number(saleData.total ?? 0), Number(saleData.cajaSesionId)]
      ).catch(() => {});
    }

    const createdSale = await this.getById(ventaId);
    if (!createdSale) {
      throw new Error(`Error recuperando la venta recién creada con ID ${ventaId}`);
    }

    // Encolar automáticamente en sync_queue para sincronización online
    await syncService.enqueueChange('ventas', ventaId, 'INSERT', createdSale);

    return createdSale;
  },

  async getStats(filters?: { fechaDesde?: string; fechaHasta?: string; metodoPago?: string }): Promise<{
    totalVentas: number;
    montoTotal: number;
    totalEfectivo: number;
    totalDebito: number;
    totalTransferencia: number;
    totalFiado: number;
    costoTotal: number;
    utilidadTotal: number;
    margenPorcentaje: number;
    ventasAnuladas: number;
  }> {
    const db = await dbManager.getConnection();
    let querySales = `
      SELECT 
        COUNT(v.id) as total_ventas,
        COALESCE(SUM(v.total), 0) as monto_total,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago_principal) = 'efectivo' THEN v.total ELSE 0 END), 0) as total_efectivo,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago_principal) = 'debito' THEN v.total ELSE 0 END), 0) as total_debito,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago_principal) = 'transferencia' THEN v.total ELSE 0 END), 0) as total_transferencia,
        COALESCE(SUM(CASE WHEN LOWER(v.metodo_pago_principal) = 'fiado' THEN v.total ELSE 0 END), 0) as total_fiado
      FROM ventas v
      WHERE LOWER(v.estado) IN ('completada', 'confirmada')
    `;
    const paramsSales: any[] = [];
    if (filters?.fechaDesde) {
      querySales += " AND (CASE WHEN v.fecha LIKE '%Z' THEN date(datetime(v.fecha), 'localtime') ELSE date(v.fecha) END) >= date(?)";
      paramsSales.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      querySales += " AND (CASE WHEN v.fecha LIKE '%Z' THEN date(datetime(v.fecha), 'localtime') ELSE date(v.fecha) END) <= date(?)";
      paramsSales.push(filters.fechaHasta);
    }
    if (filters?.metodoPago) {
      querySales += " AND UPPER(v.metodo_pago_principal) = UPPER(?)";
      paramsSales.push(filters.metodoPago);
    }

    const salesRows = await db.select<any>(querySales, paramsSales);
    const r = salesRows[0] || {};
    const montoTotal = Number(r.monto_total || 0);

    // Calcular costo total de los productos vendidos en el periodo
    let queryCost = `
      SELECT COALESCE(SUM(vi.cantidad * COALESCE(vi.costo_unitario, 0)), 0) as costo_total
      FROM venta_items vi
      JOIN ventas v ON vi.venta_id = v.id
      WHERE LOWER(v.estado) IN ('completada', 'confirmada')
    `;
    const paramsCost: any[] = [];
    if (filters?.fechaDesde) {
      queryCost += " AND (CASE WHEN v.fecha LIKE '%Z' THEN date(datetime(v.fecha), 'localtime') ELSE date(v.fecha) END) >= date(?)";
      paramsCost.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      queryCost += " AND (CASE WHEN v.fecha LIKE '%Z' THEN date(datetime(v.fecha), 'localtime') ELSE date(v.fecha) END) <= date(?)";
      paramsCost.push(filters.fechaHasta);
    }
    if (filters?.metodoPago) {
      queryCost += " AND UPPER(v.metodo_pago_principal) = UPPER(?)";
      paramsCost.push(filters.metodoPago);
    }
    const costRows = await db.select<any>(queryCost, paramsCost);
    const costoTotal = Number(costRows[0]?.costo_total || 0);

    // Ventas anuladas
    let queryAnuladas = `
      SELECT COUNT(id) as anuladas
      FROM ventas
      WHERE LOWER(estado) = 'anulada'
    `;
    const paramsAnuladas: any[] = [];
    if (filters?.fechaDesde) {
      queryAnuladas += " AND (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END) >= date(?)";
      paramsAnuladas.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      queryAnuladas += " AND (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END) <= date(?)";
      paramsAnuladas.push(filters.fechaHasta);
    }
    const anuladasRows = await db.select<any>(queryAnuladas, paramsAnuladas);
    const ventasAnuladas = Number(anuladasRows[0]?.anuladas || 0);

    const utilidadTotal = Math.max(0, montoTotal - costoTotal);
    const margenPorcentaje = montoTotal > 0 ? Math.round((utilidadTotal / montoTotal) * 100) : 0;

    return {
      totalVentas: Number(r.total_ventas || 0),
      montoTotal,
      totalEfectivo: Number(r.total_efectivo || 0),
      totalDebito: Number(r.total_debito || 0),
      totalTransferencia: Number(r.total_transferencia || 0),
      totalFiado: Number(r.total_fiado || 0),
      costoTotal,
      utilidadTotal,
      margenPorcentaje,
      ventasAnuladas,
    };
  },

  async getPaymentBreakdown(filters?: { fechaDesde?: string; fechaHasta?: string; metodoPago?: string }): Promise<any[]> {
    const db = await dbManager.getConnection();
    let query = `
      SELECT 
        UPPER(COALESCE(metodo_pago_principal, 'EFECTIVO')) as metodo,
        COUNT(id) as cantidad,
        COALESCE(SUM(total), 0) as monto
      FROM ventas
      WHERE LOWER(estado) IN ('completada', 'confirmada')
    `;
    const params: any[] = [];
    if (filters?.fechaDesde) {
      query += " AND (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END) >= date(?)";
      params.push(filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      query += " AND (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END) <= date(?)";
      params.push(filters.fechaHasta);
    }
    if (filters?.metodoPago) {
      query += " AND UPPER(metodo_pago_principal) = UPPER(?)";
      params.push(filters.metodoPago);
    }
    query += " GROUP BY UPPER(COALESCE(metodo_pago_principal, 'EFECTIVO')) ORDER BY monto DESC";

    const rows = await db.select<any>(query, params);
    const labels: Record<string, string> = {
      EFECTIVO: 'Efectivo',
      DEBITO: 'Débito',
      TRANSFERENCIA: 'Transferencia',
      FIADO: 'Fiado',
    };

    return rows.map(r => ({
      metodo: labels[r.metodo] || r.metodo,
      metodoKey: r.metodo,
      cantidad: Number(r.cantidad || 0),
      monto: Number(r.monto || 0),
    }));
  },

  async anular(id: string | number, motivo: string = 'Anulación de venta'): Promise<boolean> {
    const db = await dbManager.getConnection();
    const ventaId = Number(id);
    const sale = await this.getById(ventaId);
    if (!sale) {
      throw new Error(`Venta con ID ${ventaId} no encontrada`);
    }
    if (String(sale.estado).toLowerCase() === 'anulada') {
      throw new Error(`La venta #${sale.folio} ya está anulada`);
    }

    await db.execute('BEGIN TRANSACTION');
    try {
      // 1. Cambiar estado a anulada
      await db.execute(
        'UPDATE ventas SET estado = ?, motivo_anulacion = ? WHERE id = ?',
        ['anulada', motivo, ventaId]
      );

      // 2. Devolver stock de cada producto
      const items = await db.select<any>('SELECT * FROM venta_items WHERE venta_id = ?', [ventaId]);
      for (const item of items) {
        const prodId = Number(item.producto_id);
        const qty = Number(item.cantidad) || 0;
        if (prodId && qty > 0) {
          await db.execute(
            'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
            [qty, prodId]
          );

          // Registrar movimiento en kardex
          await db.execute(
            `INSERT INTO inventario_movimientos (
              producto_id, producto_nombre, tipo, cantidad,
              stock_anterior, stock_nuevo, motivo, referencia_id, usuario_id
            ) VALUES (
              ?, ?, 'entrada_anulacion', ?,
              (SELECT stock_actual - ? FROM productos WHERE id = ?),
              (SELECT stock_actual FROM productos WHERE id = ?),
              'Anulación de Venta #' || ?, ?, ?
            )`,
            [
              prodId,
              item.nombre,
              qty,
              qty,
              prodId,
              prodId,
              Number(sale.folio || ventaId),
              ventaId,
              Number(sale.cajeroId) || 1
            ]
          ).catch((e) => console.warn('[saleRepository] Error registrando kardex anulación:', e));
        }
      }

      // 3. Si era venta fiada y tenía cliente asociado, devolver saldo deudor al cliente y registrar movimiento
      if (String(sale.metodoPagoPrincipal || '').toLowerCase() === 'fiado' && sale.clienteId) {
        const cId = Number(sale.clienteId);
        await db.execute(
          'UPDATE clientes SET saldo_deudor = MAX(0, saldo_deudor - ?) WHERE id = ?',
          [Number(sale.total ?? 0), cId]
        );
        const custRows = await db.select<any>('SELECT saldo_deudor FROM clientes WHERE id = ?', [cId]);
        const newSaldo = custRows[0]?.saldo_deudor ?? 0;
        await db.execute(
          `INSERT INTO cliente_movimientos (
            cliente_id, tipo_movimiento, monto, saldo_resultante, observacion, venta_id, usuario_id, fecha
          ) VALUES (?, 'ANULACION_VENTA', ?, ?, ?, ?, ?, ?)`,
          [
            cId,
            Number(sale.total ?? 0),
            Number(newSaldo),
            `Anulación de Venta #${sale.folio || ventaId}`,
            ventaId,
            Number(sale.cajeroId) || 1,
            getLocalDateISO()
          ]
        ).catch((e) => console.warn('[saleRepository] Error registrando reversión cliente_movimientos:', e));
      }

      // 4. Si hay sesión de caja activa vinculada, restar del total de la sesión
      if (sale.cajaSesionId) {
        const field = sale.metodoPagoPrincipal === 'efectivo' 
          ? 'total_ventas_efectivo'
          : sale.metodoPagoPrincipal === 'debito'
          ? 'total_ventas_debito'
          : sale.metodoPagoPrincipal === 'credito'
          ? 'total_ventas_credito'
          : 'total_ventas_transferencia';

        await db.execute(
          `UPDATE caja_sesiones SET ${field} = MAX(0, ${field} - ?) WHERE id = ?`,
          [Number(sale.total ?? 0), Number(sale.cajaSesionId)]
        ).catch(() => {});
      }

      await db.execute('COMMIT');

      // Encolar anulación para sincronización online
      const updatedSale = await this.getById(ventaId);
      if (updatedSale) {
        await syncService.enqueueChange('ventas', ventaId, 'UPDATE', updatedSale);
      }

      return true;
    } catch (err) {
      await db.execute('ROLLBACK').catch(() => {});
      throw err;
    }
  },

  async getStatsToday(): Promise<{ totalVentas: number; montoTotal: number; totalEfectivo: number; totalTarjeta: number; ventasAnuladas: number }> {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return this.getStats({
      fechaDesde: today,
      fechaHasta: today,
    });
  },

  async getTopProducts(limit: number = 5, fechaDesde?: string, fechaHasta?: string): Promise<any[]> {
    const db = await dbManager.getConnection();
    let query = `
      SELECT 
        vi.producto_id,
        vi.codigo,
        vi.nombre,
        SUM(vi.cantidad) as total_vendido,
        SUM(vi.subtotal) as total_ingresos
      FROM venta_items vi
      JOIN ventas v ON vi.venta_id = v.id
      WHERE LOWER(v.estado) IN ('completada', 'confirmada')
    `;
    const params: any[] = [];
    if (fechaDesde) {
      query += " AND (CASE WHEN v.fecha LIKE '%Z' THEN date(datetime(v.fecha), 'localtime') ELSE date(v.fecha) END) >= date(?)";
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      query += " AND (CASE WHEN v.fecha LIKE '%Z' THEN date(datetime(v.fecha), 'localtime') ELSE date(v.fecha) END) <= date(?)";
      params.push(fechaHasta);
    }
    query += ' GROUP BY vi.producto_id, vi.codigo, vi.nombre ORDER BY total_vendido DESC LIMIT ?';
    params.push(limit);

    const rows = await db.select<any>(query, params);
    return rows.map(r => ({
      _id: String(r.producto_id || r.codigo),
      id: r.producto_id,
      nombre: r.nombre,
      codigo: r.codigo,
      cantidad: Number(r.total_vendido || 0),
      totalVendido: Number(r.total_vendido || 0),
      totalRecaudado: Number(r.total_ingresos || 0),
    }));
  },

  async getSalesSeries(dias: number = 7): Promise<any[]> {
    const db = await dbManager.getConnection();
    const query = `
      SELECT 
        (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END) as fecha_dia,
        COUNT(id) as total_ventas,
        SUM(total) as monto_total
      FROM ventas
      WHERE LOWER(estado) IN ('completada', 'confirmada') 
        AND (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END) >= date('now', '-' || ? || ' days', 'localtime')
      GROUP BY (CASE WHEN fecha LIKE '%Z' THEN date(datetime(fecha), 'localtime') ELSE date(fecha) END)
      ORDER BY fecha_dia ASC
    `;
    const rows = await db.select<any>(query, [dias]);
    return rows.map(r => ({
      fecha: r.fecha_dia,
      ventas: Number(r.total_ventas || 0),
      total: Number(r.monto_total || 0),
    }));
  }
};
