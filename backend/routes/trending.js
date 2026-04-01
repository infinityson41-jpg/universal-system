const express = require("express");
const router = express.Router();
const db = require("../db");

// 🔍 SEARCH + SMART LOGGING
router.get("/", (req, res) => {
  const q = req.query.q;

  if (!q) {
    return res.json({
      success: true,
      count: 0,
      results: [],
    });
  }

  // 🔥 SMART LOGGING (increment count)
  const checkSql = "SELECT * FROM search_logs WHERE query = ?";

  db.query(checkSql, [q], (err, resultsCheck) => {
    if (err) {
      console.error("Log check error:", err);
    } else {
      if (resultsCheck.length > 0) {
        // ✅ update count
        const updateSql =
          "UPDATE search_logs SET count = count + 1 WHERE query = ?";
        db.query(updateSql, [q]);
      } else {
        // ✅ insert new
        const insertSql =
          "INSERT INTO search_logs (query, count) VALUES (?, 1)";
        db.query(insertSql, [q]);
      }
    }
  });

  // 🔍 SEARCH QUERY
  const sql = `
    SELECT id, title, description, category, created_at
    FROM content
    WHERE title LIKE ? OR description LIKE ?
    ORDER BY created_at DESC
  `;

  const searchTerm = `%${q}%`;

  db.query(sql, [searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error("Search error:", err);
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