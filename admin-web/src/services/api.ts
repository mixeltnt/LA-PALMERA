// Cliente API Centralizado para el Panel Web Administrativo La Palmera POS
const STORAGE_URL_KEY = "lapalmera_admin_api_url";
const STORAGE_TOKEN_KEY = "lapalmera_admin_token";
const STORAGE_USER_KEY = "lapalmera_admin_user";

export function getBaseApiUrl(): string {
  const saved = localStorage.getItem(STORAGE_URL_KEY);
  if (saved && saved.trim()) {
    return saved.trim().replace(/\/+$/, "");
  }
  return "http://localhost:4000/api";
}

export function setBaseApiUrl(url: string): void {
  let clean = url.trim().replace(/\/+$/, "");
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `http://${clean}`;
  }
  if (!clean.endsWith("/api")) {
    clean = `${clean}/api`;
  }
  localStorage.setItem(STORAGE_URL_KEY, clean);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  }
}

export function getSavedUser(): any {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSavedUser(user: any): void {
  if (user) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_USER_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseApiUrl();
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const url = `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const msg = json?.mensaje || json?.message || `Error del servidor HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json as T;
}

export const adminApi = {
  // Autenticación
  login: (username: string, password: string) =>
    request<{ token: string; usuario: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  getProfile: () => request<{ usuario: any }>("/auth/profile"),

  // Dashboard & Resumen
  getDashboardResumen: () => request<any>("/dashboard/resumen"),
  getVentasRecientes: (limit = 10) => request<any[]>(`/dashboard/ventas-recientes?limit=${limit}`),

  // Ventas (PostgreSQL Neon)
  getVentas: (params?: { page?: number; limit?: number; search?: string; desde?: string; hasta?: string; metodo_pago?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.search) q.append("search", params.search);
    if (params?.desde) q.append("desde", params.desde);
    if (params?.hasta) q.append("hasta", params.hasta);
    if (params?.metodo_pago) q.append("metodo_pago", params.metodo_pago);
    return request<{ ventas: any[]; paginacion: any }>(`/admin/ventas?${q.toString()}`);
  },
  getVentaDetalle: (id: string | number) => request<{ venta: any; items: any[]; pagos: any[] }>(`/admin/ventas/${id}`),

  // Productos & Inventario
  getProductos: (params?: { page?: number; limit?: number; search?: string; categoria_id?: number | string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.search) q.append("search", params.search);
    if (params?.categoria_id) q.append("categoria_id", params.categoria_id.toString());
    return request<{ productos: any[]; paginacion: any }>(`/admin/productos?${q.toString()}`);
  },
  getCategorias: () => request<{ categorias: any[] }>("/admin/categorias"),

  // Clientes & Cuentas Corrientes
  getClientes: (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.search) q.append("search", params.search);
    return request<{ clientes: any[]; paginacion: any }>(`/admin/clientes?${q.toString()}`);
  },
  getClienteMovimientos: (id: string | number) =>
    request<{ cliente: any; movimientos: any[] }>(`/admin/clientes/${id}/movimientos`),

  // Caja & Sesiones
  getCajaSesiones: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    return request<{ sesiones: any[]; paginacion: any }>(`/admin/caja/sesiones?${q.toString()}`);
  },
  getCajaMovimientos: (id: string | number) =>
    request<{ sesion: any; movimientos: any[] }>(`/admin/caja/sesiones/${id}/movimientos`),

  // Reportes
  getReportePeriodo: (desde: string, hasta: string) =>
    request<any>(`/reportes/periodo?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`),
  getTopProductos: (desde?: string, hasta?: string, limit = 10) => {
    const q = new URLSearchParams();
    if (desde) q.append("desde", desde);
    if (hasta) q.append("hasta", hasta);
    q.append("limit", limit.toString());
    return request<any[]>(`/reportes/top-productos?${q.toString()}`);
  },

  // Estado de Sincronización
  getSyncStatus: () => request<any>("/sync/status"),
};
