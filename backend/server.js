require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const decisionRoutes = require("./routes/decisionRoutes");
const tenderRoutes = require("./routes/tenderRoutes");
const bidderRoutes = require("./routes/bidderRoutes");
const documentRoutes = require("./routes/documentRoutes");
const sellerProfileRoutes = require("./routes/sellerProfileRoutes");

const app = express();

connectDB();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/tenders", tenderRoutes);
app.use("/api/bidders", bidderRoutes);
app.use("/api/bidders", decisionRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/seller-profiles", sellerProfileRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gem-compliance-backend" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});