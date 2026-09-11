// Controlador Administrativo para Panel Web - La Palmera POS v23
// Consulta exclusivamente la réplica remota PostgreSQL Neon Cloud (Solo Lectura)
import { query } from '../config/postgres.js';

export const adminController = {
  // 1. Listado paginado de ventas con filtros avanzados
  getVentasPaginadas: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const { folio, cliente, desde, hasta, estado, cajeroNombre, metodoPago } = req.query;

      let whereConditions = ['1=1'];
      const params = [];

      if (folio) {
        params.push(parseInt(folio, 10));
        whereConditions.push(`v.folio = $${params.length}`);
      }

      if (cliente) {
        params.push(`%${cliente.trim()}%`);
        whereConditions.push(`v.cliente_nombre ILIKE $${params.length}`);
      }

      if (desde) {
        params.push(desde);
        whereConditions.push(`DATE(v.fecha) >= $${params.length}`);
      }

      if (hasta) {
        params.push(hasta);
        whereConditions.push(`DATE(v.fecha) <= $${params.length}`);
      }

      if (estado) {
        params.push(estado.trim());
        whereConditions.push(`v.estado = $${params.length}`);
      }

      if (cajeroNombre) {
        params.push(`%${cajeroNombre.trim()}%`);
        whereConditions.push(`v.cajero_nombre ILIKE $${params.length}`);
      }

      if (metodoPago) {
        params.push(metodoPago.trim());
        whereConditions.push(`v.metodo_pago_principal = $${params.length}`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Contar total de registros
      const countRes = await query(`SELECT COUNT(*) as total FROM ventas v WHERE ${whereClause}`, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);
      const totalPages = Math.ceil(total / limit) || 1;

      // Consultar página de registros
      const dataParams = [...params, limit, offset];
      const dataRes = await query(`
        SELECT 
          v.id, v.sqlite_id, v.folio, v.numero_boleta, v.fecha,
          v.cajero_id, v.cajero_nombre, v.cliente_id, v.cliente_nombre,
          v.subtotal, v.descuento_total, v.impuesto_total, v.total,
          v.monto_recibido, v.vuelto, v.metodo_pago_principal, v.estado,
          v.motivo_anulacion, v.notas, v.sincronizado_en, v.creado_en
        FROM ventas v
        WHERE ${whereClause}
        ORDER BY v.fecha DESC, v.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, dataParams);

      return res.json({
        success: true,
        data: dataRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('[adminController] Error en getVentasPaginadas:', error);
      return res.status(500).json({ success: false, message: 'Error consultando ventas', error: error.message });
    }
  },

  // 2. Detalle completo de una venta (Cabecera + Items + Pagos)
  getVentaDetalleById: async (req, res) => {
    try {
      const idOrFolio = parseInt(req.params.id, 10);
      if (isNaN(idOrFolio)) {
        return res.status(400).json({ success: false, message: 'ID o Folio de venta inválido' });
      }

      const ventaRes = await query(
        `SELECT * FROM ventas WHERE id = $1 OR folio = $1 LIMIT 1`,
        [idOrFolio]
      );

      if (ventaRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Venta no encontrada en la base de datos' });
      }

      const venta = ventaRes.rows[0];

      // Consultar items y pagos en paralelo
      const [itemsRes, pagosRes] = await Promise.all([
        query(
          `SELECT id, sqlite_id, producto_id, codigo, nombre, cantidad, precio_unitario, costo_unitario, descuento, subtotal 
           FROM venta_items WHERE venta_id = $1 ORDER BY id ASC`,
          [venta.id]
        ),
        query(
          `SELECT id, sqlite_id, metodo, monto, referencia 
           FROM venta_pagos WHERE venta_id = $1 ORDER BY id ASC`,
          [venta.id]
        ),
      ]);

      return res.json({
        success: true,
        data: {
          ...venta,
          items: itemsRes.rows,
          pagos: pagosRes.rows,
        },
      });
    } catch (error) {
      console.error('[adminController] Error en getVentaDetalleById:', error);
      return res.status(500).json({ success: false, message: 'Error consultando detalle de venta', error: error.message });
    }
  },

  // 3. Listado paginado de productos con stock, categorías y márgenes
  getProductosPaginados: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const { search, categoriaId, activo, stockBajo } = req.query;

      let whereConditions = ['1=1'];
      const params = [];

      if (search) {
        params.push(`%${search.trim()}%`);
        whereConditions.push(`(p.nombre ILIKE $${params.length} OR p.codigo ILIKE $${params.length} OR p.codigo_barras ILIKE $${params.length})`);
      }

      if (categoriaId) {
        params.push(parseInt(categoriaId, 10));
        whereConditions.push(`p.categoria_id = $${params.length}`);
      }

      if (activo !== undefined && activo !== '') {
        params.push(activo === 'true' || activo === '1');
        whereConditions.push(`p.activo = $${params.length}`);
      }

      if (stockBajo === 'true' || stockBajo === '1') {
        whereConditions.push(`p.stock_actual <= p.stock_minimo`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Contar total de registros
      const countRes = await query(`SELECT COUNT(*) as total FROM productos p WHERE ${whereClause}`, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);
      const totalPages = Math.ceil(total / limit) || 1;

      // Consultar productos con margen calculado
      const dataParams = [...params, limit, offset];
      const dataRes = await query(`
        SELECT 
          p.id, p.sqlite_id, p.codigo, p.codigo_barras, p.nombre, p.descripcion, p.marca,
          p.categoria_id, p.categoria_nombre, p.proveedor_id, p.proveedor_nombre,
          p.precio_venta, p.precio_costo, p.stock_actual, p.stock_minimo,
          p.unidad_medida, p.permite_decimales, p.activo, p.imagen_url, p.aplica_iva,
          p.creado_en, p.actualizado_en,
          ROUND((p.precio_venta - p.precio_costo), 2) as ganancia_unitaria,
          CASE 
            WHEN p.precio_costo > 0 THEN ROUND(((p.precio_venta - p.precio_costo) / p.precio_costo * 100), 2)
            ELSE 0 
          END as margen_porcentaje
        FROM productos p
        WHERE ${whereClause}
        ORDER BY p.nombre ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, dataParams);

      return res.json({
        success: true,
        data: dataRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('[adminController] Error en getProductosPaginados:', error);
      return res.status(500).json({ success: false, message: 'Error consultando productos', error: error.message });
    }
  },

  // 4. Listado de categorías con total de productos asociados
  getCategorias: async (req, res) => {
    try {
      const resCategorias = await query(`
        SELECT 
          c.id, c.sqlite_id, c.nombre, c.descripcion, c.activo, c.color, c.icono, c.orden, c.creado_en,
          COALESCE((SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id AND p.activo = TRUE), 0) as total_productos
        FROM categorias c
        ORDER BY c.orden ASC, c.nombre ASC
      `);

      return res.json({
        success: true,
        data: resCategorias.rows,
      });
    } catch (error) {
      console.error('[adminController] Error en getCategorias:', error);
      return res.status(500).json({ success: false, message: 'Error consultando categorías', error: error.message });
    }
  },

  // 5. Listado paginado de clientes con saldos deudores
  getClientesPaginados: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const { search, activo, conDeuda } = req.query;

      let whereConditions = ['1=1'];
      const params = [];

      if (search) {
        params.push(`%${search.trim()}%`);
        whereConditions.push(`(c.nombre ILIKE $${params.length} OR c.rut ILIKE $${params.length} OR c.telefono ILIKE $${params.length})`);
      }

      if (activo !== undefined && activo !== '') {
        params.push(activo === 'true' || activo === '1');
        whereConditions.push(`c.activo = $${params.length}`);
      }

      if (conDeuda === 'true' || conDeuda === '1') {
        whereConditions.push(`c.saldo_deudor > 0`);
      }

      const whereClause = whereConditions.join(' AND ');

      // Contar total
      const countRes = await query(`SELECT COUNT(*) as total FROM clientes c WHERE ${whereClause}`, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);
      const totalPages = Math.ceil(total / limit) || 1;

      // Consultar clientes
      const dataParams = [...params, limit, offset];
      const dataRes = await query(`
        SELECT 
          c.id, c.sqlite_id, c.rut, c.nombre, c.telefono, c.email, c.direccion, c.ciudad,
          c.limite_credito, c.saldo_deudor, c.activo, c.creado_en
        FROM clientes c
        WHERE ${whereClause}
        ORDER BY c.nombre ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, dataParams);

      return res.json({
        success: true,
        data: dataRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('[adminController] Error en getClientesPaginados:', error);
      return res.status(500).json({ success: false, message: 'Error consultando clientes', error: error.message });
    }
  },

  // 6. Historial de movimientos de cuenta corriente / fiados de un cliente
  getClienteMovimientosById: async (req, res) => {
    try {
      const clienteId = parseInt(req.params.id, 10);
      if (isNaN(clienteId)) {
        return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
      }

      const movRes = await query(`
        SELECT 
          cm.id, cm.sqlite_id, cm.cliente_id, cm.tipo_movimiento, cm.monto,
          cm.saldo_resultante, cm.observacion, cm.venta_id, cm.usuario_id, cm.estado, cm.fecha
        FROM cliente_movimientos cm
        WHERE cm.cliente_id = $1
        ORDER BY cm.fecha DESC, cm.id DESC
      `, [clienteId]);

      return res.json({
        success: true,
        data: movRes.rows,
      });
    } catch (error) {
      console.error('[adminController] Error en getClienteMovimientosById:', error);
      return res.status(500).json({ success: false, message: 'Error consultando movimientos del cliente', error: error.message });
    }
  },

  // 7. Listado paginado de sesiones de caja (Turnos de trabajo)
  getCajaSesiones: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const { estado, desde, hasta } = req.query;

      let whereConditions = ['1=1'];
      const params = [];

      if (estado) {
        params.push(estado.trim());
        whereConditions.push(`cs.estado = $${params.length}`);
      }

      if (desde) {
        params.push(desde);
        whereConditions.push(`DATE(cs.fecha_apertura) >= $${params.length}`);
      }

      if (hasta) {
        params.push(hasta);
        whereConditions.push(`DATE(cs.fecha_apertura) <= $${params.length}`);
      }

      const whereClause = whereConditions.join(' AND ');

      const countRes = await query(`SELECT COUNT(*) as total FROM caja_sesiones cs WHERE ${whereClause}`, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);
      const totalPages = Math.ceil(total / limit) || 1;

      const dataParams = [...params, limit, offset];
      const dataRes = await query(`
        SELECT 
          cs.id, cs.sqlite_id, cs.usuario_id, cs.usuario_nombre, cs.fecha_apertura,
          cs.monto_inicial, cs.fecha_cierre, cs.monto_esperado_efectivo, cs.monto_real_efectivo,
          cs.diferencia, cs.total_ventas_efectivo, cs.total_ventas_debito, cs.total_ventas_credito,
          cs.total_ventas_transferencia, cs.total_ingresos_extra, cs.total_egresos_extra,
          cs.estado, cs.observaciones
        FROM caja_sesiones cs
        WHERE ${whereClause}
        ORDER BY cs.fecha_apertura DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, dataParams);

      return res.json({
        success: true,
        data: dataRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('[adminController] Error en getCajaSesiones:', error);
      return res.status(500).json({ success: false, message: 'Error consultando sesiones de caja', error: error.message });
    }
  },

  // 8. Movimientos de ingreso/egreso asociados a una sesión de caja
  getCajaMovimientosById: async (req, res) => {
    try {
      const sesionId = parseInt(req.params.id, 10);
      if (isNaN(sesionId)) {
        return res.status(400).json({ success: false, message: 'ID de sesión de caja inválido' });
      }

      const movsRes = await query(`
        SELECT 
          cm.id, cm.sqlite_id, cm.caja_sesion_id, cm.tipo, cm.monto, cm.concepto,
          cm.fecha, cm.usuario_id, cm.usuario_nombre
        FROM caja_movimientos cm
        WHERE cm.caja_sesion_id = $1
        ORDER BY cm.fecha ASC, cm.id ASC
      `, [sesionId]);

      return res.json({
        success: true,
        data: movsRes.rows,
      });
    } catch (error) {
      console.error('[adminController] Error en getCajaMovimientosById:', error);
      return res.status(500).json({ success: false, message: 'Error consultando movimientos de caja', error: error.message });
    }
  },
};

export default adminController;
