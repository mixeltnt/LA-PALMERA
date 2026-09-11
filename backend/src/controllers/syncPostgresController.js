// Controlador de Sincronización PostgreSQL para La Palmera POS
import { syncPostgresService } from '../services/syncPostgresService.js';

export const syncPostgresController = {
  // 1. Recepción y procesamiento de cambios pendientes desde SQLite
  pushData: async (req, res) => {
    try {
      const items = req.body.items || req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          mensaje: 'El cuerpo de la solicitud debe contener un arreglo "items".',
        });
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const result = await syncPostgresService.processPushBatch(items, clientIp);

      return res.json(result);
    } catch (error) {
      console.error('[syncPostgresController] Error en pushData:', error);
      return res.status(500).json({
        success: false,
        mensaje: 'Error interno procesando sincronización',
        error: error.message,
      });
    }
  },

  // 2. Descarga de datos maestros e históricos desde PostgreSQL
  pullData: async (req, res) => {
    try {
      const result = await syncPostgresService.pullData();
      return res.json(result);
    } catch (error) {
      console.error('[syncPostgresController] Error en pullData:', error);
      return res.status(500).json({
        success: false,
        mensaje: 'Error descargando datos maestros desde PostgreSQL',
        error: error.message,
      });
    }
  },

  // 3. Estado de salud y métricas de la base de datos remota
  getStatus: async (req, res) => {
    try {
      const result = await syncPostgresService.getStatus();
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        online: false,
        error: error.message,
      });
    }
  },
};

export default syncPostgresController;
