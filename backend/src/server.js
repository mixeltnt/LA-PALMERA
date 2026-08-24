import "dotenv/config";

import { conectarDB } from "./config/db.js";
import User from "./models/User.js";
import app from "./app.js";

const PORT = process.env.PORT || 4000;

function validarEntorno() {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET no está configurado");
    process.exit(1);
  }
}

async function advertirSiNoHayAdmin() {
  const admins = await User.countDocuments({ rol: "admin", activo: true });
  if (admins === 0) {
    console.warn(
      "No existe un administrador activo. Créelo mediante el mecanismo seguro de administración (seed) antes de usar la aplicación.",
    );
  }
}

async function start() {
  validarEntorno();
  await conectarDB();
  await advertirSiNoHayAdmin();
  app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  });
}

start();