import api from "./api";

export const userService = {
  listar: (params = {}) => api.get(`/usuarios?${new URLSearchParams(params)}`),
  crear: (data) => api.post("/usuarios", data),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  cambiarEstado: (id, activo) => api.patch(`/usuarios/${id}/estado`, { activo }),
};

export default userService;