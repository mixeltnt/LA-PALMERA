import mongoose from "mongoose";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import Client from "../models/clientModel.js";
import Provider from "../models/providerModel.js";
import User from "../models/User.js";
import Venta from "../models/ventaModel.js";
import DetalleVenta from "../models/detalleVentaModel.js";

export const syncController = {
  // 1. Descarga completa / incremental de datos maestros e históricos desde MongoDB
  pullData: async (req, res) => {
    try {
      const [categories, products, clients, providers, users, ventas, detalleVentas] =
        await Promise.all([
          Category.find({}).lean(),
          Product.find({}).populate("categoria", "nombre").populate("proveedorPrincipal", "nombre").lean(),
          Client.find({}).lean(),
          Provider.find({}).lean(),
          User.find({}, "-password").lean(),
          Venta.find({}).populate("cliente", "nombre").populate("usuario", "nombre").sort({ numeroVenta: 1 }).lean(),
          DetalleVenta.find({}).populate("producto", "codigo nombre").lean(),
        ]);

      // Mapear detalles a cada venta
      const detallesPorVenta = {};
      for (const d of detalleVentas) {
        const vId = String(d.venta);
        if (!detallesPorVenta[vId]) detallesPorVenta[vId] = [];
        detallesPorVenta[vId].push(d);
      }

      const ventasConDetalle = ventas.map((v) => ({
        ...v,
        items: detallesPorVenta[String(v._id)] || [],
      }));

      return res.json({
        success: true,
        counts: {
          categories: categories.length,
          products: products.length,
          clients: clients.length,
          providers: providers.length,
          users: users.length,
          ventas: ventasConDetalle.length,
        },
        data: {
          categories,
          products,
          clients,
          providers,
          users,
          ventas: ventasConDetalle,
        },
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[SyncController] Error en pullData:", error);
      return res.status(500).json({ success: false, mensaje: error.message });
    }
  },

  // 2. Recepción de cambios offline desde SQLite (Push)
  pushData: async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.json({ success: true, processed: 0, results: [] });
      }

      const results = [];
      const defaultUser = await User.findOne({ rol: "admin" }) || await User.findOne({});

      for (const item of items) {
        const { id, tabla, operacion, payload_json } = item;
        let payload = {};
        try {
          payload = typeof payload_json === "string" ? JSON.parse(payload_json) : payload_json;
        } catch {
          results.push({ id, status: "failed", error: "JSON inválido en payload" });
          continue;
        }

        try {
          if (tabla === "ventas" && operacion === "INSERT") {
            // Idempotencia: Verificar si la venta ya existe por folio/numeroVenta
            const numVenta = Number(payload.folio || payload.numeroVenta || payload.id);
            const existente = await Venta.findOne({ numeroVenta: numVenta });

            if (existente) {
              results.push({ id, status: "synced", note: "Venta ya registrada previamente" });
              continue;
            }

            // Determinar cliente si existe
            let clienteDoc = null;
            if (payload.clienteId) {
              clienteDoc = await Client.findOne({ _id: payload.clienteId }).catch(() => null);
            }

            // Mapeo de estado según enum de MongoDB: BORRADOR, CONFIRMADA, ANULADA
            let estadoMongo = "CONFIRMADA";
            const estadoOrig = String(payload.estado || "").toUpperCase();
            if (estadoOrig === "ANULADA") estadoMongo = "ANULADA";
            else if (estadoOrig === "BORRADOR") estadoMongo = "BORRADOR";

            // Crear venta en MongoDB
            const nuevaVenta = await Venta.create({
              numeroVenta: numVenta,
              cliente: clienteDoc ? clienteDoc._id : null,
              usuario: defaultUser ? defaultUser._id : null,
              fecha: payload.fecha ? new Date(payload.fecha) : new Date(),
              estado: estadoMongo,
              subtotal: Number(payload.subtotal) || 0,
              descuento: Number(payload.descuentoTotal || payload.descuento) || 0,
              total: Number(payload.total) || 0,
              metodoPago: (payload.metodoPagoPrincipal || payload.metodoPago || "EFECTIVO").toUpperCase(),
              observaciones: payload.notas || payload.observaciones || "",
            });

            // Crear detalles de venta y descontar stock
            if (Array.isArray(payload.items)) {
              for (const it of payload.items) {
                let prodDoc = null;
                if (it.codigo) {
                  prodDoc = await Product.findOne({ codigo: it.codigo });
                }

                if (prodDoc) {
                  await DetalleVenta.create({
                    venta: nuevaVenta._id,
                    producto: prodDoc._id,
                    cantidad: Number(it.cantidad) || 1,
                    precioUnitario: Number(it.precioUnitario || it.precio) || 0,
                    descuento: Number(it.descuento) || 0,
                    subtotal: Number(it.subtotal) || 0,
                  });

                  // Actualizar stock en MongoDB
                  await Product.findByIdAndUpdate(prodDoc._id, {
                    $inc: { stockActual: -(Number(it.cantidad) || 1) },
                  });
                }
              }
            }

            // Sincronizar secuencia si el número importado es mayor
            try {
              const Secuencia = mongoose.model("Secuencia");
              if (Secuencia) {
                await Secuencia.findOneAndUpdate(
                  { nombre: "venta", valorActual: { $lt: numVenta } },
                  { $set: { valorActual: numVenta } }
                );
              }
            } catch {}

            results.push({ id, status: "synced", mongoId: nuevaVenta._id });
          } else if (tabla === "clientes" && operacion === "INSERT") {
            const numRut = payload.rut ? String(payload.rut).trim() : null;
            if (numRut) {
              await Client.findOneAndUpdate(
                { rut: numRut },
                {
                  nombre: payload.nombre,
                  rut: numRut,
                  telefono: payload.telefono || "",
                  email: payload.email || "",
                  direccion: payload.direccion || "",
                  limiteFiado: Number(payload.limiteCredito) || 0,
                  activo: true,
                },
                { upsert: true, new: true }
              );
            }
            results.push({ id, status: "synced" });
          } else if (tabla === "productos" && operacion === "UPDATE") {
            if (payload.codigo) {
              await Product.findOneAndUpdate(
                { codigo: payload.codigo },
                {
                  ...(payload.precioVenta !== undefined && { precioVenta: Number(payload.precioVenta) }),
                  ...(payload.stockActual !== undefined && { stockActual: Number(payload.stockActual) }),
                }
              );
            }
            results.push({ id, status: "synced" });
          } else {
            // Operación genérica reconocida
            results.push({ id, status: "synced" });
          }
        } catch (opErr) {
          console.error(`[SyncController] Error procesando item ${id}:`, opErr);
          results.push({ id, status: "failed", error: opErr.message });
        }
      }

      return res.json({ success: true, processed: results.length, results });
    } catch (error) {
      console.error("[SyncController] Error en pushData:", error);
      return res.status(500).json({ success: false, mensaje: error.message });
    }
  },
};

export default syncController;
