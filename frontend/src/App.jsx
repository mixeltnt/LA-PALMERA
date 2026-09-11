/**
 * ============================================================================
 * LA PALMERA POS — COMPONENTE PRINCIPAL (APP)
 * ============================================================================
 * Maneja la intro animada de 5 segundos de Palmi en el inicio,
 * el listener global de teclado (ESC / F11 para alternar Modo Ventana y Pantalla Completa)
 * y el proveedor de contexto de autenticación (AuthProvider).
 */

import { useState, useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import IntroSalchicha from "./components/IntroSalchicha/IntroSalchicha";
import { isTauriEnvironment, toggleFullscreen, setFullscreenMode } from "./utils/windowControls";

function App() {
  // Controla si la intro inicial ya concluyó o fue saltada
  const [introFinished, setIntroFinished] = useState(false);

  /**
   * Listener global de teclado:
   * - ESC: sale de pantalla completa a modo ventana si está en pantalla completa
   * - F11: alterna entre pantalla completa y modo ventana
   */
  useEffect(() => {
    let isHandling = false;

    const handleKeyDown = async (e) => {
      if (isHandling) return;

      if (e.key === "F11") {
        e.preventDefault();
        isHandling = true;
        await toggleFullscreen();
        setTimeout(() => { isHandling = false; }, 300);
      } else if (e.key === "Escape") {
        const hasOpenModal = Boolean(document.querySelector(".modal.d-block, .modal.show, .lp-intro-overlay"));
        if (!hasOpenModal) {
          isHandling = true;
          await setFullscreenMode(false);
          setTimeout(() => { isHandling = false; }, 300);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Intro animada inicial de 5 segundos */}
      {!introFinished && (
        <IntroSalchicha onFinish={() => setIntroFinished(true)} />
      )}

      {/* Proveedor de Autenticación y Enrutador Principal */}
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </>
  );
}

export default App;