// Cliente API Centralizado para el Panel Web Administrativo La Palmera POS
const STORAGE_URL_KEY = "lapalmera_admin_api_url";
const STORAGE_TOKEN_KEY = "lapalmera_admin_token";
const STORAGE_USER_KEY = "lapalmera_admin_user";

export const DEFAULT_CLOUD_API = "https://lapalmera-pos-api.onrender.com/api";

export function getBaseApiUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, "");
    }
    // Si corre en navegador local (desarrollo) fuera de Capacitor, usar el backend local :4000 (conectado a Neon)
    const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.());
    if (
      !isCapacitorNative &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
      return "http://localhost:4000/api";
    }
    // Si corre en la nube (Render / producción), usar el mismo origen
    if (
      window.location.hostname &&
      !window.location.hostname.includes("localhost") &&
      !window.location.hostname.includes("127.0.0.1")
    ) {
      return `${window.location.origin}/api`;
    }
  }
  // En apps móviles Android (Capacitor/WebView) o standalone, apuntar directamente a Render Cloud
  return DEFAULT_CLOUD_API;
}

export function setBaseApiUrl(url: string): void {
  let clean = url.trim().replace(/\/+$/, "");
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
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
  getVentas: async (params?: { page?: number; limit?: number; search?: string; desde?: string; hasta?: string; metodo_pago?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.search) q.append("search", params.search);
    if (params?.desde) q.append("desde", params.desde);
    if (params?.hasta) q.append("hasta", params.hasta);
    if (params?.metodo_pago) q.append("metodo_pago", params.metodo_pago);
    const res: any = await request<any>(`/admin/ventas?${q.toString()}`);
    return {
      ventas: res?.data || res?.ventas || [],
      paginacion: res?.pagination || res?.paginacion || { page: 1, totalPages: 1, total: 0 },
    };
  },
  getVentaDetalle: async (id: string | number) => {
    const res = await request<any>(`/admin/ventas/${id}`);
    const venta = res?.venta || res?.data || res;
    const items = res?.items || res?.data?.items || [];
    const pagos = res?.pagos || res?.data?.pagos || [];
    return {
      venta,
      items,
      pagos,
      data: res?.data || venta,
    };
  },

  // Productos & Inventario
  getProductos: async (params?: { page?: number; limit?: number; search?: string; categoria_id?: number | string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.search) q.append("search", params.search);
    if (params?.categoria_id) q.append("categoria_id", params.categoria_id.toString());
    const res: any = await request<any>(`/admin/productos?${q.toString()}`);
    return {
      productos: res?.data || res?.productos || [],
      paginacion: res?.pagination || res?.paginacion || { page: 1, totalPages: 1, total: 0 },
    };
  },
  getCategorias: async () => {
    const res: any = await request<any>("/admin/categorias");
    return {
      categorias: res?.data || res?.categorias || (Array.isArray(res) ? res : []),
    };
  },

  // Clientes & Cuentas Corrientes
  getClientes: async (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.search) q.append("search", params.search);
    const res: any = await request<any>(`/admin/clientes?${q.toString()}`);
    return {
      clientes: res?.data || res?.clientes || [],
      paginacion: res?.pagination || res?.paginacion || { page: 1, totalPages: 1, total: 0 },
    };
  },
  getClienteMovimientos: (id: string | number) =>
    request<{ cliente: any; movimientos: any[] }>(`/admin/clientes/${id}/movimientos`),

  // Caja & Sesiones
  getCajaSesiones: async (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    const res: any = await request<any>(`/admin/caja/sesiones?${q.toString()}`);
    return {
      sesiones: res?.data || res?.sesiones || [],
      paginacion: res?.pagination || res?.paginacion || { page: 1, totalPages: 1, total: 0 },
    };
  },
  getCajaMovimientos: (id: string | number) =>
    request<{ sesion: any; movimientos: any[] }>(`/admin/caja/sesiones/${id}/movimientos`),

  // Reportes
  getReportePeriodo: async (desde: string, hasta: string) => {
    try {
      const res: any = await request<any>(`/reportes/ventas?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
      return res?.resumen || res?.data || res || {};
    } catch {
      const fallback: any = await request<any>(`/reportes/periodo?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
      return fallback?.resumen || fallback?.data || fallback || {};
    }
  },
  getTopProductos: async (desde?: string, hasta?: string, limit = 10) => {
    const q = new URLSearchParams();
    if (desde) q.append("desde", desde);
    if (hasta) q.append("hasta", hasta);
    q.append("limit", limit.toString());
    try {
      const res: any = await request<any>(`/reportes/productos-top?${q.toString()}`);
      return res?.data || (Array.isArray(res) ? res : []);
    } catch {
      const fallback: any = await request<any>(`/reportes/top-productos?${q.toString()}`);
      return fallback?.data || (Array.isArray(fallback) ? fallback : []);
    }
  },

  // Estado de Sincronización
  getSyncStatus: () => request<any>("/sync/status"),
};
