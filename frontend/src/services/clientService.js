import { customerRepository } from "../database/repositories/catalogRepository";

export const clientService = {
  listar: async (params = {}) => {
    try {
      const clientes = await customerRepository.list(params.search, params.activo);
      return { clientes, total: clientes.length, totalPages: 1 };
    } catch (e) {
      console.error("[clientService] Error listando clientes en SQLite:", e);
      return { clientes: [], total: 0, totalPages: 1 };
    }
  },

  obtener: async (id) => {
    const cliente = await customerRepository.getById(id);
    return { cliente };
  },

  obtenerMovimientos: async (id) => {
    const cliente = await customerRepository.getById(id);
    const movimientos = await customerRepository.getMovimientos(id);
    return {
      cliente,
      saldoPendiente: Number(cliente?.saldoDeudor ?? 0),
      movimientos,
    };
  },

  obtenerSaldo: async (id) => {
    const cliente = await customerRepository.getById(id);
    const saldo = Number(cliente?.saldoDeudor ?? cliente?.saldoPendiente ?? 0);
    const limite = Number(cliente?.limiteFiado ?? cliente?.limiteCredito ?? 0);
    const disponible = Math.max(0, limite - saldo);
    return {
      cliente,
      saldo,
      saldoPendiente: saldo,
      saldoDeudor: saldo,
      limiteFiado: limite,
      limiteCredito: limite,
      disponible,
    };
  },

  registrarAbono: async (id, data) => {
    await customerRepository.registrarAbono(id, Number(data?.monto || 0), data?.observacion);
    return { mensaje: "Abono registrado localmente" };
  },

  cuentasPorCobrar: async () => {
    try {
      const list = await customerRepository.list();
      const deudores = list.filter((c) => (c.saldoDeudor || 0) > 0);
      const totalDeuda = deudores.reduce((sum, c) => sum + (c.saldoDeudor || 0), 0);
      return {
        cuentas: deudores.map((c) => ({
          ...c,
          cliente: c.id,
          disponible: Math.max(0, (c.limiteFiado || c.limiteCredito || 0) - (c.saldoDeudor || 0)),
        })),
        clientes: deudores,
        totalDeuda,
        totalPorCobrar: totalDeuda,
        resumen: { totalPorCobrar: totalDeuda, totalDeudores: deudores.length },
      };
    } catch (e) {
      console.error("[clientService] Error en cuentasPorCobrar SQLite:", e);
      return { cuentas: [], clientes: [], totalDeuda: 0, totalPorCobrar: 0, resumen: { totalPorCobrar: 0, totalDeudores: 0 } };
    }
  },

  crear: async (data) => {
    const cliente = await customerRepository.create(data);
    return { cliente, mensaje: "Cliente guardado localmente" };
  },

  actualizar: async (id, data) => {
    const cliente = await customerRepository.update(id, data);
    return { cliente, mensaje: "Cliente actualizado localmente" };
  },

  eliminar: async (id) => {
    await customerRepository.delete(id);
    return { mensaje: "Cliente eliminado" };
  },

  stats: async () => {
    try {
      const list = await customerRepository.list();
      return {
        total: list.length,
        conDeuda: list.filter((c) => (c.saldoDeudor || 0) > 0).length,
        saldoTotal: list.reduce((sum, c) => sum + (c.saldoDeudor || 0), 0),
      };
    } catch (e) {
      return { total: 0, conDeuda: 0, saldoTotal: 0 };
    }
  },
};

export default clientService;

