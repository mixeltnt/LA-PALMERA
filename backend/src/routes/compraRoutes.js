import { Router } from "express";
import {
  getCompras,
  getCompraById,
  createCompra,
  updateCompra,
  confirmarCompra,
} from "../controllers/compraController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getCompras);
router.get("/:id", getCompraById);
router.post("/", createCompra);
router.put("/:id", updateCompra);
router.patch("/:id/confirmar", confirmarCompra);

export default router;
