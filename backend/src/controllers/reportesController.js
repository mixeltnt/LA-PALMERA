// Controlador de Reportes para panel web y móvil - La Palmera POS
import { query } from '../config/postgres.js';

export const reportesController = {
  // 1. Reporte de Ventas por Período
  getVentasPorPeriodo: async (req, res) => {
    try {
      const { desde, hasta, cajeroId, estado } = req.query;
      let sql = `
        SELECT 
          v.id, v.folio, v.numero_boleta, v.fecha, v.cajero_nombre, v.cliente_nombre,
          v.subtotal, v.descuento_total, v.impuesto_total, v.total,
          v.metodo_pago_principal, v.estado, v.notas
        FROM ventas v
        WHERE 1=1
      `;
      const params = [];

      if (desde) {
        params.push(desde);
        sql += ` AND DATE(v.fecha) >= $${params.length}`;
      }
      if (hasta) {
        params.push(hasta);
        sql += ` AND DATE(v.fecha) <= $${params.length}`;
      }
      if (cajeroId) {
        params.push(Number(cajeroId));
        sql += ` AND v.cajero_id = $${params.length}`;
      }
      if (estado) {
        params.push(estado);
        sql += ` AND v.estado = $${params.length}`;
      }

      sql += ` ORDER BY v.fecha DESC, v.id DESC LIMIT 500`;

      const ventasRes = await query(sql, params);

      // Resumen del período
      let sqlResumen = `
        SELECT 
          COUNT(*) as total_transacciones,
          COALESCE(SUM(total), 0) as total_monto,
          COALESCE(AVG(total), 0) as ticket_promedio,
          COALESCE(SUM(CASE WHEN metodo_pago_principal = 'efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
          COALESCE(SUM(CASE WHEN metodo_pago_principal = 'debito' THEN total ELSE 0 END), 0) as total_debito,
          COALESCE(SUM(CASE WHEN metodo_pago_principal = 'credito' THEN total ELSE 0 END), 0) as total_credito,
          COALESCE(SUM(CASE WHEN metodo_pago_principal = 'transferencia' THEN total ELSE 0 END), 0) as total_transferencia,
          COALESCE(SUM(CASE WHEN metodo_pago_principal = 'fiado' THEN total ELSE 0 END), 0) as total_fiado
        FROM ventas v
        WHERE v.estado = 'completada'
      `;
      const paramsResumen = [];
      if (desde) {
        paramsResumen.push(desde);
        sqlResumen += ` AND DATE(v.fecha) >= $${paramsResumen.length}`;
      }
      if (hasta) {
        paramsResumen.push(hasta);
        sqlResumen += ` AND DATE(v.fecha) <= $${paramsResumen.length}`;
      }

      const resumenRes = await query(sqlResumen, paramsResumen);

      return res.json({
        success: true,
        resumen: resumenRes.rows[0] || {},
        ventas: ventasRes.rows,
      });
    } catch (error) {
      console.error('[reportesController] Error en getVentasPorPeriodo:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // 2. Reporte de Productos Más Vendidos
  getProductosTop: async (req, res) => {
    try {
      const { desde, hasta, limit = 20 } = req.query;
      let sql = `
        SELECT 
          vi.codigo,
          vi.nombre,
          p.categoria_nombre,
          SUM(vi.cantidad) as total_unidades,
          SUM(vi.subtotal) as total_recaudado,
          COALESCE(AVG(vi.precio_unitario), 0) as precio_promedio
        FROM venta_items vi
        JOIN ventas v ON vi.venta_id = v.id
        LEFT JOIN productos p ON vi.codigo = p.codigo
        WHERE v.estado = 'completada'
      `;
      const params = [];

      if (desde) {
        params.push(desde);
        sql += ` AND DATE(v.fecha) >= $${params.length}`;
      }
      if (hasta) {
        params.push(hasta);
        sql += ` AND DATE(v.fecha) <= $${params.length}`;
      }

      params.push(Number(limit));
      sql += `
        GROUP BY vi.codigo, vi.nombre, p.categoria_nombre
        ORDER BY total_unidades DESC
        LIMIT $${params.length}
      `;

      const result = await query(sql, params);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // 3. Reporte de Inventario y Valorización
  getInventario: async (req, res) => {
    try {
      const sql = `
        SELECT 
          p.id, p.codigo, p.codigo_barras, p.nombre, p.marca, p.categoria_nombre,
          p.precio_venta, p.precio_costo, p.stock_actual, p.stock_minimo,
          (p.stock_actual * p.precio_costo) as valor_total_costo,
          (p.stock_actual * p.precio_venta) as valor_total_venta,
          p.activo
        FROM productos p
        ORDER BY p.nombre ASC
      `;
      const prodsRes = await query(sql);

      const resumen = await query(`
        SELECT 
          COUNT(*) as total_productos,
          COALESCE(SUM(stock_actual), 0) as unidades_totales,
          COALESCE(SUM(stock_actual * precio_costo), 0) as valorizacion_costo,
          COALESCE(SUM(stock_actual * precio_venta), 0) as valorizacion_venta,
          COUNT(CASE WHEN stock_actual <= stock_minimo THEN 1 END) as stock_critico_count
        FROM productos
        WHERE activo = TRUE
      `);

      return res.json({
        success: true,
        resumen: resumen.rows[0] || {},
        productos: prodsRes.rows,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // 4. Reporte de Compras a Proveedores
  getCompras: async (req, res) => {
    try {
      const { desde, hasta, proveedorId } = req.query;
      let sql = `
        SELECT 
          c.id, c.folio, c.numero_factura, c.proveedor_nombre, c.fecha,
          c.subtotal, c.impuesto_total, c.total, c.estado, c.usuario_nombre
        FROM compras c
        WHERE 1=1
      `;
      const params = [];

      if (desde) {
        params.push(desde);
        sql += ` AND DATE(c.fecha) >= $${params.length}`;
      }
      if (hasta) {
        params.push(hasta);
        sql += ` AND DATE(c.fecha) <= $${params.length}`;
      }
      if (proveedorId) {
        params.push(Number(proveedorId));
        sql += ` AND c.proveedor_id = $${params.length}`;
      }

      sql += ` ORDER BY c.fecha DESC, c.id DESC`;

      const result = await query(sql, params);
      return res.json({ success: true, compras: result.rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // 5. Reporte de Clientes, Fiados y Deudas
  getClientesYFiados: async (req, res) => {
    try {
      const clientesRes = await query(`
        SELECT 
          id, rut, nombre, telefono, email, direccion, ciudad,
          limite_credito, saldo_deudor, (limite_credito - saldo_deudor) as credito_disponible,
          activo
        FROM clientes
        ORDER BY saldo_deudor DESC, nombre ASC
      `);

      const resumen = await query(`
        SELECT 
          COUNT(*) as total_clientes,
          COALESCE(SUM(saldo_deudor), 0) as deuda_total_acumulada,
          COUNT(CASE WHEN saldo_deudor > 0 THEN 1 END) as clientes_con_deuda_count
        FROM clientes
        WHERE activo = TRUE
      `);

      return res.json({
        success: true,
        resumen: resumen.rows[0] || {},
        clientes: clientesRes.rows,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // 6. Reporte de Caja y Turnos
  getCaja: async (req, res) => {
    try {
      const sesionesRes = await query(`
        SELECT 
          cs.*,
          (SELECT COUNT(*) FROM caja_movimientos cm WHERE cm.caja_sesion_id = cs.id) as total_movimientos
        FROM caja_sesiones cs
        ORDER BY cs.fecha_apertura DESC
        LIMIT 50
      `);

      return res.json({ success: true, sesiones: sesionesRes.rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};

export default reportesController;
