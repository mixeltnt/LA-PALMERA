import "dotenv/config";
import mongoose from "mongoose";

const categoriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  descripcion: String,
  color: String,
  icono: String,
  activo: { type: Boolean, default: true },
}, { timestamps: true });

const providerSchema = new mongoose.Schema({
  rut: { type: String, unique: true },
  nombre: { type: String, required: true },
  contacto: String,
  telefono: String,
  correo: String,
  direccion: String,
  activo: { type: Boolean, default: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  codigoBarras: String,
  nombre: { type: String, required: true },
  descripcion: String,
  categoria: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  proveedorPrincipal: { type: mongoose.Schema.Types.ObjectId, ref: "Provider" },
  precioCompra: { type: Number, default: 0 },
  precioVenta: { type: Number, required: true },
  stockActual: { type: Number, default: 0 },
  stockMinimo: { type: Number, default: 5 },
  unidadMedida: { type: String, default: "Unidad" },
  activo: { type: Boolean, default: true },
}, { timestamps: true });

const clientSchema = new mongoose.Schema({
  rut: { type: String, unique: true },
  nombre: { type: String, required: true },
  telefono: String,
  correo: String,
  direccion: String,
  limiteCredito: { type: Number, default: 0 },
  saldoPendiente: { type: Number, default: 0 },
  activo: { type: Boolean, default: true },
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model("Category", categoriaSchema);
const Provider = mongoose.models.Provider || mongoose.model("Provider", providerSchema);
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
const Client = mongoose.models.Client || mongoose.model("Client", clientSchema);

async function seedMongoDemo() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/lapalmera";
  await mongoose.connect(uri);

  console.log("Conectado a MongoDB");

  // 1. Categorías (16 categorías completas para almacén/minimarket)
  const categoriesList = [
    { nombre: "Bebidas y Refrescos", descripcion: "Gaseosas, jugos, aguas minerales y energéticas", color: "#2563eb", icono: "bi-cup-straw" },
    { nombre: "Abarrotes y Despensa", descripcion: "Arroz, fideos, aceites, harinas, salsas y legumbres", color: "#16a34a", icono: "bi-basket" },
    { nombre: "Panadería y Pastelería", descripcion: "Pan fresco diario, hallullas, marraquetas, empanadas y pasteles", color: "#d97706", icono: "bi-cake2" },
    { nombre: "Lácteos y Huevos", descripcion: "Leches, yogures, mantequillas, cremas y huevos de campo", color: "#0891b2", icono: "bi-egg" },
    { nombre: "Cecinas y Fiambrería", descripcion: "Jamones, salamis, vienesas, arrollados y quesos laminados", color: "#dc2626", icono: "bi-pie-chart" },
    { nombre: "Snacks y Galletas", descripcion: "Papas fritas, galletas dulces y saladas, ramitas y frutos secos", color: "#ea580c", icono: "bi-cookie" },
    { nombre: "Golosinas y Chocolates", descripcion: "Chocolates, gomitas, caramelos, chicles y confites", color: "#db2777", icono: "bi-gift" },
    { nombre: "Limpieza y Aseo del Hogar", descripcion: "Detergentes, cloro, lavalozas, desinfectantes y bolsas de basura", color: "#059669", icono: "bi-droplet" },
    { nombre: "Higiene y Cuidado Personal", descripcion: "Jabones, champú, pastas dentales, desodorantes y papel higiénico", color: "#7c3aed", icono: "bi-person-heart" },
    { nombre: "Congelados y Helados", descripcion: "Helados, hamburguesas, nuggets, papas prefritas y verduras", color: "#0284c7", icono: "bi-snow" },
    { nombre: "Frutas y Verduras", descripcion: "Frutas y verduras frescas seleccionadas de temporada", color: "#65a30d", icono: "bi-apple" },
    { nombre: "Carnes y Aves", descripcion: "Vacuno, pollo, cerdo, carnes para asado y carbón", color: "#b91c1c", icono: "bi-fire" },
    { nombre: "Cervezas, Vinos y Licores", descripcion: "Cervezas nacionales e importadas, vinos, piscos y destilados", color: "#9333ea", icono: "bi-cup-hot" },
    { nombre: "Cigarrillos y Tabacos", descripcion: "Cigarrillos, tabaco para armar, papelillos y encendedores", color: "#4b5563", icono: "bi-lightning" },
    { nombre: "Mascotas", descripcion: "Alimentos secos y húmedos para perros y gatos, premios y arena", color: "#f97316", icono: "bi-heart" },
    { nombre: "Desayuno y Café", descripcion: "Café en grano e instantáneo, té, yerba mate, azúcar y cereales", color: "#78350f", icono: "bi-cup" },
  ];

  const catDocs = {};
  for (const item of categoriesList) {
    const doc = await Category.findOneAndUpdate(
      { nombre: item.nombre },
      { ...item, activo: true },
      { upsert: true, new: true }
    );
    catDocs[item.nombre] = doc;
  }
  const catBebidas = catDocs["Bebidas y Refrescos"];
  const catAbarrotes = catDocs["Abarrotes y Despensa"];
  const catPanaderia = catDocs["Panadería y Pastelería"];

  // 2. Proveedores
  const provCCU = await Provider.findOneAndUpdate(
    { rut: "96.792.000-2" },
    { rut: "96.792.000-2", nombre: "Distribuidora CCU Chile S.A.", contacto: "Andrés Valenzuela", telefono: "+56 9 8123 4567", correo: "ventas@ccuchile.cl", direccion: "Av. Presidente Eduardo Frei Montalva 9600, Santiago", activo: true },
    { upsert: true, new: true }
  );
  const provAndina = await Provider.findOneAndUpdate(
    { rut: "91.144.000-8" },
    { rut: "91.144.000-8", nombre: "Embotelladora Andina S.A.", contacto: "Claudia Morales", telefono: "+56 9 7234 5678", correo: "pedidos@koandina.com", direccion: "Av. El Peñón 0123, Puente Alto", activo: true },
    { upsert: true, new: true }
  );
  const provCentral = await Provider.findOneAndUpdate(
    { rut: "77.345.678-K" },
    { rut: "77.345.678-K", nombre: "Distribuidora Abarrotes Central Ltda.", contacto: "Roberto Fuentes", telefono: "+56 9 6345 6789", correo: "contacto@abarrotescentral.cl", direccion: "Av. Los Pajaritos 4560, Maipú", activo: true },
    { upsert: true, new: true }
  );

  // 3. Productos
  await Product.findOneAndUpdate(
    { codigo: "BEB-001" },
    {
      codigo: "BEB-001",
      codigoBarras: "7801610001014",
      nombre: "Coca-Cola Original 1.5L",
      descripcion: "Bebida gaseosa sabor original 1.5 litros",
      categoria: catBebidas._id,
      proveedorPrincipal: provCCU._id,
      precioCompra: 1100,
      precioVenta: 1700,
      stockActual: 48,
      stockMinimo: 10,
      unidadMedida: "Unidad",
      activo: true,
    },
    { upsert: true, new: true }
  );

  await Product.findOneAndUpdate(
    { codigo: "ABR-001" },
    {
      codigo: "ABR-001",
      codigoBarras: "7802500000011",
      nombre: "Arroz Grado 1 Selección 1kg",
      descripcion: "Arroz grano largo seleccionado 1 kilo",
      categoria: catAbarrotes._id,
      proveedorPrincipal: provCentral._id,
      precioCompra: 950,
      precioVenta: 1450,
      stockActual: 36,
      stockMinimo: 8,
      unidadMedida: "Unidad",
      activo: true,
    },
    { upsert: true, new: true }
  );

  await Product.findOneAndUpdate(
    { codigo: "PAN-001" },
    {
      codigo: "PAN-001",
      codigoBarras: "7803700000025",
      nombre: "Pan Hallulla Especial 1kg",
      descripcion: "Pan tradicional recién horneado por kilo",
      categoria: catPanaderia._id,
      precioCompra: 850,
      precioVenta: 1350,
      stockActual: 25,
      stockMinimo: 5,
      unidadMedida: "Kg",
      activo: true,
    },
    { upsert: true, new: true }
  );

  // 4. Clientes para Fiar ($30.000 de Crédito)
  await Client.findOneAndUpdate(
    { rut: "15.874.321-3" },
    {
      rut: "15.874.321-3",
      nombre: "Juan Carlos Pérez González",
      telefono: "+56 9 9123 4567",
      correo: "juan.perez@gmail.com",
      direccion: "Calle Los Alerces 742",
      limiteCredito: 30000,
      saldoPendiente: 0,
      activo: true,
    },
    { upsert: true, new: true }
  );

  await Client.findOneAndUpdate(
    { rut: "17.654.321-3" },
    {
      rut: "17.654.321-3",
      nombre: "María Elena Soto Martínez",
      telefono: "+56 9 8234 5678",
      correo: "maria.soto@gmail.com",
      direccion: "Pasaje Las Flores 158",
      limiteCredito: 30000,
      saldoPendiente: 0,
      activo: true,
    },
    { upsert: true, new: true }
  );

  await Client.findOneAndUpdate(
    { rut: "19.432.109-0" },
    {
      rut: "19.432.109-0",
      nombre: "Carlos Andrés Muñoz Valdés",
      telefono: "+56 9 7345 6789",
      correo: "carlos.munoz@gmail.com",
      direccion: "Av. Central 890",
      limiteCredito: 30000,
      saldoPendiente: 0,
      activo: true,
    },
    { upsert: true, new: true }
  );

  console.log("✅ 3 Categorías, 3 Proveedores, 3 Productos y 3 Clientes insertados en MongoDB con éxito.");
  await mongoose.disconnect();
}

seedMongoDemo().catch((err) => {
  console.error("Error en seedMongoDemo:", err);
  process.exit(1);
});
