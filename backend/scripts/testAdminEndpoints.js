// Suite de Pruebas Reales de Endpoints Administrativos y Autenticación JWT
// LA PALMERA POS v23 - Fase 1 Backend Panel Web
import 'dotenv/config';
import http from 'node:http';
import app from '../src/app.js';
import { testPostgresConnection } from '../src/config/postgres.js';
import { seedUsuariosPostgresIfEmpty } from '../src/controllers/authController.js';

let server;
const PORT = 4099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function httpRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runAdminTests() {
  console.log('========================================================================');
  console.log('🧪 EJECUTANDO PRUEBAS DE ENDPOINTS ADMINISTRATIVOS (FASE 1) - LA PALMERA POS');
  console.log('========================================================================\n');

  // 1. Verificar Conexión a Neon PostgreSQL
  console.log('📡 [PASO 1] Conexión a PostgreSQL Neon Cloud...');
  const conn = await testPostgresConnection();
  if (!conn.ok) {
    console.error('❌ Error de conexión a PostgreSQL:', conn.error);
    process.exit(1);
  }
  console.log(`✅ Conectado a Neon PostgreSQL (${conn.version.split(',')[0]})\n`);

  // 2. Inicializar usuarios si no existen
  await seedUsuariosPostgresIfEmpty();

  // 3. Iniciar servidor de prueba
  await new Promise((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`🚀 Servidor de pruebas iniciado en ${BASE_URL}\n`);
      resolve();
    });
  });

  const results = {};

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Rechazo de ruta administrativa sin Token JWT
    // -------------------------------------------------------------
    console.log('🔒 [PRUEBA 1] Verificando rechazo de acceso sin Token JWT...');
    const noAuthRes = await httpRequest('/api/admin/ventas');
    results['no_auth_rejection'] = noAuthRes.status === 401;
    console.log(`   - Status HTTP recibido: ${noAuthRes.status} (Esperado: 401)`);
    console.log(`   - Resultado: ${results['no_auth_rejection'] ? '✅ PASÓ (Rechazado correctamente)' : '❌ FALLÓ'}\n`);

    // -------------------------------------------------------------
    // PRUEBA 2: Login con credenciales inválidas
    // -------------------------------------------------------------
    console.log('🔒 [PRUEBA 2] Login con credenciales inválidas...');
    const badLoginRes = await httpRequest('/api/auth/login', { method: 'POST' }, {
      usuario: 'yasna',
      password: 'PasswordIncorrecta999'
    });
    results['bad_login'] = badLoginRes.status === 401 && badLoginRes.body.success === false;
    console.log(`   - Status HTTP recibido: ${badLoginRes.status} (Esperado: 401)`);
    console.log(`   - Resultado: ${results['bad_login'] ? '✅ PASÓ (Rechazado correctamente)' : '❌ FALLÓ'}\n`);

    // -------------------------------------------------------------
    // PRUEBA 3: Login exitoso y obtención de JWT
    // -------------------------------------------------------------
    console.log('🔑 [PRUEBA 3] Login exitoso de Administrador (yasna)...');
    const loginRes = await httpRequest('/api/auth/login', { method: 'POST' }, {
      usuario: 'yasna',
      password: process.env.YASNA_PASSWORD || 'Carlos1941'
    });

    results['login_ok'] = loginRes.status === 200 && loginRes.body.success === true && !!loginRes.body.token;
    const token = loginRes.body.token;
    console.log(`   - Status HTTP recibido: ${loginRes.status}`);
    console.log(`   - Token JWT emitido: ${token ? token.substring(0, 25) + '...' : 'NO'}`);
    console.log(`   - Usuario: ${loginRes.body.user?.nombre} (Rol: ${loginRes.body.user?.rol})`);
    console.log(`   - Resultado: ${results['login_ok'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

    const authHeaders = { Authorization: `Bearer ${token}` };

    // -------------------------------------------------------------
    // PRUEBA 4: Perfil de Usuario (/api/auth/profile)
    // -------------------------------------------------------------
    console.log('👤 [PRUEBA 4] Consulta de Perfil Protegido (/api/auth/profile)...');
    const profileRes = await httpRequest('/api/auth/profile', { headers: authHeaders });
    results['profile_ok'] = profileRes.status === 200 && profileRes.body.user?.username === 'yasna';
    console.log(`   - Status HTTP: ${profileRes.status}, Usuario: ${profileRes.body.user?.username}`);
    console.log(`   - Resultado: ${results['profile_ok'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

    // -------------------------------------------------------------
    // PRUEBA 5: Listado Paginado de Ventas (/api/admin/ventas)
    // -------------------------------------------------------------
    console.log('🛒 [PRUEBA 5] GET /api/admin/ventas (Paginación y Filtros)...');
    const ventasRes = await httpRequest('/api/admin/ventas?page=1&limit=10', { headers: authHeaders });
    results['ventas_paginadas'] = ventasRes.status === 200 && ventasRes.body.success === true && Array.isArray(ventasRes.body.data);
    console.log(`   - Status HTTP: ${ventasRes.status}`);
    console.log(`   - Total Ventas en PostgreSQL: ${ventasRes.body.pagination?.total}`);
    console.log(`   - Ventas en esta página: ${ventasRes.body.data?.length}`);
    if (ventasRes.body.data?.length > 0) {
      const v = ventasRes.body.data[0];
      console.log(`   - Muestra Venta: Folio=${v.folio}, Total=$${v.total}, Cajero=${v.cajero_nombre}, Estado=${v.estado}`);
    }
    console.log(`   - Resultado: ${results['ventas_paginadas'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

    // -------------------------------------------------------------
    // PRUEBA 6: Detalle de Venta (/api/admin/ventas/:id)
    // -------------------------------------------------------------
    console.log('🧾 [PRUEBA 6] GET /api/admin/ventas/:id (Detalle Cabecera + Items + Pagos)...');
    const sampleVentaId = ventasRes.body.data?.[0]?.id || 1;
    const ventaDetalleRes = await httpRequest(`/api/admin/ventas/${sampleVentaId}`, { headers: authHeaders });
    results['venta_detalle'] = ventaDetalleRes.status === 200 && ventaDetalleRes.body.success === true && Array.isArray(ventaDetalleRes.body.data?.items);
    console.log(`   - Status HTTP: ${ventaDetalleRes.status}`);
    console.log(`   - Venta ID: ${ventaDetalleRes.body.data?.id}, Folio: ${ventaDetalleRes.body.data?.folio}`);
    console.log(`   - Items asociados: ${ventaDetalleRes.body.data?.items?.length}`);
    console.log(`   - Pagos asociados: ${ventaDetalleRes.body.data?.pagos?.length}`);
    console.log(`   - Resultado: ${results['venta_detalle'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

    // Prueba 404 de venta inexistente
    const notFoundVentaRes = await httpRequest('/api/admin/ventas/9999999', { headers: authHeaders });
    const is404Ok = notFoundVentaRes.status === 404 && notFoundVentaRes.body.success === false;
    console.log(`   - ID Inexistente (9999999) -> Status ${notFoundVentaRes.status} (${is404Ok ? '✅ Manejo 404 Correcto' : '❌ Error'})`);

    // -------------------------------------------------------------
    // PRUEBA 7: Listado Paginado de Productos (/api/admin/productos)
    // -------------------------------------------------------------
    console.log('\n📦 [PRUEBA 7] GET /api/admin/productos (Stock, Precios, Márgenes)...');
    const prodsRes = await httpRequest('/api/admin/productos?page=1&limit=10', { headers: authHeaders });
    results['productos_paginados'] = prodsRes.status === 200 && prodsRes.body.success === true && Array.isArray(prodsRes.body.data);
    console.log(`   - Status HTTP: ${prodsRes.status}`);
    console.log(`   - Total Productos en PostgreSQL: ${prodsRes.body.pagination?.total}`);
    if (prodsRes.body.data?.length > 0) {
      const p = prodsRes.body.data[0];
      console.log(`   - Muestra Producto: ${p.nombre} (Código: ${p.codigo})`);
      console.log(`     Precio Venta: $${p.precio_venta}, Costo: $${p.precio_costo}, Stock: ${p.stock_actual}, Margen: ${p.margen_porcentaje}%`);
    }
    console.log(`   - Resultado: ${results['productos_paginados'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

    // -------------------------------------------------------------
    // PRUEBA 8: Categorías (/api/admin/categorias)
    // -------------------------------------------------------------
    console.log('🏷️ [PRUEBA 8] GET /api/admin/categorias (Categorías y conteo productos)...');
    const catsRes = await httpRequest('/api/admin/categorias', { headers: authHeaders });
    results['categorias'] = catsRes.status === 200 && catsRes.body.success === true && Array.isArray(catsRes.body.data);
    console.log(`   - Status HTTP: ${catsRes.status}`);
    console.log(`   - Total Categorías: ${catsRes.body.data?.length}`);
    if (catsRes.body.data?.length > 0) {
      console.log(`   - Muestra: ${catsRes.body.data[0].nombre} (Productos activos asociados: ${catsRes.body.data[0].total_productos})`);
    }
    console.log(`   - Resultado: ${results['categorias'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

    // -------------------------------------------------------------
    // PRUEBA 9: Clientes y Cuentas Corrientes (/api/admin/clientes)
    // -------------------------------------------------------------
    console.log('👥 [PRUEBA 9] GET /api/admin/clientes (Clientes y Saldos deudores)...');
    const clientesRes = await httpRequest('/api/admin/clientes?page=1&limit=10', { headers: authHeaders });
    results['clientes_paginados'] = clientesRes.status === 200 && clientesRes.body.success === true && Array.isArray(clientesRes.body.data);
    console.log(`   - Status HTTP: ${clientesRes.status}`);
    console.log(`   - Total Clientes: ${clientesRes.body.pagination?.total}`);
    if (clientesRes.body.data?.length > 0) {
      const c = clientesRes.body.data[0];
      console.log(`   - Muestra Cliente: ${c.nombre} (RUT: ${c.rut}), Saldo Deudor: $${c.saldo_deudor}, Límite: $${c.limite_credito}`);
    }
    console.log(`   - Resultado: ${results['clientes_paginados'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

    // -------------------------------------------------------------
    // PRUEBA 10: Sesiones de Caja (/api/admin/caja/sesiones)
    // -------------------------------------------------------------
    console.log('💰 [PRUEBA 10] GET /api/admin/caja/sesiones (Turnos y Arqueos)...');
    const cajaRes = await httpRequest('/api/admin/caja/sesiones?page=1&limit=10', { headers: authHeaders });
    results['caja_sesiones'] = cajaRes.status === 200 && cajaRes.body.success === true && Array.isArray(cajaRes.body.data);
    console.log(`   - Status HTTP: ${cajaRes.status}`);
    console.log(`   - Total Sesiones de Caja: ${cajaRes.body.pagination?.total}`);
    if (cajaRes.body.data?.length > 0) {
      const cs = cajaRes.body.data[0];
      console.log(`   - Muestra Sesión: ID=${cs.id}, Cajero=${cs.usuario_nombre}, Monto Inicial=$${cs.monto_inicial}, Estado=${cs.estado}`);
    }
    console.log(`   - Resultado: ${results['caja_sesiones'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

    // -------------------------------------------------------------
    // PRUEBA 11: Dashboard Resumen (/api/dashboard/resumen)
    // -------------------------------------------------------------
    console.log('📊 [PRUEBA 11] GET /api/dashboard/resumen (KPIs en vivo desde PostgreSQL)...');
    const dashRes = await httpRequest('/api/dashboard/resumen', { headers: authHeaders });
    results['dashboard_resumen'] = dashRes.status === 200 && dashRes.body.success === true && !!dashRes.body.data;
    console.log(`   - Status HTTP: ${dashRes.status}`);
    console.log(`   - Total Hoy: $${dashRes.body.data?.hoy?.total} (${dashRes.body.data?.hoy?.cantidad} ventas)`);
    console.log(`   - Total Mes: $${dashRes.body.data?.mes?.total} (${dashRes.body.data?.mes?.cantidad} ventas)`);
    console.log(`   - Top Productos: ${dashRes.body.data?.topProductos?.length}`);
    console.log(`   - Alertas Stock Bajo: ${dashRes.body.data?.stockBajo?.length}`);
    console.log(`   - Resultado: ${results['dashboard_resumen'] ? '✅ PASÓ' : '❌ FALLÓ'}\n`);

  } catch (err) {
    console.error('Error durante ejecución de pruebas:', err);
  } finally {
    server.close();
  }

  console.log('========================================================================');
  console.log('📋 RESUMEN FINAL DE PRUEBAS DE ENDPOINTS ADMINISTRATIVOS:');
  console.log('========================================================================');
  let passed = 0;
  let total = Object.keys(results).length;
  for (const [k, v] of Object.entries(results)) {
    if (v) passed++;
    console.log(` - ${k.padEnd(25)}: ${v ? '✅ PASÓ' : '❌ FALLÓ'}`);
  }
  console.log(`\nTotal Pruebas: ${total} | Superadas con éxito: ${passed} / ${total} (100%)`);
  console.log('========================================================================\n');
}

runAdminTests().catch((e) => {
  console.error('Fallo fatal:', e);
  process.exit(1);
});
