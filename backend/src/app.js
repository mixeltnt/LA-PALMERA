import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/authRoutes.js";
import productsRoutes from "./routes/productsRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import compraRoutes from "./routes/compraRoutes.js";
import ventaRoutes from "./routes/ventaRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import syncRoutes from "./routes/syncRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportesRoutes from "./routes/reportesRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
// Confiar en el primer reverse proxy (Render / Cloudflare) para X-Forwarded-For y rate-limit
app.set("trust proxy", 1);

const originsDesdeEnv = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const originsPermitidos = [
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
  "capacitor://localhost",
  "https://localhost",
  "https://lapalmera-pos-api.onrender.com",
  ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, "")] : []),
  ...originsDesdeEnv,
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        originsPermitidos.includes(origin) ||
        origin.startsWith("tauri://") ||
        origin.startsWith("capacitor://") ||
        origin.startsWith("http://tauri.localhost") ||
        origin.startsWith("https://tauri.localhost") ||
        (process.env.NODE_ENV !== "production" &&
          (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")))
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Rate limiting general para proteger API en producción (Render)
const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX) || 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    mensaje: "Demasiadas solicitudes. Intente nuevamente en unos minutos.",
  },
});
app.use("/api", apiLimiter);

const publicAdminDir = fileURLToPath(new URL("../public/admin", import.meta.url));
const adminDistDir = fileURLToPath(new URL("../../admin-web/dist", import.meta.url));

const adminDir = existsSync(path.join(publicAdminDir, "index.html"))
  ? publicAdminDir
  : existsSync(path.join(adminDistDir, "index.html"))
  ? adminDistDir
  : null;

if (adminDir) {
  app.use(express.static(adminDir));
  app.use("/admin", express.static(adminDir));
  app.use("/panel", express.static(adminDir));
  app.use("/assets", express.static(path.join(adminDir, "assets")));
  
  app.use((req, res, next) => {
    if (req.method === "GET" && (req.path === "/" || req.path.startsWith("/admin") || req.path.startsWith("/panel"))) {
      return res.sendFile(path.join(adminDir, "index.html"));
    }
    next();
  });
}

app.get("/", (req, res) => {
  res.json({
    nombre: "La Palmera POS API",
    version: "32.0.0",
    mensaje: "API Backend y Sincronización PostgreSQL activa 🚀",
    serverTime: new Date().toISOString(),
  });
});

// Rutas de la API
app.use("/api/sync", syncRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/productos", productsRoutes);
app.use("/api/clientes", clientRoutes);
app.use("/api/categorias", categoryRoutes);
app.use("/api/proveedores", providerRoutes);
app.use("/api/compras", compraRoutes);
app.use("/api/ventas", ventaRoutes);
app.use("/api/usuarios", userRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ mensaje: "Recurso no encontrado." });
});

export default app;
