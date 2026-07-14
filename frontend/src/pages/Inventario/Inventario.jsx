function Inventario() {
  return (
    <div>
      <h2 className="fw-bold text-success mb-3">Inventario</h2>
      <p className="text-muted">
        Entradas, salidas, ajustes y estado del stock.
      </p>

      <div className="row g-4 mt-2">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Movimientos recientes</h5>
              <ul className="mb-0">
                <li>Entrada de 20 unidades - Leche</li>
                <li>Salida de 5 unidades - Arroz</li>
                <li>Ajuste por daño - Galletas</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Alertas de stock</h5>
              <ul className="mb-0">
                <li>Stock mínimo alcanzado: Café</li>
                <li>Stock mínimo alcanzado: Pan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inventario;
