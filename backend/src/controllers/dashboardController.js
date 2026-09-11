// Controlador de Dashboard para futuro Panel Web y Aplicación Móvil - La Palmera POS
import { query } from '../config/postgres.js';

export const dashboardController = {
  getResumen: async (req, res) => {
    try {
      const [hoyRes, mesRes, topProdsRes, stockBajoRes, ultimasVentasRes, deudasRes] = await Promise.all([
        // 1. Ventas de hoy
        query(`
          SELECT 
            COALESCE(SUM(total), 0) as total_hoy,
            COUNT(*) as cantidad_hoy,
            COALESCE(SUM(CASE WHEN metodo_pago_principal = 'efectivo' THEN total ELSE 0 END), 0) as efectivo_hoy,
            COALESCE(SUM(CASE WHEN metodo_pago_principal = 'debito' THEN total ELSE 0 END), 0) as debito_hoy,
            COALESCE(SUM(CASE WHEN metodo_pago_principal = 'transferencia' THEN total ELSE 0 END), 0) as transferencia_hoy,
            COALESCE(SUM(CASE WHEN metodo_pago_principal = 'fiado' THEN total ELSE 0 END), 0) as fiado_hoy
          FROM ventas 
          WHERE DATE(fecha) = CURRENT_DATE AND estado = 'completada'
        `),

        // 2. Ventas del mes actual
        query(`
          SELECT 
            COALESCE(SUM(total), 0) as total_mes,
            COUNT(*) as cantidad_mes
          FROM ventas 
          WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE) AND estado = 'completada'
        `),

        // 3. Top 5 productos más vendidos del mes
        query(`
          SELECT 
            vi.codigo,
            vi.nombre,
            SUM(vi.cantidad) as total_unidades,
            SUM(vi.subtotal) as total_recaudado
          FROM venta_items vi
          JOIN ventas v ON vi.venta_id = v.id
          WHERE v.estado = 'completada' AND DATE_TRUNC('month', v.fecha) = DATE_TRUNC('month', CURRENT_DATE)
          GROUP BY vi.codigo, vi.nombre
          ORDER BY total_unidades DESC
          LIMIT 5
        `),

        // 4. Productos con stock bajo (menor o igual al mínimo)
        query(`
          SELECT 
            id, codigo, nombre, stock_actual, stock_minimo, precio_venta
          FROM productos 
          WHERE activo = TRUE AND stock_actual <= stock_minimo
          ORDER BY stock_actual ASC
          LIMIT 10
        `),

        // 5. Últimas 10 ventas registradas
        query(`
          SELECT 
            id, sqlite_id, folio, numero_boleta, fecha, cliente_nombre, total,
            metodo_pago_principal as metodo_pago, estado, creado_en
          FROM ventas 
          ORDER BY fecha DESC, id DESC
          LIMIT 10
        `),

        // 6. Deudas de clientes
        query(`
          SELECT 
            COUNT(*) as clientes_deudores,
            COALESCE(SUM(saldo_deudor), 0) as total_deuda
          FROM clientes
          WHERE activo = TRUE AND saldo_deudor > 0
        `),
      ]);

      const hoyData = hoyRes.rows[0] || {};
      const mesData = mesRes.rows[0] || {};
      const deudaData = deudasRes?.rows?.[0] || {};

      const montoHoy = Number(hoyData.total_hoy || 0);
      const totalVentasHoy = Number(hoyData.cantidad_hoy || 0);
      const montoMes = Number(mesData.total_mes || 0);
      const totalVentasMes = Number(mesData.cantidad_mes || 0);
      const ticketPromedio = totalVentasHoy > 0 ? Math.round(montoHoy / totalVentasHoy) : (totalVentasMes > 0 ? Math.round(montoMes / totalVentasMes) : 0);

      return res.json({
        success: true,
        montoHoy,
        totalVentasHoy,
        montoMes,
        totalVentasMes,
        ticketPromedio,
        productosBajoStock: stockBajoRes.rows.length,
        clientesDeudores: Number(deudaData.clientes_deudores || 0),
        totalDeudaClientes: Number(deudaData.total_deuda || 0),
        ultimasVentas: ultimasVentasRes.rows,
        data: {
          hoy: {
            total: montoHoy,
            cantidad: totalVentasHoy,
            efectivo: Number(hoyData.efectivo_hoy || 0),
            debito: Number(hoyData.debito_hoy || 0),
            transferencia: Number(hoyData.transferencia_hoy || 0),
            fiado: Number(hoyData.fiado_hoy || 0),
          },
          mes: {
            total: montoMes,
            cantidad: totalVentasMes,
          },
          topProductos: topProdsRes.rows.map(r => ({
            codigo: r.codigo,
            nombre: r.nombre,
            unidades: Number(r.total_unidades || 0),
            total: Number(r.total_recaudado || 0),
          })),
          stockBajo: stockBajoRes.rows.map(r => ({
            id: r.id,
            codigo: r.codigo,
            nombre: r.nombre,
            stockActual: Number(r.stock_actual || 0),
            stockMinimo: Number(r.stock_minimo || 5),
            precioVenta: Number(r.precio_venta || 0),
          })),
          ultimasVentas: ultimasVentasRes.rows,
          actualizadoEn: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[dashboardController] Error en getResumen:', error);
      return res.status(500).json({
        success: false,
        mensaje: 'Error generando métricas de dashboard',
        error: error.message,
      });
    }
  },

  getVentasRecientes: async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const { rows } = await query(`
        SELECT 
          id, sqlite_id, folio, numero_boleta, fecha, cliente_nombre, total,
          metodo_pago_principal as metodo_pago, estado, creado_en
        FROM ventas 
        ORDER BY fecha DESC, id DESC
        LIMIT $1
      `, [limit]);

      return res.json(rows);
    } catch (error) {
      console.error('[dashboardController] Error en getVentasRecientes:', error);
      return res.status(500).json({
        success: false,
        mensaje: 'Error obteniendo ventas recientes',
        error: error.message,
      });
    }
  },
};

export default dashboardController;
