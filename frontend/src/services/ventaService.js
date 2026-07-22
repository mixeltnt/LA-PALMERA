import api from "./api";

export const ventaService = {
  listar: (params = {}) => api.get(`/ventas?${new URLSearchParams(params)}`),
  obtenerPorId: (id) => api.get(`/ventas/${id}`),
  crear: (data) => api.post("/ventas", data),
  actualizar: (id, data) => api.put(`/ventas/${id}`, data),
  confirmar: (id) => api.patch(`/ventas/${id}/confirmar`),
  anular: (id) => api.patch(`/ventas/${id}/anular`),
};

export default ventaService;
