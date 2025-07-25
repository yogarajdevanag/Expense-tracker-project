const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../db/DB");

const SECRET = process.env.JWT_SECRET || "default_secret";

router.get("/", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).send("Missing token");

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).send("Invalid token");

    db.query("SELECT isPremium FROM users WHERE id = ?", [user.id], (err, results) => {
      if (err) return res.status(500).send("DB error");
      if (!results.length || results[0].isPremium !== 1) return res.status(403).send("Not a premium user");

      const query = `
        SELECT u.name, SUM(e.amount) AS total_spent
        FROM users u
        JOIN expenses e ON u.id = e.userId
        GROUP BY u.id
        ORDER BY total_spent DESC
      `;

      db.query(query, (err, rows) => {
        if (err) {
          console.error(" Failed to fetch leaderboard:", err);
          return res.status(500).send("Query error");
        }

        res.json(rows);
      });
    });
  });
});

module.exports = router;
