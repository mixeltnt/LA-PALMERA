import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  console.log("\n========== AUTH MIDDLEWARE ==========");
  console.log("Authorization Header:", authHeader);
  console.log("JWT_SECRET:", process.env.JWT_SECRET);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ No llegó el token.");

    return res.status(401).json({
      mensaje: "Acceso denegado. Token no proporcionado.",
    });
  }

  const token = authHeader.split(" ")[1];

  console.log("Token recibido:");
  console.log(token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("✅ Token decodificado:");
    console.log(decoded);

    const user = await User.findById(decoded.id).select("-password");

    console.log("Usuario encontrado:");
    console.log(user);

    if (!user || !user.activo) {
      console.log("❌ Usuario inexistente o inactivo.");

      return res.status(401).json({
        mensaje: "Token inválido o usuario inactivo.",
      });
    }

    req.usuario = user;
    next();
  } catch (error) {
    console.log("❌ ERROR JWT");
    console.log(error.name);
    console.log(error.message);

    return res.status(401).json({
      mensaje: "Token no válido.",
      error: error.message,
    });
  }
}
