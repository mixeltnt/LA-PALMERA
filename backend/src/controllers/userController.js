import User from "../models/User.js";

export async function listarUsuarios(req, res) {
  try {
    const { search, activo } = req.query;

    const filtro = {};
    if (search) {
      filtro.$or = [
        { nombre: { $regex: search, $options: "i" } },
        { usuario: { $regex: search, $options: "i" } },
      ];
    }
    if (activo !== undefined) {
      filtro.activo = activo === "true";
    }

    const usuarios = await User.find(filtro)
      .select("-password")
      .sort({ activo: -1, nombre: 1 });

    res.json({ usuarios });
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor." });
  }
}

export async function crearUsuario(req, res) {
  try {
    const { nombre, usuario, password, rol } = req.body;

    if (!nombre || !usuario || !password) {
      return res.status(400).json({
        mensaje: "El nombre, usuario y contraseña son obligatorios.",
      });
    }

    if (!["admin", "encargada", "vendedor"].includes(rol)) {
      return res.status(400).json({ mensaje: "El rol no es válido." });
    }

    const existe = await User.findOne({ usuario });
    if (existe) {
      return res.status(400).json({ mensaje: "El usuario ya existe." });
    }

    const user = await User.create({ nombre, usuario, password, rol });

    res.status(201).json({
      mensaje: "Usuario creado correctamente.",
      usuario: user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor." });
  }
}

export async function actualizarUsuario(req, res) {
  try {
    const { nombre, password, rol, activo } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    if (rol !== undefined && !["admin", "encargada", "vendedor"].includes(rol)) {
      return res.status(400).json({ mensaje: "El rol no es válido." });
    }

    if (user.rol === "admin" && rol !== undefined && rol !== "admin") {
      const admins = await User.countDocuments({ rol: "admin", activo: true });
      if (admins <= 1) {
        return res.status(400).json({
          mensaje: "Debe existir al menos un administrador activo.",
        });
      }
    }

    if (nombre !== undefined) user.nombre = nombre;
    if (rol !== undefined) user.rol = rol;
    if (activo !== undefined) user.activo = activo;
    if (password) user.password = password;

    await user.save();

    res.json({
      mensaje: "Usuario actualizado correctamente.",
      usuario: user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor." });
  }
}

export async function cambiarEstadoUsuario(req, res) {
  try {
    const { activo } = req.body;

    if (typeof activo !== "boolean") {
      return res.status(400).json({
        mensaje: "El campo 'activo' debe ser verdadero o falso.",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    if (!activo && user.rol === "admin") {
      const admins = await User.countDocuments({ rol: "admin", activo: true });
      if (admins <= 1) {
        return res.status(400).json({
          mensaje: "Debe existir al menos un administrador activo.",
        });
      }
    }

    if (user._id.toString() === req.usuario._id.toString() && !activo) {
      return res
        .status(400)
        .json({ mensaje: "No puedes desactivar tu propio usuario." });
    }

    user.activo = activo;
    await user.save();

    res.json({
      mensaje: activo
        ? "Usuario activado correctamente."
        : "Usuario desactivado correctamente.",
      usuario: user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error interno del servidor." });
  }
}