function Usuarios() {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Usuarios</h3>
          <p className="text-muted small mb-0">Administración de usuarios del sistema.</p>
        </div>
        <button className="btn btn-success btn-sm">
          <i className="bi bi-plus-lg me-1"></i>Nuevo Usuario
        </button>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5 text-muted">
          <i className="bi bi-person-fill-gear fs-1 d-block mb-2"></i>
          <p className="mb-0">Módulo de usuarios en desarrollo.</p>
        </div>
      </div>
    </div>
  );
}

export default Usuarios;
