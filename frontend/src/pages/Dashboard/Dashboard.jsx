function Dashboard() {
  return (
    <div className="container mt-5">
      <h1 className="text-success">🌴 Dashboard - La Palmera</h1>

      <p className="lead">Bienvenido al sistema de gestión.</p>

      <div className="row mt-4">
        <div className="col-md-3">
          <div className="card shadow">
            <div className="card-body text-center">
              <h2>📦</h2>
              <h5>Productos</h5>
              <h3>250</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow">
            <div className="card-body text-center">
              <h2>💰</h2>
              <h5>Ventas Hoy</h5>
              <h3>$185.000</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow">
            <div className="card-body text-center">
              <h2>📊</h2>
              <h5>Inventario</h5>
              <h3>95%</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow">
            <div className="card-body text-center">
              <h2>💵</h2>
              <h5>Caja</h5>
              <h3>Abierta</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
