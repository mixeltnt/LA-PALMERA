// Controlador de Autenticación para Panel Web Administrativo - La Palmera POS v23
// Autentica contra la tabla 'usuarios' de PostgreSQL Neon Cloud emitiendo tokens JWT
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "../config/postgres.js";

function generarToken(user) {
  const secret = process.env.JWT_SECRET || "la_palmera_secret_key_2026";
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol,
    },
    secret,
    { expiresIn: "8h" }
  );
}

// Inicialización automática de usuarios administrativos base en PostgreSQL si la tabla está vacía
export async function seedUsuariosPostgresIfEmpty() {
  try {
    const checkCount = await query("SELECT count(*) as total FROM usuarios");
    if (parseInt(checkCount.rows[0]?.total || "0", 10) === 0) {
      console.log("[Auth] Inicializando usuarios administrativos en PostgreSQL Neon...");
      
      const passYasna = process.env.YASNA_PASSWORD || "Carlos1941";
      const passKarla = process.env.KARLA_PASSWORD || "Karla2004";
      const passVentas = process.env.VENDEDOR_PASSWORD || "Palmera2026";

      const hashYasna = await bcrypt.hash(passYasna, 10);
      const hashKarla = await bcrypt.hash(passKarla, 10);
      const hashVentas = await bcrypt.hash(passVentas, 10);

      await query(`
        INSERT INTO usuarios (sqlite_id, username, password_hash, nombre, rol, activo)
        VALUES 
          (1, 'yasna', $1, 'Yasna', 'admin', TRUE),
          (2, 'karla', $2, 'Karla', 'encargada', TRUE),
          (3, 'ventas', $3, 'Vendedor', 'cajero', TRUE)
        ON CONFLICT (username) DO NOTHING
      `, [hashYasna, hashKarla, hashVentas]);

      console.log("[Auth] ✅ Usuarios administrativos ('yasna', 'karla', 'ventas') inicializados en PostgreSQL.");
    }
  } catch (err) {
    console.warn("[Auth] Aviso verificando usuarios en PostgreSQL:", err.message);
  }
}

export async function login(req, res) {
  try {
    const { usuario, username, password } = req.body;
    const loginUser = (username || usuario || "").trim().toLowerCase();

    if (!loginUser || !password) {
      return res.status(400).json({
        success: false,
        mensaje: "Debe ingresar usuario y contraseña.",
      });
    }

    // Asegurar que existan los usuarios base en PostgreSQL
    await seedUsuariosPostgresIfEmpty();

    const userRes = await query(
      "SELECT id, sqlite_id, username, password_hash, nombre, apellido, rol, activo, email FROM usuarios WHERE LOWER(username) = $1 AND activo = TRUE LIMIT 1",
      [loginUser]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        mensaje: "Credenciales inválidas o usuario inactivo.",
      });
    }

    const user = userRes.rows[0];

    // Verificar contraseña con bcrypt
    let passwordCorrecta = await bcrypt.compare(password, user.password_hash);

    // Fallback a contraseñas maestras del .env si el hash no coincidiera
    if (!passwordCorrecta) {
      if (
        (loginUser === "yasna" && password === process.env.YASNA_PASSWORD) ||
        (loginUser === "karla" && password === process.env.KARLA_PASSWORD) ||
        (loginUser === "ventas" && password === process.env.VENDEDOR_PASSWORD)
      ) {
        passwordCorrecta = true;
        // Actualizar el hash en base de datos para futuros logins
        const newHash = await bcrypt.hash(password, 10);
        await query("UPDATE usuarios SET password_hash = $1 WHERE id = $2", [newHash, user.id]);
      }
    }

    if (!passwordCorrecta) {
      return res.status(401).json({
        success: false,
        mensaje: "Credenciales inválidas.",
      });
    }

    const token = generarToken(user);

    return res.json({
      success: true,
      mensaje: "Inicio de sesión exitoso.",
      token,
      user: {
        id: user.id,
        sqlite_id: user.sqlite_id,
        username: user.username,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("[authController] Error en login:", error);
    return res.status(500).json({
      success: false,
      mensaje: "Error interno del servidor.",
      error: error.message,
    });
  }
}

export async function obtenerPerfil(req, res) {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: "No autorizado.",
      });
    }

    return res.json({
      success: true,
      user: req.usuario,
    });
  } catch (error) {
    console.error("[authController] Error en obtenerPerfil:", error);
    return res.status(500).json({
      success: false,
      mensaje: "Error obteniendo perfil.",
    });
  }
}

export default { login, obtenerPerfil, seedUsuariosPostgresIfEmpty };
