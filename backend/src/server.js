import "dotenv/config";

import { conectarDB } from "./config/db.js";
import User from "./models/User.js";
import app from "./app.js";

const PORT = process.env.PORT || 4000;

async function crearAdminSiNoExiste() {
  const existe = await User.findOne({ usuario: "admin" });
  if (!existe) {
    await User.create({
      nombre: "Administrador",
      usuario: "admin",
      password: "1234",
      rol: "admin",
    });
    console.log("👤 Usuario admin creado automáticamente");
  }
}

async function start() {
  await conectarDB();
  await crearAdminSiNoExiste();
  app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  });
}

start();