const API_URL = "/api";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("lapalmera-token") || sessionStorage.getItem("lapalmera-token");

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (!config.headers["Content-Type"]) {
    delete config.headers["Content-Type"];
  }

  const res = await fetch(`${API_URL}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.mensaje || "Error en la solicitud");
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) =>
    request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body) =>
    request(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};

export default api;
