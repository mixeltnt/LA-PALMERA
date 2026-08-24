const { spawn } = require("node:child_process");
const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");

const LAUNCHER_DIR = __dirname;
const ROOT = path.resolve(LAUNCHER_DIR, "..");
const BACKEND_DIR = path.join(ROOT, "backend");
const SERVER_JS = path.join(BACKEND_DIR, "src", "server.js");
const LOG_DIR = path.join(LAUNCHER_DIR, "logs");
const LOG_FILE = path.join(LOG_DIR, "lapalmera.log");
const LOCK_FILE = path.join(LOG_DIR, "lapalmera.pid");
const PID_FILE = path.join(LOG_DIR, "lapalmera-backend.pid");
const STOP_FLAG = path.join(LOG_DIR, "lapalmera-detenido.flag");

const PUERTO = 4000;
const URL = "http://localhost:4000/";
const MONGODB_HOST = "127.0.0.1";
const MONGODB_PORT = 27017;
const MAX_REINTENTOS = 3;
const TIMEOUT_LISTO_MS = 30000;

function log(mensaje) {
  const linea = `${new Date().toISOString()} ${mensaje}`;
  try {
    fs.appendFileSync(LOG_FILE, linea + "\n");
  } catch {}
  console.log(linea);
}

function logError(mensaje) {
  log(`ERROR: ${mensaje}`);
}

function cleanup() {
  try {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
  } catch {}
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch {}
}

