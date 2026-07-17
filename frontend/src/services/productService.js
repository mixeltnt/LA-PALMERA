import api from "./api";

export const productService = {
  listar: (params = {}) => api.get(`/productos?${new URLSearchParams(params)}`),
  obtener: (id) => api.get(`/productos/${id}`),
  crear: (data) => api.post("/productos", data),
  actualizar: (id, data) => api.put(`/productos/${id}`, data),
  eliminar: (id) => api.delete(`/productos/${id}`),
  stats: () => api.get("/productos/stats"),
};

export default productService;
