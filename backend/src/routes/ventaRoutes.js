import { Router } from "express";
import {
  getVentas,
  getVentaById,
  createVenta,
  updateVenta,
  confirmarVenta,
  anularVenta,
  getEstadisticasVentas,
  getProductosMasVendidos,
  getSerieVentas,
} from "../controllers/ventaController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Venta from "../models/ventaModel.js";

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

function esGestion(usuario) {
  return usuario && ["admin", "encargada"].includes(usuario.rol);
}

async function verificarPropiedadVenta(req, res, next) {
  if (esGestion(req.usuario)) return next();

  try {
    const venta = await Venta.findById(req.params.id).select("usuario");
    if (!venta) return next();

    if (String(venta.usuario) !== String(req.usuario._id)) {
      return res
        .status(403)
        .json({ mensaje: "No autorizado para realizar esta acción." });
    }

    next();
  } catch (error) {
    return res
      .status(500)
      .json({ mensaje: "Error al verificar la venta." });
  }
}

router.use(authMiddleware);

router.get(
  "/estadisticas",
  requerirRolPermitido(["admin", "encargada"]),
  getEstadisticasVentas,
);
router.get(
  "/productos-mas-vendidos",
  requerirRolPermitido(["admin", "encargada"]),
  getProductosMasVendidos,
);
router.get(
  "/serie",
  requerirRolPermitido(["admin", "encargada"]),
  getSerieVentas,
);
router.get("/", requerirRolPermitido(["admin", "encargada"]), getVentas);
router.get("/:id", requerirRolPermitido(["admin", "encargada"]), getVentaById);
router.post("/", createVenta);
router.put("/:id", verificarPropiedadVenta, updateVenta);
router.patch("/:id/confirmar", verificarPropiedadVenta, confirmarVenta);
router.patch("/:id/anular", requerirRolPermitido(["admin"]), anularVenta);

export default router;
