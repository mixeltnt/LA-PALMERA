export function normalizeText(val) {
  if (val == null) return "";
  return String(val).trim();
}

export function validateEmail(email) {
  if (!email) return true;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(email).trim());
}

export function validarRut(rut) {
  if (!rut) return false;
  const valor = String(rut)
    .replace(/[^0-9kK]/g, "")
    .toUpperCase();
  if (!valor || valor.length < 2) return false;

  const cuerpo = valor.slice(0, -1);
  const dv = valor.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo.charAt(i)) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dvEsperado === dv;
}

export function formatRut(value) {
  if (!value) return "";
  const v = String(value)
    .replace(/[^0-9kK]/g, "")
    .toUpperCase();
  if (!v) return "";
  const cuerpo = v.slice(0, -1);
  const dv = v.slice(-1);
  let withDots = "";
  for (let i = 0, p = cuerpo.length; p > 0; p -= 3, i++) {
    const start = Math.max(0, p - 3);
    const part = cuerpo.slice(start, p);
    withDots = withDots ? part + "." + withDots : part;
  }
  return withDots ? `${withDots}-${dv}` : `${dv}`;
}

export function mapBackendErrors(errArr) {
  if (!Array.isArray(errArr)) return {};
  const mapped = {};
  errArr.forEach((m) => {
    const text = String(m || "");
    if (/correo/i.test(text)) mapped.correo = text;
    else if (/rut/i.test(text)) mapped.rut = text;
    else if (/nombre/i.test(text)) mapped.nombre = text;
    else if (/telefono|teléfono/i.test(text)) mapped.telefono = text;
    else mapped._global = (mapped._global ? mapped._global + "\n" : "") + text;
  });
  return mapped;
}
