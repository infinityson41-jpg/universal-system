const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

// 🔐 VERIFY TOKEN (optional login)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(" ")[1] || authHeader;
    const decoded = jwt.verify(token, "secretkey");
    req.user = decoded;
  } catch (err) {
    req.user = null;
  }

  next();
};

// 🔍 SEARCH + SMART LOGGING + USER HISTORY
router.get("/", verifyToken, (req, res) => {
  const q = req.query.q;

  if (!q) {
    return res.json({
      success: true,
      count: 0,
      results: [],
    });
  }

  // 🔥 1. TRENDING LOGIC
  const checkSql = "SELECT * FROM search_logs WHERE query = ?";

  db.query(checkSql, [q], (err, resultsCheck) => {
    if (err) {
      console.error("Log check error:", err);
    } else {
      if (resultsCheck.length > 0) {
        const updateSql =
          "UPDATE search_logs SET count = count + 1 WHERE query = ?";
        db.query(updateSql, [q]);
      } else {
        const insertSql =
          "INSERT INTO search_logs (query, count) VALUES (?, 1)";
        db.query(insertSql, [q]);
      }
    }
  });

  // 🧠 2. SAVE USER HISTORY (only if logged in)
  if (req.user && req.user.id) {
    const historySql =
      "INSERT INTO search_history (user_id, query) VALUES (?, ?)";

    db.query(historySql, [req.user.id, q], (err) => {
      if (err) {
        console.error("History save error:", err);
      }
    });
  }

  // 🔍 3. SEARCH CONTENT
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