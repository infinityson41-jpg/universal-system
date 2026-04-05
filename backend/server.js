if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

console.log("ENV CHECK:", {
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
  port: process.env.DB_PORT 
});

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db").default;

const app = express();

// ✅ CORS (use only once)
app.use(cors({ origin: "*", credentials: true }));

app.use(express.json());

// ================= ROUTES =================

// external routes
const historyRoutes = require("./routes/history");
app.use("/api/history", historyRoutes);

// ================= TEST =================
app.get("/", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) {
      console.error("❌ Query Error:", err.message);
      return res.status(500).send("DB Error");
    }
    res.send("✅ Server + DB Working!");
  });
});

// ================= AUTH =================

const JWT_SECRET = "your_secret_key";

// REGISTER
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "User registered" });
      }
    );
  } catch (err) {
    res.status(500).json(err);
  }
});

// LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0)
        return res.status(400).json({ message: "User not found" });

      const user = results[0];

      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        return res.status(401).json({ message: "Invalid password" });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.json({ token });
    }
  );
});

// ================= MIDDLEWARE =================

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader)
    return res.status(403).json({ message: "No token" });

  const token = authHeader.split(" ")[1];

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

// PROTECTED
app.get("/api/protected", verifyToken, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});

// ================= SEARCH =================

// SEARCH
app.get("/api/search", (req, res) => {
  const q = req.query.q;

  if (!q) return res.json({ results: [] });

  const sql = `
    SELECT * FROM content
    WHERE MATCH(title, description)
    AGAINST(? IN NATURAL LANGUAGE MODE)
  `;

  db.query(sql, [q], (err, results) => {
    if (err) return res.status(500).json(err);

    // log search
    db.query(
      `INSERT INTO search_logs (query, count)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE count = count + 1`,
      [q]
    );

    res.json({ results });
  });
});

// AUTOCOMPLETE
app.get("/api/autocomplete", (req, res) => {
  const q = req.query.q;

  if (!q) return res.json([]);

  db.query(
    "SELECT title FROM content WHERE title LIKE ? LIMIT 5",
    [`${q}%`],
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results.map((r) => r.title));
    }
  );
});

// TRENDING
app.get("/api/trending", (req, res) => {
  db.query(
    `SELECT query, count FROM search_logs ORDER BY count DESC LIMIT 10`,
    (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    }
  );
});

// ================= SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});