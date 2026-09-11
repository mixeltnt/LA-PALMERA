import jwt from "jsonwebtoken";
import { query } from "../config/postgres.js";

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      mensaje: "Acceso denegado. Token no proporcionado.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "la_palmera_secret_key_2026";
    const decoded = jwt.verify(token, secret);

    const userRes = await query(
      "SELECT id, sqlite_id, username, nombre, apellido, rol, activo, email FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].activo) {
      return res.status(401).json({
        success: false,
        mensaje: "Token inválido o usuario inactivo.",
      });
    }

    req.usuario = userRes.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      mensaje: "Token no válido o expirado.",
    });
  }
}

export function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res
        .status(403)
        .json({ mensaje: "No autorizado para realizar esta acción." });
    }

    next();
  };
}