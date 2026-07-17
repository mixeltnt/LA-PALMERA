import api from "./api";

export const categoryService = {
  listar: (params = {}) => api.get(`/categorias?${new URLSearchParams(params)}`),
  listarTodas: () => api.get("/categorias?todas=true"),
  obtener: (id) => api.get(`/categorias/${id}`),
  crear: (data) => api.post("/categorias", data),
  actualizar: (id, data) => api.put(`/categorias/${id}`, data),
  eliminar: (id) => api.delete(`/categorias/${id}`),
  stats: () => api.get("/categorias/stats"),
};

export default categoryService;
