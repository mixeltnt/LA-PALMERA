import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController.js";
import { authApiKeyOrJwt } from "../middleware/authApiKey.js";

const router = Router();

router.use(authApiKeyOrJwt);

// GET /api/dashboard/resumen
router.get("/resumen", dashboardController.getResumen);

export default router;
