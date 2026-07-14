function Reportes() {
  return (
    <div>
      <h2 className="fw-bold text-success mb-3">Reportes</h2>
      <p className="text-muted">
        Información diaria, mensual, anual y por producto.
      </p>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>Ventas del día</h5>
              <p className="fs-4 fw-bold">$185.000</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>Productos más vendidos</h5>
              <p>Leche, Arroz, Galletas</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>Ganancias</h5>
              <p className="fs-4 fw-bold">$42.000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reportes;
