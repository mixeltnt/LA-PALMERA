// Rutas Administrativas para Panel Web - La Palmera POS v23
// Protegidas exclusivamente con autenticación JWT de Administrador
import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { authMiddleware, autorizarRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Todas las rutas administrativas requieren token JWT válido
router.use(authMiddleware);

// 1. Módulo de Ventas (Solo Lectura)
router.get('/ventas', adminController.getVentasPaginadas);
router.get('/ventas/:id', adminController.getVentaDetalleById);

// 2. Módulo de Productos y Categorías (Solo Lectura)
router.get('/productos', adminController.getProductosPaginados);
router.get('/categorias', adminController.getCategorias);

// 3. Módulo de Clientes y Cuentas Corrientes (Solo Lectura)
router.get('/clientes', adminController.getClientesPaginados);
router.get('/clientes/:id/movimientos', adminController.getClienteMovimientosById);

// 4. Módulo de Sesiones y Movimientos de Caja (Solo Lectura)
router.get('/caja/sesiones', adminController.getCajaSesiones);
router.get('/caja/sesiones/:id/movimientos', adminController.getCajaMovimientosById);

export default router;
