import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import productsRoutes from "./routes/productsRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";

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

export default app;
