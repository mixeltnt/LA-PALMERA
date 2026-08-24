import { Router } from "express";
import {
  getCompras,
  getCompraById,
  createCompra,
  updateCompra,
  confirmarCompra,
  getCompraResumen,
} from "../controllers/compraController.js";
import { authMiddleware, autorizarRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/resumen", autorizarRoles("admin", "encargada"), getCompraResumen);
router.get("/", autorizarRoles("admin", "encargada"), getCompras);
router.get("/:id", autorizarRoles("admin", "encargada"), getCompraById);
router.post("/", autorizarRoles("admin", "encargada"), createCompra);
router.put("/:id", autorizarRoles("admin", "encargada"), updateCompra);
router.patch(
  "/:id/confirmar",
  autorizarRoles("admin", "encargada"),
  confirmarCompra,
);

export default router;
