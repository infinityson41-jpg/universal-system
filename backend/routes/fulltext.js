const express = require("express");
const router = express.Router();
const db = require("../db");

// 🔥 FULL-TEXT SEARCH (RANKED)
router.get("/", (req, res) => {
  const q = req.query.q;

  if (!q) {
    return res.json({
      success: true,
      count: 0,
      results: [],
    });
  }

  const sql = `
    SELECT 
      id,
      title,
      description,
      category,
      created_at,
      MATCH(title, description) AGAINST (?) AS score
    FROM content
    WHERE MATCH(title, description) AGAINST (?)
    ORDER BY score DESC
  `;

  db.query(sql, [q, q], (err, results) => {
    if (err) {
      console.error("Fulltext error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }

    res.json({
      success: true,
      count: results.length,
      results,
    });
  });
});

module.exports = router;