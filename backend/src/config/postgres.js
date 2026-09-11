import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback

const { Pool } = pg;

let pool = null;
let isConnected = false;
let lastConnectionError = null;

export function getPostgresPool() {
  if (pool) return pool;

  const connectionConfig = {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'lapalmera',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    max: parseInt(process.env.PGMAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  // Si DATABASE_URL está definido, usarlo preferentemente con soporte SSL automático para proveedores cloud
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const isCloudHost = url.includes('neon.tech') || url.includes('supabase') || url.includes('render.com') || url.includes('railway.app') || url.includes('aivencloud');
    const isSslRequested = url.includes('sslmode=require') || url.includes('ssl=true') || process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production' || isCloudHost;

    pool = new Pool({
      connectionString: url,
      ssl: isSslRequested ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.PGMAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  } else {
    pool = new Pool(connectionConfig);
  }

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool] Error inesperado en cliente inactivo:', err.message);
  });

  return pool;
}

export async function query(text, params) {
  const p = getPostgresPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.log(`[PostgreSQL] Query lenta (${duration}ms):`, text.slice(0, 100));
    }
    return res;
  } catch (error) {
    console.error(`[PostgreSQL] Error ejecutando query:`, error.message);
    throw error;
  }
}

export async function getClient() {
  const p = getPostgresPool();
  return await p.connect();
}

export async function testPostgresConnection() {
  try {
    const p = getPostgresPool();
    const res = await p.query('SELECT NOW() as now, version() as version');
    isConnected = true;
    lastConnectionError = null;
    return {
      ok: true,
      timestamp: res.rows[0].now,
      version: res.rows[0].version,
    };
  } catch (error) {
    isConnected = false;
    lastConnectionError = error.message;
    return {
      ok: false,
      error: error.message,
    };
  }
}

export async function initPostgres() {
  try {
    const connTest = await testPostgresConnection();
    if (!connTest.ok) {
      console.warn(`[PostgreSQL] ⚠️ No se pudo conectar a PostgreSQL (${connTest.error}). El backend continuará operando para endpoints locales y reintentará la conexión.`);
      return false;
    }

    console.log(`[PostgreSQL] ✅ Conectado exitosamente a PostgreSQL.`);

    // Ejecutar esquema DDL
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.join(__dirname, '..', 'database', 'schemaPostgres.sql');
    
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await query(sql);
      console.log('[PostgreSQL] ✅ Tablas e índices verificados y listos en PostgreSQL.');
    }

    return true;
  } catch (err) {
    console.error('[PostgreSQL] ❌ Error inicializando esquema PostgreSQL:', err.message);
    return false;
  }
}

export function getPostgresStatus() {
  return {
    isConnected,
    lastError: lastConnectionError,
  };
}
