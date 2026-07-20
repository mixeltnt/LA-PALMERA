import api from "./api";

export const providerService = {
  listar: (params = {}) =>
    api.get(`/proveedores?${new URLSearchParams(params)}`),
  obtener: (id) => api.get(`/proveedores/${id}`),
  crear: (data) => api.post("/proveedores", data),
  actualizar: (id, data) => api.put(`/proveedores/${id}`, data),
  eliminar: (id) => api.delete(`/proveedores/${id}`),
  listarTodas: () => api.get("/proveedores?todas=true"),
};

export default providerService;
