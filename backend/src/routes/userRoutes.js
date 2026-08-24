import { Router } from "express";
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
} from "../controllers/userController.js";
import { authMiddleware, autorizarRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware, autorizarRoles("admin"));

router.get("/", listarUsuarios);
router.post("/", crearUsuario);
router.put("/:id", actualizarUsuario);
router.patch("/:id/estado", cambiarEstadoUsuario);

export default router;