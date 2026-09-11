import "dotenv/config";
import { initPostgres } from "./config/postgres.js";
import { connectDB } from "./config/database.js";
import app from "./app.js";

const PORT = process.env.PORT || 4000;

function validarEntorno() {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "la_palmera_secret_key_2026";
  }
}

async function start() {
  validarEntorno();

  // 1. Inicializar PostgreSQL (Base principal remota de sincronización)
  console.log("[Servidor] Conectando a base de datos PostgreSQL...");
  await initPostgres();

  // 2. Si existe MongoDB configurado opcionalmente, intentar conectar sin bloquear
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch {
      console.log("[MongoDB] Modo opcional no conectado.");
    }
  }

  // 3. Iniciar servidor HTTP
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor La Palmera POS API v23 ejecutándose en puerto ${PORT}`);
    console.log(`📡 Endpoint de Sincronización: http://localhost:${PORT}/api/sync`);
    console.log(`📊 Endpoint de Dashboard:       http://localhost:${PORT}/api/dashboard/resumen`);
    console.log(`📈 Endpoint de Reportes:        http://localhost:${PORT}/api/reportes`);
    console.log(`====================================================`);
  });
}

start();