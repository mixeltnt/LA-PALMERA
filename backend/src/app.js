import express from "express";
import cors from "cors";
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

const originsDesdeEnv = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const originsPermitidos = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "http://tauri.localhost",
  "tauri://localhost",
  ...originsDesdeEnv,
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        originsPermitidos.includes(origin) ||
        origin.startsWith("tauri://") ||
        origin.startsWith("http://tauri.localhost") ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const adminDistDir = fileURLToPath(new URL("../../admin-web/dist", import.meta.url));
const adminDistExiste = existsSync(path.join(adminDistDir, "index.html"));

if (adminDistExiste) {
  app.use("/admin", express.static(adminDistDir));
  app.use("/panel", express.static(adminDistDir));
  app.use((req, res, next) => {
    if (req.method === "GET" && (req.path.startsWith("/admin") || req.path.startsWith("/panel"))) {
      return res.sendFile(path.join(adminDistDir, "index.html"));
    }
    next();
  });
}

const distDir = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
const distExiste = existsSync(path.join(distDir, "index.html"));

if (distExiste) {
  app.use(express.static(distDir));

  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/admin") || req.path.startsWith("/panel")) {
      return next();
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.get("/", (req, res) => {
  res.json({
    nombre: "La Palmera POS API",
    version: "23.0.0",
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