function procesoExiste(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function comprobarMongoDB() {
  return new Promise((resolve) => {
    const socket = net.connect({
      host: MONGODB_HOST,
      port: MONGODB_PORT,
      timeout: 1500,
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function puertoEscucha() {
  return new Promise((resolve) => {
    const socket = net.connect({
      host: "127.0.0.1",
      port: PUERTO,
      timeout: 800,
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function fetchConTimeout(url, ms) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(ms), redirect: "manual" });
  } catch {
    return null;
  }
}

async function esLaPalmera() {
  const respuesta = await fetchConTimeout(URL, 3000);
  if (!respuesta) {
    return { palmera: false, ocupado: false };
  }
  const tipo = respuesta.headers.get("content-type") || "";
  if (tipo.includes("text/html")) {
    return { palmera: true, ocupado: true };
  }
  if (tipo.includes("application/json")) {
    try {
      const datos = await respuesta.json();
      if (datos && typeof datos.mensaje === "string" && datos.mensaje.includes("La Palmera")) {
        return { palmera: true, ocupado: true };
      }
    } catch {}
  }
  return { palmera: false, ocupado: true };
}

async function reutilizarBackendExistente() {
  const respuesta = await fetchConTimeout(URL, 3000);
  if (respuesta && respuesta.status === 200) {
    log(
      `el puerto ${PUERTO} ya responde La Palmera (HTTP 200): ` +
        "se reutilizó el backend existente y se abrió la aplicación",
    );
    abrirNavegador();
    log("La Palmera abierta en el navegador");
    return true;
  }
  mostrarAlerta(
    `La Palmera no está disponible.\n\n` +
      `http://localhost:${PUERTO}/ no responde correctamente. ` +
      "No se abrirá la aplicación.",
  );
  logError(
    `La Palmera no está disponible: el puerto ${PUERTO} está ocupado pero ` +
      `http://localhost:${PUERTO}/ no responde HTTP 200. ` +
      "No se abrirá el navegador ni se iniciará un segundo backend.",
  );
  return false;
}

function mostrarAlerta(mensaje) {
  if (process.platform !== "win32") return;
  const script =
    "Add-Type -AssemblyName System.Windows.Forms; " +
    `[System.Windows.Forms.MessageBox]::Show('${mensaje.replace(/'/g, "''")}', 'La Palmera')`;
  try {
    spawn(
      "powershell.exe",
      ["-NoProfile", "-WindowStyle", "Hidden", "-Command", script],
      { windowsHide: true, stdio: "ignore" },
    );
  } catch {}
}

function abrirNavegador() {
  const comando =
    process.platform === "win32"
      ? ["cmd", "/c", "start", "", URL]
      : ["xdg-open", URL];
  const proceso = spawn(comando[0], comando.slice(1), {
    windowsHide: true,
    stdio: "ignore",
  });
  proceso.on("error", (error) => {
    logError(`no se pudo abrir el navegador: ${error.message}`);
  });
}

async function esperarBackend(msTotal) {
  const inicio = Date.now();
  while (Date.now() - inicio < msTotal) {
    const respuesta = await fetchConTimeout(URL, 1500);
    if (respuesta && respuesta.status === 200) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function iniciarYVigilarBackend() {
  let reintentos = 0;

  while (true) {
    if (fs.existsSync(STOP_FLAG)) fs.unlinkSync(STOP_FLAG);
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);

    log("iniciando backend: node src/server.js");
    const hijo = spawn(process.execPath, ["src/server.js"], {
      cwd: BACKEND_DIR,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    fs.writeFileSync(PID_FILE, String(hijo.pid));

    hijo.stdout.on("data", (datos) => {
      const texto = String(datos).trim();
      if (texto) log(`backend: ${texto}`);
    });
    hijo.stderr.on("data", (datos) => {
      const texto = String(datos).trim();
      if (texto) log(`backend: ${texto}`);
    });

    const resultado = await Promise.race([
      esperarBackend(TIMEOUT_LISTO_MS).then((ok) => ({ ok })),
      new Promise((resolve) =>
        hijo.once("exit", (codigo) => resolve({ salio: codigo })),
      ),
    ]);

    if (resultado.salio !== undefined) {
      logError(
        `el backend terminó antes de estar listo (código ${resultado.salio}). ` +
          "Revisa la configuración del entorno en backend/.env.",
      );
      cleanup();
      process.exit(1);
    }

    if (!resultado.ok) {
      logError(`el backend no respondió en ${TIMEOUT_LISTO_MS / 1000} segundos`);
      hijo.kill();
      cleanup();
      process.exit(1);
    }

    log(`backend listo en ${URL}`);
    abrirNavegador();
    log("La Palmera abierta en el navegador");

    const codigo = await new Promise((resolve) =>
      hijo.once("exit", (exitCode) => resolve(exitCode)),
    );

    if (fs.existsSync(STOP_FLAG)) {
      fs.unlinkSync(STOP_FLAG);
      log("backend detenido correctamente");
      cleanup();
      process.exit(0);
    }

    if (reintentos >= MAX_REINTENTOS) {
      logError("el backend no pudo mantenerse en ejecución");
      cleanup();
      process.exit(1);
    }

    reintentos++;
    log(
      `backend terminó inesperadamente (código ${codigo}); reintento ${reintentos}/${MAX_REINTENTOS}`,
    );
  }
}

async function main() {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  if (fs.existsSync(LOCK_FILE)) {
    const pid = Number(fs.readFileSync(LOCK_FILE, "utf8").trim() || 0);
    if (procesoExiste(pid)) {
      log("La Palmera ya está abierta.");
      await reutilizarBackendExistente();
      return;
    }
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {}
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));

  try {
    if (!fs.existsSync(SERVER_JS)) {
      logError(`no se encontró ${SERVER_JS}`);
      return;
    }

    const mongoOk = await comprobarMongoDB();
    if (!mongoOk) {
      logError(
        `MongoDB no responde en ${MONGODB_HOST}:${MONGODB_PORT}. ` +
          "Asegúrate de que el servicio MongoDB Server de Windows esté en ejecución.",
      );
      return;
    }
    log("MongoDB disponible");

    if (await puertoEscucha()) {
      const estado = await esLaPalmera();
      if (estado.palmera) {
        await reutilizarBackendExistente();
        return;
      }
      logError(
        `el puerto ${PUERTO} está ocupado por otro proceso que no es La Palmera. ` +
          "Ciérralo o cambia el puerto antes de continuar.",
      );
      return;
    }

    await iniciarYVigilarBackend();
  } catch (error) {
    logError(`error inesperado: ${error.message}`);
  } finally {
    cleanup();
  }
}

process.on("SIGINT", () => {
  log("cerrando La Palmera");
  if (fs.existsSync(PID_FILE)) {
    const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim() || 0);
    if (procesoExiste(pid)) {
      try {
        process.kill(pid);
      } catch {}
    }
  }
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.emit("SIGINT");
});

main();