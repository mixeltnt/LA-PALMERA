const API_URL = "/api";

async function request(endpoint, options = {}) {
  const token =
    localStorage.getItem("lapalmera-token") ||
    sessionStorage.getItem("lapalmera-token");

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

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // ignore json parse errors
  }

  if (!res.ok) {
    // Handle 401: clear session and redirect to login with friendly message
    if (res.status === 401) {
      try {
        localStorage.removeItem("lapalmera-token");
        localStorage.removeItem("lapalmera-user");
        sessionStorage.removeItem("lapalmera-token");
        sessionStorage.removeItem("lapalmera-user");
      } catch (e) {
        // ignore
      }
      const friendly = "Tu sesión ha expirado. Inicia sesión nuevamente.";
      try {
        sessionStorage.setItem(
          "lapalmera-session-expired",
          JSON.stringify({ text: friendly }),
        );
      } catch (e) {}
      // redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      const err = new Error(friendly);
      err.status = 401;
      err.errores = [friendly];
      throw err;
    }

    const message =
      (data && (data.mensaje || data.message)) || "Error en la solicitud";
    const err = new Error(message);
    err.status = res.status;
    err.errores = (data && (data.errores || data.errors)) || null;
    throw err;
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) =>
    request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body) =>
    request(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  patch: (endpoint, body) =>
    request(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};

export default api;
