import { dbManager } from "../database/db";

export const userService = {
  listar: async (params = {}) => {
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
      const res = await db.execute(
        "INSERT INTO usuarios (username, password_hash, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)",
        [data.usuario || data.username, data.password, data.nombre, data.rol || "cajero"]
      );
      return { mensaje: "Usuario creado localmente", usuario: { _id: String(res.lastInsertId), ...data } };
    } catch (e) {
      throw new Error(e.message || "Error al crear usuario localmente");
    }
  },

  actualizar: async (id, data) => {
    try {
      const db = await dbManager.getConnection();
      await db.execute(
        "UPDATE usuarios SET nombre = COALESCE(?, nombre), rol = COALESCE(?, rol), password_hash = COALESCE(?, password_hash) WHERE id = ?",
        [data.nombre, data.rol, data.password ? data.password : null, Number(id)]
      );
      return { mensaje: "Usuario actualizado localmente" };
    } catch (e) {
      throw new Error(e.message || "Error al actualizar usuario");
    }
  },

  cambiarEstado: async (id, activo) => {
    try {
      const db = await dbManager.getConnection();
      await db.execute("UPDATE usuarios SET activo = ? WHERE id = ?", [activo ? 1 : 0, Number(id)]);
      return { mensaje: "Estado de usuario modificado" };
    } catch (e) {
      throw new Error(e.message || "Error al cambiar estado");
    }
  },
};

export default userService;