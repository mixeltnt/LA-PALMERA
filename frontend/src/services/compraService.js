import api from "./api";

export const compraService = {
  listar: (params = {}) => api.get(`/compras?${new URLSearchParams(params)}`),
  obtener: (id) => api.get(`/compras/${id}`),
  crear: (data) => api.post("/compras", data),
  actualizar: (id, data) => api.put(`/compras/${id}`, data),
  confirmar: (id) => api.patch(`/compras/${id}/confirmar`),
};

export default compraService;
