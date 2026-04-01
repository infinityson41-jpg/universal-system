require('dotenv').config({ path: __dirname + '/.env' });
console.log("ENV CHECK:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

const historyRoutes = require("./routes/history");
app.use("/api/history", historyRoutes);

// 🌍 CORS (allow all for now)
app.use(cors({ origin: "*" }));

// 🔐 SECRET
const JWT_SECRET = "your_secret_key";

// 🛢️ MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "universal_system",
});

db.connect((err) => {
  if (err) {
    console.error("DB connection error:", err);
  } else {
    console.log("MySQL Connected");
  }
});


// ================= AUTH =================

// ✅ REGISTER
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


// ✅ LOGIN
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


// 🔒 MIDDLEWARE
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


// ✅ PROTECTED ROUTE
app.get("/api/protected", verifyToken, (req, res) => {
  res.json({ message: "Protected data", user: req.user });
});


// ================= SEARCH =================

// 🔍 SEARCH
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

    // 🔥 log search
    db.query(
      `
      INSERT INTO search_logs (query, count)
      VALUES (?, 1)
      ON DUPLICATE KEY UPDATE count = count + 1
      `,
      [q]
    );

    res.json({ results });
  });
});


// ⚡ AUTOCOMPLETE
app.get("/api/autocomplete", (req, res) => {
  const q = req.query.q;

  if (!q) return res.json([]);

  const sql = `
    SELECT title FROM content
    WHERE title LIKE ?
    LIMIT 5
  `;

  db.query(sql, [`${q}%`], (err, results) => {
    if (err) return res.status(500).json(err);

    res.json(results.map((r) => r.title));
  });
});


// 🔥 TRENDING
app.get("/api/trending", (req, res) => {
  const sql = `
    SELECT query, count
    FROM search_logs
    ORDER BY count DESC
    LIMIT 10
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);

    res.json(results);
  });
});


// ================= SERVER =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});