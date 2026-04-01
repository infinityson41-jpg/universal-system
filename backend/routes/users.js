const express = require("express");
const router = express.Router();

const db = require("../db");
const verifyToken = require("../middleware/authMiddleware");


// =====================
// 📄 GET ALL USERS
// =====================
router.get("/", verifyToken, (req, res) => {
  db.query("SELECT id, name, email FROM users", (err, results) => {
    if (err) return res.status(500).json(err);

    res.json(results);
  });
});


// =====================
// 📄 GET SINGLE USER
// =====================
router.get("/:id", verifyToken, (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT id, name, email FROM users WHERE id = ?",
    [id],
    (err, results) => {
      if (err) return res.status(500).json(err);

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(results[0]);
    }
  );
});


// =====================
// ✏️ UPDATE USER
// =====================
router.put("/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  db.query(
    "UPDATE users SET name = ?, email = ? WHERE id = ?",
    [name, email, id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "User updated successfully" });
    }
  );
});


// =====================
// ❌ DELETE USER
// =====================
router.delete("/:id", verifyToken, (req, res) => {
  const { id } = req.params;

  db.query(
    "DELETE FROM users WHERE id = ?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "User deleted successfully" });
    }
  );
});


module.exports = router;