export const API_URL_STORAGE_KEY = "lapalmera_api_url";
export const API_URL_CONFIG_KEY = "api_url";
export const API_KEY_STORAGE_KEY = "lapalmera_api_key";
export const DEFAULT_API_KEY = "palmera_pos_secret_sync_key_2026";

let memoryApiBaseUrl = null;
let memoryApiKey = null;

export function normalizeApiUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let clean = rawUrl.trim();
  clean = clean.replace(/\/+$/, "");
  if (!clean) return "";

  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `http://${clean}`;
  }

  if (!clean.endsWith("/api")) {
    clean = `${clean}/api`;
  }
  return clean.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  if (typeof window === "undefined") return "/api";

  if (memoryApiBaseUrl) {
    return memoryApiBaseUrl;
  }

  try {
    const custom = localStorage.getItem(API_URL_STORAGE_KEY);
    if (custom && custom.trim() !== "") {
      const norm = normalizeApiUrl(custom);
      if (norm) {
        memoryApiBaseUrl = norm;
        return norm;
      }
    }
  } catch {}

  const isTauri =
    "__TAURI_INTERNALS__" in window ||
    window.location.protocol === "tauri:" ||
    window.location.hostname === "tauri.localhost" ||
    window.location.protocol === "file:";

  if (isTauri) {
    return "http://localhost:4000/api";
  }

  return "/api";
}

export function setApiBaseUrl(newUrl) {
  const normalized = normalizeApiUrl(newUrl);
  if (normalized) {
    memoryApiBaseUrl = normalized;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(API_URL_STORAGE_KEY, normalized);
    }
  }
  return normalized;
}

export function getApiKey() {
  if (memoryApiKey) return memoryApiKey;
  try {
    const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (saved && saved.trim()) {
      memoryApiKey = saved.trim();
      return memoryApiKey;
    }
  } catch {}
  return DEFAULT_API_KEY;
}

export function setApiKey(newKey) {
  if (newKey && typeof newKey === "string") {
    const clean = newKey.trim();
    memoryApiKey = clean;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(API_KEY_STORAGE_KEY, clean);
    }
    return clean;
  }
  return DEFAULT_API_KEY;
}

export async function loadApiUrlFromDatabase() {
  try {
    const { getDatabase } = await import("../database/db");
    const db = await getDatabase();
    const rows = await db.select(
      "SELECT valor FROM configuracion WHERE clave = ?",
      [API_URL_CONFIG_KEY]
    );
    if (rows && rows.length > 0 && rows[0].valor) {
      const url = setApiBaseUrl(rows[0].valor);
      console.log(`[API] URL del servidor cargada desde SQLite: ${url}`);
      return url;
    }
  } catch (err) {
    console.warn("[API] No se pudo leer api_url de SQLite, usando fallback:", err);
  }
  return getApiBaseUrl();
}

export async function saveApiUrlToDatabase(newUrl) {
  const normalized = setApiBaseUrl(newUrl);
  try {
    const { getDatabase } = await import("../database/db");
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO configuracion (clave, valor, descripcion, actualizado_en)
       VALUES (?, ?, 'URL del servidor central para sincronización', datetime('now', 'localtime'))
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado_en = excluded.actualizado_en`,
      [API_URL_CONFIG_KEY, normalized]
    );
    console.log(`[API] URL del servidor guardada en SQLite: ${normalized}`);
  } catch (err) {
    console.warn("[API] Error guardando api_url en SQLite:", err);
  }
  return normalized;
}

export async function testApiConnection(targetUrl, targetApiKey) {
  const urlToTest = targetUrl ? normalizeApiUrl(targetUrl) : getApiBaseUrl();
  const apiKeyToTest = targetApiKey || getApiKey();
  const endpoint = `${urlToTest}/sync/status`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKeyToTest,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `El servidor respondió con código HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    return {
      ok: true,
      status: 200,
      data: json,
      url: urlToTest,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    let errMsg = "No se pudo conectar con el servidor.";
    if (err.name === "AbortError") {
      errMsg = "Tiempo de espera agotado (el servidor tardó más de 6 segundos en responder).";
    } else if (err.message) {
      errMsg = `Error de red: ${err.message}`;
    }
    return {
      ok: false,
      error: errMsg,
      url: urlToTest,
    };
  }
}

async function request(endpoint, options = {}) {
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("lapalmera-token") ||
        sessionStorage.getItem("lapalmera-token")
      : null;

  const apiKey = getApiKey();

  const config = {
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (!config.headers["Content-Type"]) {
    delete config.headers["Content-Type"];
  }

  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let res = null;
  try {
    res = await fetch(url, config);
  } catch (err) {
    const offlineErr = new Error("Servidor API offline o no disponible");
    offlineErr.status = 503;
    offlineErr.isOffline = true;
    throw offlineErr;
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // ignore json parse errors
  }

  if (!res.ok) {
    const message =
      (data && (data.mensaje || data.message)) ||
      `Error ${res.status} en la solicitud`;
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
