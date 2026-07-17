import { Router } from "express";
import { registrarUsuario, login, obtenerPerfil } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registrarUsuario);
router.post("/login", login);
router.get("/profile", authMiddleware, obtenerPerfil);

export default router;
