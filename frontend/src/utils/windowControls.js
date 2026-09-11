/**
 * ============================================================================
 * LA PALMERA POS — CONTROL DE VENTANA (WINDOW CONTROLS)
 * ============================================================================
 * Proporciona métodos multiplataforma para alternar pantalla completa,
 * minimizar y cerrar el aplicativo nativo Tauri (y navegador web como fallback).
 */

/**
 * Detecta si el código se está ejecutando dentro del entorno de escritorio Tauri
 * @returns {boolean}
 */
export const isTauriEnvironment = () => {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
};

/**
 * Alterna entre Pantalla Completa y Modo Ventana (usado con tecla ESC y F11)
 * @returns {Promise<boolean>} Estado final de pantalla completa
 */
export const toggleFullscreen = async () => {
  if (isTauriEnvironment()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWin = getCurrentWindow();
      const isFs = await appWin.isFullscreen();
      await appWin.setFullscreen(!isFs);
      return !isFs;
    } catch (err) {
      console.warn("[WindowControls] Error en Tauri setFullscreen:", err);
    }
  }

  // Fallback para navegador web
  try {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return false;
      }
    }
  } catch (err) {
    console.warn("[WindowControls] Error en web fullscreen:", err);
    return false;
  }
  return false;
};

/**
 * Fija explícitamente el modo pantalla completa
 * @param {boolean} enable
 */
export const setFullscreenMode = async (enable) => {
  if (isTauriEnvironment()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWin = getCurrentWindow();
      await appWin.setFullscreen(enable);
      if (!enable) {
        await appWin.unmaximize().catch(() => {});
      }
      return enable;
    } catch (err) {
      console.warn("[WindowControls] Error fijando fullscreen:", err);
    }
  }
  return enable;
};

/**
 * Minimiza la ventana activa a la barra de tareas
 */
export const minimizeWindow = async () => {
  if (isTauriEnvironment()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWin = getCurrentWindow();
      await appWin.minimize();
    } catch (err) {
      console.warn("[WindowControls] Error al minimizar:", err);
    }
  }
};

/**
 * Cierra la aplicación de forma segura
 */
export const closeApp = async () => {
  if (isTauriEnvironment()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWin = getCurrentWindow();
      await appWin.close();
      return;
    } catch (err) {
      console.warn("[WindowControls] Error al cerrar ventana Tauri:", err);
    }

    try {
      const { exit } = await import("@tauri-apps/plugin-process");
      await exit(0);
      return;
    } catch (err2) {
      console.warn("[WindowControls] Error en plugin-process exit:", err2);
    }
  }

  // Fallback web
  if (window.confirm("¿Desea cerrar el sistema La Palmera?")) {
    window.close();
  }
};
