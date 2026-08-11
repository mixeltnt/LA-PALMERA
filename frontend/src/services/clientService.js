import api from "./api";

export const clientService = {
  listar: (params = {}) => api.get(`/clientes?${new URLSearchParams(params)}`),
  obtener: (id) => api.get(`/clientes/${id}`),
  obtenerMovimientos: (id) => api.get(`/clientes/${id}/movimientos`),
  obtenerSaldo: (id) => api.get(`/clientes/${id}/saldo`),
  registrarAbono: (id, data) => api.post(`/clientes/${id}/abonos`, data),
  crear: (data) => api.post("/clientes", data),
  actualizar: (id, data) => api.put(`/clientes/${id}`, data),
  eliminar: (id) => api.delete(`/clientes/${id}`),
  stats: () => api.get("/clientes/stats"),
};

export default clientService;
