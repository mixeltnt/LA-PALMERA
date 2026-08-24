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
import { authMiddleware, autorizarRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get(
  "/stats",
  autorizarRoles("admin", "encargada"),
  getClientStats,
);
router.get(
  "/cuentas-por-cobrar",
  autorizarRoles("admin", "encargada"),
  getCuentasPorCobrar,
);
router.get(
  "/:id/movimientos",
  autorizarRoles("admin", "encargada"),
  getClientMovimientos,
);
router.get("/:id/saldo", getClienteSaldo);
router.post("/:id/abonos", autorizarRoles("admin", "encargada"), registrarAbono);
router.get("/", getClients);
router.get("/:id", getClientById);
router.post("/", createClient);
router.put("/:id", autorizarRoles("admin", "encargada"), updateClient);
router.delete("/:id", autorizarRoles("admin", "encargada"), deleteClient);

export default router;
