import { Router } from "express";
import {
  getVentas,
  getVentaById,
  createVenta,
  updateVenta,
  confirmarVenta,
  anularVenta,
} from "../controllers/ventaController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

function requerirRolPermitido(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res
        .status(403)
        .json({ mensaje: "No autorizado para realizar esta acción." });
    }

    next();
  };
}

router.use(authMiddleware);

router.get("/", getVentas);
router.get("/:id", getVentaById);
router.post("/", createVenta);
router.put("/:id", updateVenta);
router.patch("/:id/confirmar", requerirRolPermitido(["admin"]), confirmarVenta);
router.patch("/:id/anular", requerirRolPermitido(["admin"]), anularVenta);

export default router;
