function Proveedores() {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Proveedores</h3>
          <p className="text-muted small mb-0">Gestión de proveedores y abastecimiento.</p>
        </div>
        <button className="btn btn-success btn-sm">
          <i className="bi bi-plus-lg me-1"></i>Nuevo Proveedor
        </button>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5 text-muted">
          <i className="bi bi-person-badge fs-1 d-block mb-2"></i>
          <p className="mb-0">Módulo de proveedores en desarrollo.</p>
        </div>
      </div>
    </div>
  );
}

export default Proveedores;
