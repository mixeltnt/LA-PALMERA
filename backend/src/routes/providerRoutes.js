import { Router } from "express";
import {
  getProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  getProviderStats,
} from "../controllers/providerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/stats", getProviderStats);
router.get(["/", ""], getProviders);
router.get("/:id", getProviderById);
router.post(["/", ""], createProvider);
router.put("/:id", updateProvider);
router.delete("/:id", deleteProvider);

export default router;
