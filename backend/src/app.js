import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import productsRoutes from "./routes/productsRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import compraRoutes from "./routes/compraRoutes.js";
import ventaRoutes from "./routes/ventaRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ mensaje: "API La Palmera funcionando 🚀" });
});

app.use("/api/auth", authRoutes);
app.use("/api/productos", productsRoutes);
app.use("/api/clientes", clientRoutes);
app.use("/api/categorias", categoryRoutes);
app.use("/api/proveedores", providerRoutes);
app.use("/api/compras", compraRoutes);
app.use("/api/ventas", ventaRoutes);

export default app;
