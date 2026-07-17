import jwt from "jsonwebtoken";
import User from "../models/User.js";

function generarToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "8h" });
}

export async function registrarUsuario(req, res) {
  try {
    const { nombre, usuario, password, rol } = req.body;

    const existe = await User.findOne({ usuario });
    if (existe) {
      return res.status(400).json({ mensaje: "El usuario ya existe." });
    }

    const user = new User({ nombre, usuario, password, rol });
    await user.save();

    const token = generarToken(user._id);

    res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      token,
      usuario: user,
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al registrar usuario.", error: error.message });
  }
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
    res.status(500).json({ mensaje: "Error al iniciar sesión.", error: error.message });
  }
}

export async function obtenerPerfil(req, res) {
  res.json(req.usuario);
}
