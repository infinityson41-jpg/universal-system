const express = require("express");
const router = express.Router();
const db = require("../db");

// ⚡ AUTOCOMPLETE
router.get("/", (req, res) => {
  const q = req.query.q;

  if (!q) {
    return res.json([]);
  }

  const sql = `
    SELECT DISTINCT title
    FROM content
    WHERE title LIKE ?
    LIMIT 5
  `;

  db.query(sql, [`${q}%`], (err, results) => {
    if (err) {
      console.error("Autocomplete error:", err);
      return res.status(500).json([]);
    }

    res.json(results);
  });
});

module.exports = router;