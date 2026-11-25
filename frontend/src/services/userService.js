import { dbManager } from "../database/db";
import { hashLocalPassword } from "./authService";

export const userService = {
  listar: async () => {
    try {
      const db = await dbManager.getConnection();
      const rows = await db.select("SELECT * FROM usuarios ORDER BY id ASC");
      const usuarios = rows.map((u) => ({
        ...u,
        _id: String(u.id),
        usuario: u.username,
        activo: Boolean(u.activo),
      }));
      return { usuarios, total: usuarios.length };
    } catch {
      return { usuarios: [], total: 0 };
    }
  },

  crear: async (data) => {
    try {
      const db = await dbManager.getConnection();
      const uname = String(data.usuario || data.username || "").trim().toLowerCase();
      const hashed = data.password ? await hashLocalPassword(uname, data.password) : "";
      const res = await db.execute(
        "INSERT INTO usuarios (username, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)",
        [uname, hashed, data.nombre, data.rol || "cajero"]
      );
      return { mensaje: "Usuario creado localmente", usuario: { _id: String(res.lastInsertId), ...data } };
    } catch (e) {
      throw new Error(e.message || "Error al crear usuario localmente", { cause: e });
    }
  },

  actualizar: async (id, data) => {
    try {
      const db = await dbManager.getConnection();
      let hashed = null;
      if (data.password) {
        let uname = String(data.usuario || data.username || "").trim().toLowerCase();
        if (!uname) {
          const rows = await db.select("SELECT username FROM usuarios WHERE id = ? LIMIT 1", [Number(id)]);
          uname = rows[0]?.username || "";
        }
        hashed = await hashLocalPassword(uname, data.password);
      }
      await db.execute(
        "UPDATE usuarios SET nombre = COALESCE(?, nombre), rol = COALESCE(?, rol), password_hash = COALESCE(?, password_hash) WHERE id = ?",
        [data.nombre, data.rol, hashed, Number(id)]
      );
      return { mensaje: "Usuario actualizado localmente" };
    } catch (e) {
      throw new Error(e.message || "Error al actualizar usuario", { cause: e });
    }
  },

  cambiarEstado: async (id, activo) => {
    try {
      const db = await dbManager.getConnection();
      await db.execute("UPDATE usuarios SET activo = ? WHERE id = ?", [activo ? 1 : 0, Number(id)]);
      return { mensaje: "Estado de usuario modificado" };
    } catch (e) {
      throw new Error(e.message || "Error al cambiar estado", { cause: e });
    }
  },
};

export default userService;