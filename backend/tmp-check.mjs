import express from "express";

const app = express();
const router = express.Router();
router.get("/stats", (req, res) => res.send("stats"));
router.get(["/", ""], (req, res) => res.send("root"));
router.get("/:id", (req, res) => res.send("id"));
app.use("/api/proveedores", router);
app.listen(4111, () => console.log("ready"));
