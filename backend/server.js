require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const decisionRoutes = require("./routes/decisionRoutes");
const tenderRoutes = require("./routes/tenderRoutes");
const bidderRoutes = require("./routes/bidderRoutes");
const documentRoutes = require("./routes/documentRoutes");
const sellerProfileRoutes = require("./routes/sellerProfileRoutes");
const authRoutes = require("./routes/authRoutes");


const app = express();

connectDB();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());
// Static uploads access removed for security

app.use("/api/auth", authRoutes);
app.use("/api/tenders", tenderRoutes);
app.use("/api/bidders", bidderRoutes);
app.use("/api/bidders", decisionRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/seller-profiles", sellerProfileRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gem-compliance-backend" });
});

const PORT = process.env.PORT || 5000;

app.use((err, req, res, next) => {
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  // Generic error handler
  console.error(err.stack);
  res.status(500).json({ error: 'Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});