import React, { useState, useEffect, useRef } from "react";
import "./IntroSalchicha.css";

const INTRO_DURATION_MS = 5000;

export default function IntroSalchicha({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [phaseText, setPhaseText] = useState("🐾 Palmi llegando a La Palmera...");
  const [phaseSub, setPhaseSub] = useState("Iniciando punto de venta...");
  const [isEnding, setIsEnding] = useState(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / INTRO_DURATION_MS) * 100));
      setProgress(pct);

      if (elapsed < 1600) {
        setPhaseText("🐾 Palmi entrando al minimarket...");
        setPhaseSub("Revisando pasillos y abriendo puertas");
      } else if (elapsed < 3300) {
        setPhaseText("🛒 Saltando al mostrador de Punto de Venta...");
        setPhaseSub("Cargando inventario, caja y productos");
      } else if (elapsed < 4600) {
        setPhaseText("✨ ¡Todo listo para atender con alegría!");
        setPhaseSub("Bienvenido a La Palmera POS");
      } else {
        setIsEnding(true);
      }

      if (elapsed >= INTRO_DURATION_MS) {
        clearInterval(interval);
        setTimeout(() => {
          if (onFinishRef.current) onFinishRef.current();
        }, 250);
      }
    }, 40);

    const handleKeyDown = () => {
      clearInterval(interval);
      if (onFinishRef.current) onFinishRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSkip = () => {
    if (onFinishRef.current) onFinishRef.current();
  };

  return (
    <div className={`lp-intro-overlay ${isEnding ? "lp-intro-fadeout" : ""}`} onClick={handleSkip}>
      {/* Fondo de La Palmera */}
      <div className="lp-intro-bg"></div>
      <div className="lp-intro-overlay-dark"></div>

      {/* Escenario de Animación */}
      <div className="lp-intro-stage">
        
        {/* Título Superior */}
        <div className="lp-intro-header">
          <div className="lp-intro-badge">LA PALMERA • MINIMARKET</div>
          <h1 className="lp-intro-title">SISTEMA PUNTO DE VENTA</h1>
        </div>

        {/* Pista de entrada del Perro Salchicha */}
        <div className="lp-intro-track-scene">
          {/* Mostrador / Caja registradora a la derecha */}
          <div className="lp-intro-pos-target">
            <div className="lp-pos-machine">
              <i className="bi bi-display-fill"></i>
              <span className="lp-pos-cash-icon">💰</span>
            </div>
            <div className="lp-pos-counter-wood">
              <span>CAJA 1</span>
            </div>
          </div>

          {/* Perro Salchicha animado caminando hacia el mostrador */}
          <div className="lp-intro-dog-runner">
            <div className="lp-dog-bubble">
              <span>¡Guau! A trabajar 🛒</span>
            </div>
            <div className="lp-dog-sprite-wrap">
              <img src="/palmi.png" alt="Palmi Salchicha" className="lp-dog-mascot-img" />
              <div className="lp-dog-paws-shadow"></div>
            </div>
            {/* Huellitas que va dejando */}
            <div className="lp-paw-trail">
              <span className="lp-paw p1">🐾</span>
              <span className="lp-paw p2">🐾</span>
              <span className="lp-paw p3">🐾</span>
            </div>
          </div>
        </div>

        {/* Textos y Barra de Progreso */}
        <div className="lp-intro-footer-box">
          <div className="lp-intro-status-text">{phaseText}</div>
          <div className="lp-intro-status-sub">{phaseSub}</div>

          <div className="lp-intro-progress-bar-wrap">
            <div
              className="lp-intro-progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="lp-intro-skip-hint">
            <span>Presiona <strong>ESC</strong> o <strong>Espacio</strong> para saltar</span>
            <span className="lp-intro-timer-seconds">{Math.max(0, Math.ceil((INTRO_DURATION_MS - (progress * INTRO_DURATION_MS / 100)) / 1000))}s</span>
          </div>
        </div>

      </div>
    </div>
  );
}
