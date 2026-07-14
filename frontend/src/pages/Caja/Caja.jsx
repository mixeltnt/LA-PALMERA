function Caja() {
  return (
    <div>
      <h2 className="fw-bold text-success mb-3">Caja</h2>
      <p className="text-muted">
        Control de apertura, cierres y movimientos de dinero.
      </p>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Estado de caja</h5>
              <p className="mb-2">Caja abierta</p>
              <p className="fw-bold fs-4">$85.000</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Movimientos</h5>
              <ul className="mb-0">
                <li>Ingreso: $20.000</li>
                <li>Egreso: $5.000</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Caja;
