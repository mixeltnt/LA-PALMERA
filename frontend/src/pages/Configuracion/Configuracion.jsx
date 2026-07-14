function Configuracion() {
  return (
    <div>
      <h2 className="fw-bold text-success mb-3">Configuración</h2>
      <p className="text-muted">Parámetros generales del negocio.</p>

      <div className="card shadow-sm">
        <div className="card-body">
          <ul>
            <li>Empresa</li>
            <li>Usuarios</li>
            <li>Roles</li>
            <li>Permisos</li>
            <li>Impresora</li>
            <li>Boletas</li>
            <li>IVA</li>
            <li>Respaldo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Configuracion;
