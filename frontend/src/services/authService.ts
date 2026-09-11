// Servicio de Autenticación 100% Local (SQLite) para La Palmera POS
import { User } from '../types/user';
import { dbManager } from '../database/db';

// Credenciales para los usuarios del sistema
const CREDENTIALS: Record<string, { password: string; nombre: string; rol: 'admin' | 'supervisor' | 'cajero' }> = {
  yasna: { password: 'Carlos1941', nombre: 'Yasna', rol: 'admin' },
  karla: { password: 'Karla2004', nombre: 'Karla', rol: 'supervisor' },
  ventas: { password: '', nombre: 'VENTAS', rol: 'cajero' },
  vendedor: { password: '', nombre: 'VENTAS', rol: 'cajero' },
};

export const authService = {
  async login(usuario: string, password: string = ''): Promise<{ usuario: User; token: string }> {
    const rawUser = (usuario || '').trim().toLowerCase();
    const cleanUser = rawUser === 'vendedor' ? 'ventas' : rawUser;
    const cleanPass = (password || '').trim();

    // 1. Caso especial: Usuario ventas no requiere contraseña
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

    // 2. Validación contra SQLite
    try {
      const db = await dbManager.getConnection();
      const rows = await db.select<any>(
        'SELECT * FROM usuarios WHERE lower(username) = ? AND activo = 1 LIMIT 1',
        [cleanUser]
      );

      if (rows && rows.length > 0) {
        const dbUser = rows[0];
        const cred = CREDENTIALS[cleanUser];
        // Validar contraseña (si no tiene password_hash o coincide)
        if (!dbUser.password_hash || (cred && cred.password === cleanPass) || dbUser.password_hash === cleanPass) {
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
      }
    } catch (err) {
      console.warn('[Auth] Error consultando SQLite usuarios:', err);
    }

    // 3. Validación de respaldo directo
    const defaultUser = CREDENTIALS[cleanUser];
    if (defaultUser && (defaultUser.password === '' || defaultUser.password === cleanPass)) {
      const token = `local_token_${Date.now()}_${cleanUser}`;
      return {
        usuario: {
          id: cleanUser === 'yasna' ? 1 : cleanUser === 'karla' ? 2 : 3,
          username: cleanUser,
          nombre: defaultUser.nombre,
          rol: defaultUser.rol,
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
