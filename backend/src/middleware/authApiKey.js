// Middleware de autenticación por API Key y JWT para La Palmera POS API
import jwt from 'jsonwebtoken';

export function authApiKeyOrJwt(req, res, next) {
  const configuredApiKey = process.env.API_KEY || 'palmera_pos_secret_sync_key_2026';
  
  // 1. Revisar API Key en cabeceras o query string
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['api-key'];
  const apiKeyQuery = req.query.apiKey;

  if (apiKeyHeader === configuredApiKey || apiKeyQuery === configuredApiKey) {
    req.authType = 'api_key';
    return next();
  }

  // 2. Revisar JWT Bearer Token (para usuarios autenticados o app móvil)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET || 'la_palmera_secret_key_2026';
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
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
  const isStrict = process.env.STRICT_AUTH === 'true' || process.env.NODE_ENV === 'production';

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
