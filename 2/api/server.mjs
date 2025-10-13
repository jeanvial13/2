import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API funcionando perfectamente 🚀" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API lista en puerto ${PORT}`));
