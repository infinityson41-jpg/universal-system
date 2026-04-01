const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

// verify user
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
  } catch {
    req.user = null;
  }

  next();
};

// 🕘 GET USER HISTORY
router.get("/", verifyToken, (req, res) => {
  if (!req.user) {
    return res.json([]);
  }

  const sql = `
    SELECT query, created_at
    FROM search_history
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("History error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    res.json(results);
  });
});

module.exports = router;