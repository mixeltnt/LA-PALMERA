function Compras() {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Compras</h3>
          <p className="text-muted small mb-0">Registro de compras y órdenes.</p>
        </div>
        <button className="btn btn-success btn-sm">
          <i className="bi bi-plus-lg me-1"></i>Nueva Compra
        </button>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5 text-muted">
          <i className="bi bi-truck fs-1 d-block mb-2"></i>
          <p className="mb-0">Módulo de compras en desarrollo.</p>
        </div>
      </div>
    </div>
  );
}

export default Compras;
