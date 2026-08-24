import "dotenv/config";
import { conectarDB } from "../src/config/db.js";
import User from "../src/models/User.js";

const PENDIENTES = [];

async function crearSiNoExiste({ nombre, usuario, rol, password }) {
  const existe = await User.findOne({ usuario });
  if (existe) {
    console.log(`⏭️  Usuario '${usuario}' ya existe (rol: ${existe.rol}).`);
    return;
  }

  await User.create({ nombre, usuario, password, rol });
  console.log(`✅ Usuario '${usuario}' creado (rol: ${rol}).`);
}

async function seed() {
  await conectarDB();

  if (!process.env.YASNA_PASSWORD) {
    PENDIENTES.push("YASNA_PASSWORD (contraseña de yasna)");
  } else {
    await crearSiNoExiste({
      nombre: "Yasna",
      usuario: "yasna",
      rol: "admin",
      password: process.env.YASNA_PASSWORD,
    });
  }

  if (!process.env.KARLA_PASSWORD) {
    PENDIENTES.push("KARLA_PASSWORD (contraseña de karla)");
  } else {
    await crearSiNoExiste({
      nombre: "Karla",
      usuario: "karla",
      rol: "encargada",
      password: process.env.KARLA_PASSWORD,
    });
  }

  if (!process.env.VENDEDOR_PASSWORD) {
    PENDIENTES.push("VENDEDOR_PASSWORD (contraseña de vendedor)");
  } else {
    await crearSiNoExiste({
      nombre: "Vendedor",
      usuario: "vendedor",
      rol: "vendedor",
      password: process.env.VENDEDOR_PASSWORD,
    });
  }

  if (PENDIENTES.length > 0) {
    console.log("\n⚠️  Usuarios NO creados por falta de contraseñas en el .env:");
    for (const pendiente of PENDIENTES) {
      console.log(`   - Falta ${pendiente}`);
    }
    console.log(
      "\nDefinir la contraseña en backend/.env y volver a ejecutar: npm run seed:usuarios",
    );
  }

  process.exit(0);
}

seed();