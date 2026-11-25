// Servicio de Autenticación 100% Local (SQLite) para La Palmera POS
// Utiliza hashes SHA-256 con sal para no exponer contraseñas en texto plano en el bundle dist/
import { User } from '../types/user';
import { dbManager } from '../database/db';

const HASH_SALT = 'lapalmera_v32';

// Implementación SHA-256 pura de respaldo para contextos sin crypto.subtle (ej. HTTP LAN sin TLS)
function sha256Fallback(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const maxWord = Math.pow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  const utf8 = unescape(encodeURIComponent(ascii));
  const padded = utf8 + '\x80';
  let paddedStr = padded;
  while ((paddedStr.length % 64) - 56) paddedStr += '\x00';
  for (let i = 0; i < paddedStr.length; i++) {
    const j = paddedStr.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  const bitLen = utf8.length * 8;
  words[words.length] = (bitLen / maxWord) | 0;
  words[words.length] = bitLen | 0;
  void asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] = i < 16 ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export async function hashLocalPassword(username: string, password: string): Promise<string> {
  const input = `${HASH_SALT}:${username.trim().toLowerCase()}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest('SHA-256', data);
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `sha256:${hex}`;
    } catch {
      // fallback a implementación JS pura
    }
  }
  return `sha256:${sha256Fallback(input)}`;
}

// Hashes SHA-256 por defecto para los usuarios oficiales de La Palmera (sin texto plano)
const DEFAULT_ACCOUNTS: Record<string, { passwordHash: string; nombre: string; rol: 'admin' | 'supervisor' | 'cajero' }> = {
  yasna: {
    passwordHash: 'sha256:36fd5f3d894e6533f7c3626dcae0bc22ea24c4488bd0d2745c2fa2eba61b1c31',
    nombre: 'Yasna',
    rol: 'admin',
  },
  karla: {
    passwordHash: 'sha256:058b4fdd0fc26138204c0f9ff18ea794272080f3183141a844fb1ce8cdd6db34',
    nombre: 'Karla',
    rol: 'supervisor',
  },
  ventas: { passwordHash: '', nombre: 'VENTAS', rol: 'cajero' },
  vendedor: { passwordHash: '', nombre: 'VENTAS', rol: 'cajero' },
};

export const authService = {
  async login(usuario: string, password: string = ''): Promise<{ usuario: User; token: string }> {
    const rawUser = (usuario || '').trim().toLowerCase();
    const cleanUser = rawUser === 'vendedor' ? 'ventas' : rawUser;
    const cleanPass = (password || '').trim();

    // 1. Caso especial: Usuario ventas (Cajero Rápido) no requiere contraseña
    if (cleanUser === 'ventas') {
      const token = `local_token_${Date.now()}_ventas`;
      return {
        usuario: {
          id: 3,
          username: 'ventas',
          nombre: 'VENTAS',
          rol: 'cajero',
          activo: true,
        },
        token,
      };
    }

    const computedHash = await hashLocalPassword(cleanUser, cleanPass);
    const defaultAccount = DEFAULT_ACCOUNTS[cleanUser];

    // 2. Validación contra SQLite
    let dbUserFound = false;
    try {
      const db = await dbManager.getConnection();
      const rows = await db.select<any>(
        'SELECT * FROM usuarios WHERE lower(username) = ? AND activo = 1 LIMIT 1',
        [cleanUser]
      );

      if (rows && rows.length > 0) {
        const dbUser = rows.find((r: any) => String(r.username || '').trim().toLowerCase() === cleanUser);
        if (dbUser) {
          dbUserFound = true;
          const stored = String(dbUser.password_hash || '');
          const matchesStoredHash = stored === computedHash;
          const matchesLegacyPlain = Boolean(stored && !stored.startsWith('sha256:') && stored === cleanPass);
          // Solo usar defaultAccount si el registro en BD aún no tiene password_hash configurado
          const matchesDefaultWhenEmpty = Boolean(!stored && defaultAccount && defaultAccount.passwordHash === computedHash);

          if (matchesStoredHash || matchesLegacyPlain || matchesDefaultWhenEmpty) {
            // Migrar automáticamente contraseñas legacy en texto plano o vacías a hash SHA-256
            if (matchesLegacyPlain || matchesDefaultWhenEmpty) {
              await db.execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [computedHash, dbUser.id]).catch(() => {});
            }
            const token = `local_token_${Date.now()}_${cleanUser}`;
            return {
              usuario: {
                id: dbUser.id,
                username: dbUser.username,
                nombre: dbUser.nombre,
                rol: dbUser.rol as any,
                activo: true,
              },
              token,
            };
          }
          // El usuario existe en SQLite con un password_hash distinto: rechazar sin hacer fallback a contraseña por defecto
          throw new Error('Usuario o contraseña incorrectos.');
        }
      }
    } catch (err: any) {
      if (err?.message === 'Usuario o contraseña incorrectos.') {
        throw err;
      }
      console.warn('[Auth] Error consultando SQLite usuarios:', err);
    }

    // 3. Validación de respaldo directo con hash SHA-256 (solo si el usuario no existe aún en SQLite)
    if (!dbUserFound && defaultAccount && (defaultAccount.passwordHash === '' || defaultAccount.passwordHash === computedHash)) {
      const token = `local_token_${Date.now()}_${cleanUser}`;
      return {
        usuario: {
          id: cleanUser === 'yasna' ? 1 : cleanUser === 'karla' ? 2 : 3,
          username: cleanUser,
          nombre: defaultAccount.nombre,
          rol: defaultAccount.rol,
          activo: true,
        },
        token,
      };
    }

    throw new Error('Usuario o contraseña incorrectos.');
  },

  async loginVentas(): Promise<{ usuario: User; token: string }> {
    return this.login('ventas', '');
  },
};
