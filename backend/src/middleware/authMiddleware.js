import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Acceso denegado. Token no proporcionado." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.activo) {
      return res.status(401).json({ mensaje: "Token inválido o usuario inactivo." });
    }

    req.usuario = user;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: "Token no válido." });
  }
}
