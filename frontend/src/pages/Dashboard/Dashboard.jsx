import { useCallback, useEffect, useState } from "react";
import productService from "../../services/productService";
import clientService from "../../services/clientService";
import categoryService from "../../services/categoryService";

function Dashboard() {
  const [productStats, setProductStats] = useState({ total: 0, stockBajo: 0 });
  const [clientCount, setClientCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargarStats = useCallback(async () => {
    try {
      const [pStats, cStats, catStats] = await Promise.all([
        productService.stats(),
        clientService.stats(),
        categoryService.stats(),
      ]);
      setProductStats(pStats);
      setClientCount(cStats.total);
      setCategoryCount(catStats.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarStats();
    const interval = setInterval(cargarStats, 30000);
    return () => clearInterval(interval);
  }, [cargarStats]);

  const cards = [
    { icon: "bi-box-seam-fill", label: "Productos", value: loading ? "..." : productStats.total, color: "primary" },
    { icon: "bi-exclamation-triangle-fill", label: "Stock Bajo", value: loading ? "..." : productStats.stockBajo, color: "danger" },
    { icon: "bi-tags-fill", label: "Categorías", value: loading ? "..." : categoryCount, color: "secondary" },
    { icon: "bi-cart-fill", label: "Ventas Hoy", value: "$185.000", color: "success" },
    { icon: "bi-people-fill", label: "Clientes", value: loading ? "..." : clientCount, color: "info" },
    { icon: "bi-truck", label: "Compras", value: "15", color: "warning" },
    { icon: "bi-currency-dollar", label: "Ingresos", value: "$2.450.000", color: "success" },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Dashboard</h3>
          <p className="text-muted small mb-0">Resumen general del negocio</p>
        </div>
        <span className="badge bg-success bg-opacity-10 text-success px-3 py-2">
          <i className="bi bi-calendar-check me-1"></i>
          {new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>

      <div className="row g-4">
        {cards.map((card) => (
          <div key={card.label} className="col-xl-4 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-3">
                  <div className={`d-flex align-items-center justify-content-center rounded-circle bg-${card.color} bg-opacity-10 text-${card.color}`}
                    style={{ width: 52, height: 52 }}>
                    <i className={`bi ${card.icon} fs-4`}></i>
                  </div>
                  <div>
                    <p className="text-muted small mb-0">{card.label}</p>
                    <h4 className="fw-bold mb-0">{card.value}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mt-2">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
              <h6 className="fw-bold mb-0">Ventas Recientes</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Producto</th>
                      <th>Cliente</th>
                      <th>Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>Leche Entera</td>
                      <td>María García</td>
                      <td>$2.400</td>
                      <td><span className="badge bg-success">Completada</span></td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>Pan Molde</td>
                      <td>Pedro López</td>
                      <td>$1.200</td>
                      <td><span className="badge bg-success">Completada</span></td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>Arroz 1kg</td>
                      <td>Ana Martínez</td>
                      <td>$1.800</td>
                      <td><span className="badge bg-warning text-dark">Pendiente</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
              <h6 className="fw-bold mb-0">Alertas</h6>
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush small">
                <li className="list-group-item d-flex align-items-center gap-2 px-0">
                  <i className="bi bi-exclamation-circle text-danger"></i>
                  <span>{productStats.stockBajo} productos con stock bajo</span>
                </li>
                <li className="list-group-item d-flex align-items-center gap-2 px-0">
                  <i className="bi bi-clock text-warning"></i>
                  <span>3 pedidos pendientes</span>
                </li>
                <li className="list-group-item d-flex align-items-center gap-2 px-0">
                  <i className="bi bi-info-circle text-info"></i>
                  <span>Actualización disponible</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
