import { Router } from "express";
import { reportesController } from "../controllers/reportesController.js";
import { authApiKeyOrJwt } from "../middleware/authApiKey.js";

const router = Router();

router.use(authApiKeyOrJwt);

// GET /api/reportes/ventas - Ventas por período y métodos de pago
router.get("/ventas", reportesController.getVentasPorPeriodo);

// GET /api/reportes/productos-top - Productos más vendidos
router.get("/productos-top", reportesController.getProductosTop);

// GET /api/reportes/inventario - Stock actual y valorización
router.get("/inventario", reportesController.getInventario);

// GET /api/reportes/compras - Compras por período y proveedor
router.get("/compras", reportesController.getCompras);

// GET /api/reportes/clientes - Clientes, saldos deudores y fiados
router.get("/clientes", reportesController.getClientesYFiados);

// GET /api/reportes/caja - Sesiones y movimientos de caja
router.get("/caja", reportesController.getCaja);

export default router;
