import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, obtenerPerfil } from "../controllers/authController.js";
import {
  authMiddleware,
  autorizarRoles,
} from "../middleware/authMiddleware.js";
import { crearUsuario } from "../controllers/userController.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensaje:
      "Demasiados intentos de inicio de sesión. Inténtalo nuevamente en unos minutos.",
  },
});

router.post("/login", loginLimiter, login);
router.get("/profile", authMiddleware, obtenerPerfil);
router.post("/register", authMiddleware, autorizarRoles("admin"), crearUsuario);

export default router;