// Middleware de autenticación por API Key y JWT para La Palmera POS API
import jwt from 'jsonwebtoken';
import { query } from '../config/postgres.js';

const ROLES_GESTION = ['admin', 'encargada', 'supervisor'];

export async function authApiKeyOrJwt(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredApiKey = isProd
    ? (process.env.API_KEY || '')
    : (process.env.API_KEY || 'palmera_pos_secret_sync_key_2026');

  // 1. Revisar API Key solo por cabecera HTTP (evitar exposición en query string / logs de Render)
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['api-key'];

  if (configuredApiKey && apiKeyHeader && apiKeyHeader === configuredApiKey) {
    req.authType = 'api_key';
    return next();
  }

  // 2. Revisar JWT Bearer Token (para usuarios administrativos autenticados en Panel Web / móvil)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET || (isProd ? '' : 'la_palmera_secret_key_2026');
      if (!secret) {
        return res.status(500).json({ success: false, mensaje: 'JWT_SECRET no configurado' });
      }
      const decoded = jwt.verify(token, secret);
      const userRes = await query(
        'SELECT id, username, nombre, rol, activo FROM usuarios WHERE id = $1 LIMIT 1',
        [decoded.id]
      );
      if (userRes.rows.length === 0 || !userRes.rows[0].activo) {
        return res.status(401).json({
          success: false,
          mensaje: 'Token inválido o usuario inactivo.',
        });
      }
      const dbUser = userRes.rows[0];
      if (!ROLES_GESTION.includes(dbUser.rol)) {
        return res.status(403).json({
          success: false,
          mensaje: 'No autorizado para acceder a este recurso.',
        });
      }
      req.user = dbUser;
      req.usuario = dbUser;
      req.authType = 'jwt';
      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        mensaje: 'Token de autenticación expirado o inválido',
      });
    }
  }

  // 3. Si no se proporcionó autenticación válida
  // Solo permitir dev_fallback si estamos explícitamente en desarrollo local Y no se ha activado STRICT_AUTH
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const isStrict = process.env.STRICT_AUTH === 'true' || isProd;

  if (isDev && !isStrict) {
    req.authType = 'dev_fallback';
    return next();
  }

  return res.status(401).json({
    success: false,
    mensaje: 'Acceso no autorizado. Se requiere x-api-key válida o token Bearer.',
  });
}

export default authApiKeyOrJwt;
