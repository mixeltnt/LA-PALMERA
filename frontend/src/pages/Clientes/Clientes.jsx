import { useCallback, useEffect, useState } from "react";
import clientService from "../../services/clientService";

const TIPO_MOVIMIENTO_LABELS = {
  VENTA_FIADA: "Venta fiada",
  ABONO: "Abono",
  REVERSO_ABONO: "Reverso abono",
};

const emptyForm = {
  nombre: "",
  rut: "",
  telefono: "",
  email: "",
  direccion: "",
  comuna: "",
  observaciones: "",
  limiteFiado: "0",
  activo: true,
};

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showCuenta, setShowCuenta] = useState(false);
  const [cuentaCliente, setCuentaCliente] = useState(null);
  const [movimientosCuenta, setMovimientosCuenta] = useState([]);
  const [saldoPendiente, setSaldoPendiente] = useState(0);
  const [limiteFiado, setLimiteFiado] = useState(0);
  const [loadingCuenta, setLoadingCuenta] = useState(false);

  const [showAbono, setShowAbono] = useState(false);
  const [abonoForm, setAbonoForm] = useState({ monto: "", observacion: "" });
  const [savingAbono, setSavingAbono] = useState(false);

  const [toast, setToast] = useState(null);

  const buildParams = useCallback(() => {
    const params = { page, limit: 10 };
    if (search) params.search = search;
    if (filtro === "activos") params.activo = "true";
    if (filtro === "inactivos") params.activo = "false";
    return params;
  }, [search, filtro, page]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientService.listar(buildParams());
      setClientes(data.clientes);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [search, filtro]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (cliente) => {
    setEditing(cliente);
    setForm({
      nombre: cliente.nombre || "",
      rut: cliente.rut || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
      comuna: cliente.comuna || "",
      observaciones: cliente.observaciones || "",
      limiteFiado:
        cliente.limiteFiado != null ? String(cliente.limiteFiado) : "0",
      activo: cliente.activo !== undefined ? cliente.activo : true,
    });
    setError("");
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const validarForm = () => {
    const errores = [];
    if (!form.nombre.trim())
      errores.push("El nombre del cliente es obligatorio.");
    if (!form.rut.trim()) errores.push("El RUT del cliente es obligatorio.");
    if (form.email && form.email.trim()) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(form.email.trim()))
        errores.push("El formato del email no es válido.");
    }
    const limiteForm = Number(form.limiteFiado);
    if (!Number.isFinite(limiteForm) || limiteForm < 0)
      errores.push("El límite de fiado no puede ser negativo.");
    return errores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errores = validarForm();
    if (errores.length > 0) {
      setError(errores.join(". "));
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await clientService.actualizar(editing._id, form);
        setToast({
          type: "success",
          text: "Cliente actualizado correctamente.",
        });
      } else {
        await clientService.crear(form);
        setToast({ type: "success", text: "Cliente creado correctamente." });
      }
      setShowModal(false);
      cargar();
    } catch (err) {
      setError(err.message || "Error al guardar cliente.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await clientService.eliminar(deleteId);
      setShowDeleteConfirm(false);
      setDeleteId(null);
      setToast({ type: "success", text: "Cliente eliminado correctamente." });
      cargar();
    } catch {
      // silent
    }
  };

  const abrirCuenta = async (cliente) => {
    setShowCuenta(true);
    setCuentaCliente(cliente);
    setLoadingCuenta(true);
    try {
      const data = await clientService.obtenerMovimientos(cliente._id);
      setMovimientosCuenta(data.movimientos || []);
      setSaldoPendiente(data.saldoPendiente || 0);
      setLimiteFiado(
        Number(data.cliente?.limiteFiado ?? 0) || 0,
      );
    } catch (err) {
      setMovimientosCuenta([]);
      setSaldoPendiente(0);
      setLimiteFiado(0);
      setError(err.message || "Error al cargar la cuenta del cliente.");
    } finally {
      setLoadingCuenta(false);
    }
  };

  const openAbono = () => {
    setAbonoForm({ monto: "", observacion: "" });
    setError("");
    setShowAbono(true);
  };

  const handleAbonoChange = (e) => {
    const { name, value } = e.target;
    setAbonoForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleAbono = async (e) => {
    e.preventDefault();
    const monto = Number(abonoForm.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      setError("Ingresa un monto de abono válido.");
      return;
    }
    setSavingAbono(true);
    try {
      await clientService.registrarAbono(cuentaCliente._id, {
        monto,
        observacion: abonoForm.observacion,
      });
      setShowAbono(false);
      setToast({
        type: "success",
        text: "Abono registrado correctamente.",
      });
      await abrirCuenta(cuentaCliente);
    } catch (err) {
      setError(err.message || "Error al registrar el abono.");
    } finally {
      setSavingAbono(false);
    }
  };

  const formatMoney = (value) => {
    const numeric = Number(value) || 0;
    return `$${numeric.toLocaleString("es-CL")}`;
  };

  const getInitials = (nombre) => {
    return (
      nombre
        ?.split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Clientes</h3>
          <p className="text-muted small mb-0">
            Gestión de clientes. Total: {total}
          </p>
        </div>
        <button className="btn btn-success" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i>Nuevo Cliente
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Buscar por nombre, RUT o teléfono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 50 }}></th>
                      <th>Nombre</th>
                      <th>RUT</th>
                      <th>Teléfono</th>
                      <th>Email</th>
                      <th>Dirección</th>
                      <th>Comuna</th>
                      <th>Estado</th>
                      <th className="text-center" style={{ width: 100 }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <div
                            className="d-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10 text-success fw-semibold"
                            style={{ width: 36, height: 36, fontSize: 12 }}
                          >
                            {getInitials(c.nombre)}
                          </div>
                        </td>
                        <td className="fw-semibold">{c.nombre}</td>
                        <td className="text-nowrap">{c.rut}</td>
                        <td>{c.telefono || "—"}</td>
                        <td className="text-truncate" style={{ maxWidth: 160 }}>
                          {c.email || "—"}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 140 }}>
                          {c.direccion || "—"}
                        </td>
                        <td>{c.comuna || "—"}</td>
                        <td>
                          <span
                            className={`badge ${c.activo ? "bg-success" : "bg-secondary"}`}
                          >
                            {c.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => openEdit(c)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-success me-1"
                            onClick={() => abrirCuenta(c)}
                            title="Ver cuenta"
                          >
                            <i className="bi bi-receipt"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => confirmDelete(c._id)}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {clientes.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-4">
                          No se encontraron clientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top">
                  <small className="text-muted">
                    Página {page} de {totalPages} ({total} clientes)
                  </small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li
                        className={`page-item ${page <= 1 ? "disabled" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (n) => (
                          <li
                            key={n}
                            className={`page-item ${n === page ? "active" : ""}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setPage(n)}
                            >
                              {n}
                            </button>
                          </li>
                        ),
                      )}
                      <li
                        className={`page-item ${page >= totalPages ? "disabled" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i
                    className={`bi ${editing ? "bi-pencil" : "bi-person-plus"} me-2`}
                  ></i>
                  {editing ? "Editar Cliente" : "Nuevo Cliente"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit} noValidate>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small">{error}</div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Nombre *
                      </label>
                      <input
                        className="form-control"
                        name="nombre"
                        value={form.nombre}
                        onChange={handleFormChange}
                        required
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        RUT *
                      </label>
                      <input
                        className="form-control"
                        name="rut"
                        value={form.rut}
                        onChange={handleFormChange}
                        required
                        placeholder="12.345.678-9"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Teléfono
                      </label>
                      <input
                        className="form-control"
                        name="telefono"
                        value={form.telefono}
                        onChange={handleFormChange}
                        placeholder="+56 9 1234 5678"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">
                        Email
                      </label>
                      <input
                        className="form-control"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleFormChange}
                        placeholder="cliente@ejemplo.com"
                      />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">
                        Dirección
                      </label>
                      <input
                        className="form-control"
                        name="direccion"
                        value={form.direccion}
                        onChange={handleFormChange}
                        placeholder="Calle, número, depto"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Comuna
                      </label>
                      <input
                        className="form-control"
                        name="comuna"
                        value={form.comuna}
                        onChange={handleFormChange}
                        list="comunas"
                        placeholder="Seleccionar"
                      />
                      <datalist id="comunas">
                        <option value="Santiago" />
                        <option value="Providencia" />
                        <option value="Las Condes" />
                        <option value="Ñuñoa" />
                        <option value="La Florida" />
                        <option value="Maipú" />
                        <option value="Puente Alto" />
                        <option value="San Bernardo" />
                        <option value="Quilicura" />
                        <option value="Vitacura" />
                      </datalist>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">
                        Límite de fiado ($)
                      </label>
                      <input
                        className="form-control"
                        name="limiteFiado"
                        type="number"
                        min="0"
                        step="1"
                        value={form.limiteFiado}
                        onChange={handleFormChange}
                        placeholder="0 = sin crédito"
                      />
                      <div className="form-text">
                        0 significa que el cliente no puede comprar fiado.
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">
                        Observaciones
                      </label>
                      <textarea
                        className="form-control"
                        name="observaciones"
                        rows={2}
                        value={form.observaciones}
                        onChange={handleFormChange}
                        placeholder="Notas adicionales..."
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="activo"
                          name="activo"
                          checked={form.activo}
                          onChange={handleFormChange}
                        />
                        <label className="form-check-label" htmlFor="activo">
                          Cliente activo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        {editing ? "Actualizar" : "Crear"} Cliente
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h6 className="modal-title fw-bold">Confirmar Eliminación</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteConfirm(false)}
                ></button>
              </div>
              <div className="modal-body text-center py-3">
                <i className="bi bi-exclamation-triangle text-danger fs-1 d-block mb-2"></i>
                <p className="mb-0 small">
                  ¿Estás seguro de eliminar este cliente?
                  <br />
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                >
                  <i className="bi bi-trash me-1"></i>Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCuenta && cuentaCliente && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Cuenta del cliente</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCuenta(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="fw-semibold">{cuentaCliente.nombre}</div>
                    <div className="text-muted small">{cuentaCliente.rut}</div>
                  </div>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={openAbono}
                    disabled={loadingCuenta || saldoPendiente <= 0}
                    title={
                      saldoPendiente <= 0
                        ? "El cliente no tiene deuda pendiente."
                        : "Registrar un abono"
                    }
                  >
                    <i className="bi bi-cash-coin me-1"></i>Registrar abono
                  </button>
                </div>
                <div className="alert alert-info py-2 small">
                  Saldo pendiente:{" "}
                  <strong>{formatMoney(saldoPendiente)}</strong>
                  {limiteFiado > 0 && (
                    <span className="ms-2">
                      · Límite fiado: {formatMoney(limiteFiado)} · Disponible:{" "}
                      <strong>
                        {formatMoney(Math.max(0, limiteFiado - saldoPendiente))}
                      </strong>
                    </span>
                  )}
                </div>

                {loadingCuenta ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Detalle</th>
                          <th className="text-end">Cargo</th>
                          <th className="text-end">Abono</th>
                          <th className="text-end">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientosCuenta.length > 0 ? (
                          movimientosCuenta.map((movimiento) => {
                            const cargo =
                              movimiento.tipoMovimiento === "VENTA_FIADA" ||
                              movimiento.tipoMovimiento === "REVERSO_ABONO"
                                ? movimiento.monto
                                : 0;
                            const abono =
                              movimiento.tipoMovimiento === "ABONO"
                                ? movimiento.monto
                                : 0;
                            const detalleMovimiento =
                              movimiento.tipoMovimiento === "REVERSO_ABONO"
                                ? movimiento.observacion ||
                                  "Reverso de abono"
                                : movimiento.venta?.numeroVenta
                                  ? `Venta #${movimiento.venta.numeroVenta}`
                                  : movimiento.observacion || "Movimiento";
                            return (
                              <tr key={movimiento._id}>
                                <td>
                                  {new Date(
                                    movimiento.fecha,
                                  ).toLocaleDateString("es-CL")}
                                </td>
                                <td>
                                  {TIPO_MOVIMIENTO_LABELS[
                                    movimiento.tipoMovimiento
                                  ] || movimiento.tipoMovimiento}
                                </td>
                                <td>
                                  {detalleMovimiento}
                                  {movimiento.estado === "ANULADO"
                                    ? " (anulado)"
                                    : ""}
                                </td>
                                <td className="text-end">
                                  {cargo ? formatMoney(cargo) : "-"}
                                </td>
                                <td className="text-end">
                                  {abono ? formatMoney(abono) : "-"}
                                </td>
                                <td className="text-end fw-semibold">
                                  {formatMoney(
                                    movimiento.saldoResultante ??
                                      saldoPendiente,
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="text-center text-muted py-4"
                            >
                              No hay movimientos registrados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCuenta(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAbono && cuentaCliente && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold">Registrar abono</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAbono(false)}
                ></button>
              </div>
              <form onSubmit={handleAbono} noValidate>
                <div className="modal-body">
                  <div className="mb-3">
                    <div className="fw-semibold">{cuentaCliente.nombre}</div>
                    <div className="text-muted small">
                      Deuda actual: {formatMoney(saldoPendiente)}
                    </div>
                  </div>
                  {error && (
                    <div className="alert alert-danger py-2 small">{error}</div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Monto del abono *
                    </label>
                    <input
                      className="form-control"
                      name="monto"
                      type="number"
                      min="1"
                      step="1"
                      max={saldoPendiente}
                      value={abonoForm.monto}
                      onChange={handleAbonoChange}
                      placeholder="Monto en pesos"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label small fw-semibold">
                      Observación
                    </label>
                    <input
                      className="form-control"
                      name="observacion"
                      value={abonoForm.observacion}
                      onChange={handleAbonoChange}
                      placeholder="Ej: abono en efectivo"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAbono(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm"
                    disabled={savingAbono}
                  >
                    {savingAbono ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>Registrar abono
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div
            className={`alert alert-${toast.type} alert-dismissible d-flex align-items-center gap-2 shadow-sm mb-0`}
            role="alert"
          >
            <i
              className={`bi ${toast.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`}
            ></i>
            {toast.text}
            <button
              type="button"
              className="btn-close"
              onClick={() => setToast(null)}
            ></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;
