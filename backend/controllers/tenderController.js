const Tender = require("../models/Tender");

async function createTender(req, res) {
  try {
    const tender = await Tender.create(req.body);
    res.status(201).json(tender);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getTenders(req, res) {
  try {
    const tenders = await Tender.find().sort({ createdAt: -1 });
    res.json(tenders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTenderById(req, res) {
  try {
    const tender = await Tender.findById(req.params.id);
    if (!tender) return res.status(404).json({ error: "Tender not found" });
    res.json(tender);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createTender, getTenders, getTenderById };