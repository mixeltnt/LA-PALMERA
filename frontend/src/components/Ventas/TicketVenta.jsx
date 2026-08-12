import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./TicketVenta.css";

const METODO_PAGO_LABELS = {
  EFECTIVO: "Efectivo",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TRANSFERENCIA: "Transferencia",
  CAJA_VECINA: "Caja Vecina",
  FIADO: "Fiado",
};

const formatMoney = (value) => {
  const numeric = Number(value) || 0;
  return `$${numeric.toLocaleString("es-CL")}`;
};

const formatFechaHora = (value) => {
  try {
    if (!value) return "—";
    return new Date(value).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
};

function TicketVenta({
  venta,
  detalles = [],
  montoRecibido,
  saldoCliente,
  onAfterPrint,
}) {
  const total = Number(venta?.total || 0);
  const recibido = Number(montoRecibido) || 0;
  const vuelto = recibido - total;
  const esEfectivo = venta?.metodoPago === "EFECTIVO";
  const esFiado = venta?.metodoPago === "FIADO";
  const metodoLabel =
    METODO_PAGO_LABELS[venta?.metodoPago] || venta?.metodoPago || "—";
  const vendedor =
    venta?.usuario?.nombre || venta?.usuario?.usuario || "Usuario";
  const clienteNombre = venta?.cliente?.nombre || "Consumidor Final";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (typeof onAfterPrint === "function") {
        onAfterPrint();
      }
    };
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [onAfterPrint]);

  return createPortal(
    <div className="ticket-print-area">
      <div className="ticket-header">
        <div className="ticket-nombre">LA PALMERA</div>
        <div className="ticket-subtitulo">TICKET DE VENTA</div>
      </div>

      <div className="ticket-cuerpo">
        <div className="ticket-fila">
          <span>Fecha:</span>
          <span>{formatFechaHora(venta?.fecha)}</span>
        </div>
        <div className="ticket-fila">
          <span>Venta N°:</span>
          <span>{venta?.numeroVenta ?? "—"}</span>
        </div>
        <div className="ticket-fila">
          <span>Vendedor:</span>
          <span>{vendedor}</span>
        </div>
        <div className="ticket-fila">
          <span>Cliente:</span>
          <span>
            {clienteNombre}
            {venta?.cliente?.rut ? ` (${venta.cliente.rut})` : ""}
          </span>
        </div>
        <div className="ticket-separador">------------------------------</div>

        <table className="ticket-tabla">
          <thead>
            <tr>
              <th className="ticket-tabla-nombre">Producto</th>
              <th className="ticket-tabla-cant">Cant</th>
              <th className="ticket-tabla-monto">P.Unit.</th>
              <th className="ticket-tabla-monto">Total</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((item, index) => (
              <tr key={item._id || index}>
                <td className="ticket-tabla-nombre">
                  {item.producto?.nombre || "Producto eliminado"}
                  {Number(item.descuento) > 0 && (
                    <div className="ticket-nota">
                      desc. {formatMoney(item.descuento)}
                    </div>
                  )}
                </td>
                <td className="ticket-tabla-cant">{item.cantidad}</td>
                <td className="ticket-tabla-monto">
                  {formatMoney(item.precioUnitario)}
                </td>
                <td className="ticket-tabla-monto">
                  {formatMoney(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ticket-separador">------------------------------</div>

        <div className="ticket-fila">
          <span>Subtotal</span>
          <span>{formatMoney(venta?.subtotal)}</span>
        </div>
        <div className="ticket-fila">
          <span>Descuento</span>
          <span>- {formatMoney(venta?.descuento)}</span>
        </div>
        <div className="ticket-fila ticket-total">
          <span>TOTAL</span>
          <span>{formatMoney(total)}</span>
        </div>

        <div className="ticket-separador">------------------------------</div>

        <div className="ticket-fila">
          <span>Método de pago</span>
          <span>{metodoLabel}</span>
        </div>

        {esEfectivo && montoRecibido != null && (
          <>
            <div className="ticket-fila">
              <span>Recibido</span>
              <span>{formatMoney(recibido)}</span>
            </div>
            <div className="ticket-fila">
              <span>Vuelto</span>
              <span>{formatMoney(Math.max(vuelto, 0))}</span>
            </div>
          </>
        )}

        {esFiado && saldoCliente && (
          <>
            <div className="ticket-separador">------------------------------</div>
            <div className="ticket-fila">
              <span>Deuda anterior</span>
              <span>{formatMoney(saldoCliente.saldoPendiente)}</span>
            </div>
            <div className="ticket-fila">
              <span>Esta venta</span>
              <span>{formatMoney(total)}</span>
            </div>
            <div className="ticket-fila">
              <span>Nueva deuda</span>
              <span>
                {formatMoney(
                  Number(saldoCliente.saldoPendiente || 0) + total,
                )}
              </span>
            </div>
            <div className="ticket-fila">
              <span>Disponible</span>
              <span>{formatMoney(saldoCliente.disponible)}</span>
            </div>
          </>
        )}

        {venta?.observaciones && (
          <>
            <div className="ticket-separador">------------------------------</div>
            <div className="ticket-nota">Obs: {venta.observaciones}</div>
          </>
        )}
      </div>

      <div className="ticket-footer">Gracias por su compra</div>
    </div>,
    document.body,
  );
}

export default TicketVenta;