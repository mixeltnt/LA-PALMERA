import { useEffect, useRef, useState } from "react";
import LaPalmeraLogo from "../LaPalmeraLogo";
import "./SplashScreen.css";

const SPLASH_MS = 3400;
const EXIT_MS = 450;

const MODULES = [
  {
    icon: "bi-cart3",
    title: "Ventas",
    desc: "Gestiona tus ventas y transacciones",
  },
  {
    icon: "bi-people-fill",
    title: "Clientes",
    desc: "Administra clientes y contactos",
  },
  {
    icon: "bi-box-seam-fill",
    title: "Inventario",
    desc: "Controla productos y stock",
  },
  {
    icon: "bi-bar-chart-fill",
    title: "Reportes",
    desc: "Consulta reportes y estadísticas",
  },
];

function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const start = performance.now();
    let rafId;
    let finishTimer;

    const tick = (now) => {
      const p = Math.min(1, (now - start) / SPLASH_MS);
      setProgress(Math.round(p * 100));
      if (p >= 1) {
        finishTimer = setTimeout(() => onFinishRef.current(), 60);
        return;
      }
      if (p >= 1 - EXIT_MS / SPLASH_MS) {
        setExiting(true);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(finishTimer);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className={`lp-splash${exiting ? " lp-splash--exit" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="lp-splash__inner">
        <div className="lp-splash__logo">
          <LaPalmeraLogo variant="full" className="lp-splash__logo-svg" />
        </div>

        <p className="lp-splash__subtitle">Sistema de Gestión</p>

        <div className="lp-splash__cards">
          {MODULES.map((mod, i) => (
            <div
              className="lp-splash__card"
              key={mod.title}
              style={{ "--i": i }}
            >
              <span className="lp-splash__card-icon" aria-hidden="true">
                <i className={`bi ${mod.icon}`}></i>
              </span>
              <span className="lp-splash__card-text">
                <span className="lp-splash__card-title">{mod.title}</span>
                <span className="lp-splash__card-desc">{mod.desc}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="lp-splash__status">
          <p className="lp-splash__status-title">
            Iniciando La Palmera
            <span className="lp-splash__dots" aria-hidden="true">
              <span className="lp-splash__dot"></span>
              <span className="lp-splash__dot"></span>
              <span className="lp-splash__dot"></span>
            </span>
          </p>
          <p className="lp-splash__status-sub">
            Verificando servicios y preparando todo para ti.
          </p>
          <div
            className="lp-splash__track"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress}
          >
            <div
              className="lp-splash__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <footer className="lp-splash__footer">
          <span>Seguro</span>
          <span className="lp-splash__sep" aria-hidden="true">
            •
          </span>
          <span>Rápido</span>
          <span className="lp-splash__sep" aria-hidden="true">
            •
          </span>
          <span>Confiable</span>
        </footer>
      </div>
    </div>
  );
}

export default SplashScreen;