import { cashboxRepository } from "../database/repositories/cashboxRepository";

export const cajaService = {
  obtenerSesionActiva: async (usuarioId) => {
    try {
      const sesion = await cashboxRepository.getActiveSession(usuarioId);
      return { sesion };
    } catch (e) {
      console.error("[cajaService] Error obteniendo sesión activa:", e);
      return { sesion: null };
    }
  },

  abrirCaja: async (data) => {
    try {
      const sesion = await cashboxRepository.openSession(
        data.usuarioId || 1,
        data.usuarioNombre || "Administrador",
        Number(data.montoInicial || 0)
      );
      return { sesion, mensaje: "Caja abierta con éxito" };
    } catch (e) {
      console.error("[cajaService] Error abriendo caja:", e);
      throw new Error(e.message || "Error al abrir la caja");
    }
  },

  cerrarCaja: async (data) => {
    try {
      const sesion = await cashboxRepository.closeSession(
        data.sessionId,
        Number(data.montoRealEfectivo || 0),
        data.observaciones
      );
      return { sesion, mensaje: "Caja cerrada correctamente" };
    } catch (e) {
      console.error("[cajaService] Error cerrando caja:", e);
      throw new Error(e.message || "Error al cerrar la caja");
    }
  },

  registrarMovimiento: async (data) => {
    try {
      const mov = await cashboxRepository.addMovement(
        data.sessionId,
        data.tipo,
        Number(data.monto || 0),
        data.concepto,
        data.usuarioId || 1,
        data.usuarioNombre || "Administrador"
      );
      return { movimiento: mov, mensaje: "Movimiento registrado con éxito" };
    } catch (e) {
      console.error("[cajaService] Error registrando movimiento:", e);
      throw new Error(e.message || "Error al registrar movimiento");
    }
  },

  obtenerMovimientos: async (sessionId) => {
    try {
      const movimientos = await cashboxRepository.getMovements(sessionId);
      return { movimientos };
    } catch (e) {
      console.error("[cajaService] Error obteniendo movimientos:", e);
      return { movimientos: [] };
    }
  },

  historialSesiones: async (limit = 20) => {
    try {
      const sesiones = await cashboxRepository.listSessions(limit);
      return { sesiones };
    } catch (e) {
      console.error("[cajaService] Error listando historial de sesiones:", e);
      return { sesiones: [] };
    }
  },
};

export default cajaService;
