function Ventas() {
  return (
    <div>
      <h2 className="fw-bold text-success mb-3">Ventas</h2>
      <p className="text-muted">
        Punto de venta con carrito y métodos de pago.
      </p>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <input
                className="form-control mb-3"
                placeholder="Buscar producto"
              />
              <div className="border rounded p-3">
                Lista de productos disponibles
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Carrito</h5>
              <ul className="list-group mb-3">
                <li className="list-group-item d-flex justify-content-between">
                  <span>Leche</span>
                  <span>$1.200</span>
                </li>
              </ul>
              <div className="d-flex justify-content-between">
                <strong>Total</strong>
                <strong>$1.200</strong>
              </div>
              <button className="btn btn-success w-100 mt-3">Vender</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Ventas;
