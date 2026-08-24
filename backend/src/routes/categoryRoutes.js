import { Router } from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
} from "../controllers/categoryController.js";
import { authMiddleware, autorizarRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/stats", getCategoryStats);
router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", autorizarRoles("admin", "encargada"), createCategory);
router.put("/:id", autorizarRoles("admin", "encargada"), updateCategory);
router.delete("/:id", autorizarRoles("admin", "encargada"), deleteCategory);

export default router;
