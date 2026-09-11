import { Router } from "express";
import { syncPostgresController } from "../controllers/syncPostgresController.js";
import { authApiKeyOrJwt } from "../middleware/authApiKey.js";

const router = Router();

// Middleware de seguridad en rutas de sincronización
router.use(authApiKeyOrJwt);

// GET /api/sync/status - Estado de la base de datos PostgreSQL online y métricas
router.get("/status", syncPostgresController.getStatus);

// GET /api/sync/pull - Descarga catálogos maestros y datos desde PostgreSQL
router.get("/pull", syncPostgresController.pullData);

// POST /api/sync/push - Sincroniza cambios offline desde SQLite hacia PostgreSQL
router.post("/push", syncPostgresController.pushData);

export default router;
