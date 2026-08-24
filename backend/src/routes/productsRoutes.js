import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
} from "../controllers/productsController.js";
import { authMiddleware, autorizarRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/stats", getProductStats);
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", autorizarRoles("admin", "encargada"), createProduct);
router.put("/:id", autorizarRoles("admin", "encargada"), updateProduct);
router.delete("/:id", autorizarRoles("admin", "encargada"), deleteProduct);

export default router;
