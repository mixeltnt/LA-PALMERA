import jwt from "jsonwebtoken";
import User from "../models/User.js";

function generarToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "8h" });
}

export async function login(req, res) {
  try {
    const { usuario, password } = req.body;

    const user = await User.findOne({ usuario, activo: true });
    if (!user) {
      return res.status(401).json({ mensaje: "Credenciales inválidas." });
    }

    const passwordCorrecta = await user.compararPassword(password);
    if (!passwordCorrecta) {
      return res.status(401).json({ mensaje: "Credenciales inválidas." });
    }

    const token = generarToken(user._id);

    res.json({
      mensaje: "Inicio de sesión exitoso.",
      token,
      usuario: user,
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
}

export async function obtenerPerfil(req, res) {
  res.json(req.usuario);
}
