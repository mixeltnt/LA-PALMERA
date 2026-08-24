import { Router } from "express";
import {
  getProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  getProviderStats,
} from "../controllers/providerController.js";
import { authMiddleware, autorizarRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/stats", getProviderStats);
router.get(["/", ""], getProviders);
router.get("/:id", getProviderById);
router.post(["/", ""], autorizarRoles("admin", "encargada"), createProvider);
router.put("/:id", autorizarRoles("admin", "encargada"), updateProvider);
router.delete("/:id", autorizarRoles("admin", "encargada"), deleteProvider);

export default router;
