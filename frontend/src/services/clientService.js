import api from "./api";

export const clientService = {
  listar: (params = {}) => api.get(`/clientes?${new URLSearchParams(params)}`),
  obtener: (id) => api.get(`/clientes/${id}`),
  crear: (data) => api.post("/clientes", data),
  actualizar: (id, data) => api.put(`/clientes/${id}`, data),
  eliminar: (id) => api.delete(`/clientes/${id}`),
  stats: () => api.get("/clientes/stats"),
};

export default clientService;
