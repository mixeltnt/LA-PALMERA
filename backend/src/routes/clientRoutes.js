import { Router } from "express";
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
  getCuentasPorCobrar,
  getClientMovimientos,
  getClienteSaldo,
  registrarAbono,
} from "../controllers/clientController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/stats", getClientStats);
router.get("/cuentas-por-cobrar", getCuentasPorCobrar);
router.get("/:id/movimientos", getClientMovimientos);
router.get("/:id/saldo", getClienteSaldo);
router.post("/:id/abonos", registrarAbono);
router.get("/", getClients);
router.get("/:id", getClientById);
router.post("/", createClient);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

export default router;
