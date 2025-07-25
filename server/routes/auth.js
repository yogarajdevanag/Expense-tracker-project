const express = require("express");
const router = express.Router();
const db = require("../db/DB");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "your_secret_key";

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing." });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token." });
    req.user = user;
    next();
  });
}

// User Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required." });

  const checkQuery = "SELECT * FROM users WHERE email = ?";
  db.query(checkQuery, [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Database error." });

    if (result.length > 0)
      return res.status(403).json({ message: "User already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.query(insertQuery, [name, email, hashedPassword], (err) => {
      if (err) return res.status(500).json({ message: "Signup failed." });
      res.status(200).json({ message: "Signup successful!" });
    });
  });
});

// User Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required." });

  const checkUserQuery = "SELECT * FROM users WHERE email = ?";
  db.query(checkUserQuery, [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Database error." });

    if (result.length === 0)
      return res.status(404).json({ message: "User not found." });

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ message: "Incorrect password." });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, {
      expiresIn: "2h",
    });

    res.status(200).json({ message: "Login successful!", token });
  });
});

// Add Expense (Protected)
router.post("/add-expense", authenticateToken, (req, res) => {
  const { amount, description, category, date } = req.body;
  const userId = req.user.id;

  if (!amount || !description || !category || !date)
    return res.status(400).json({ message: "All fields are required." });

  const insertQuery =
    "INSERT INTO expenses (amount, description, category, date, userId) VALUES (?, ?, ?, ?, ?)";
  db.query(insertQuery, [amount, description, category, date, userId], (err) => {
    if (err) return res.status(500).json({ message: "Failed to save expense." });
    res.status(200).json({ message: "Expense added!" });
  });
});

// Get Expenses (Protected)
router.get("/expenses", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const getQuery = "SELECT * FROM expenses WHERE userId = ? ORDER BY id DESC";
  db.query(getQuery, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: "Error loading expenses." });
    res.status(200).json(results);
  });
});

// Delete Expense (Protected)
router.delete("/expenses/:id", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const expenseId = req.params.id;

  const deleteQuery = "DELETE FROM expenses WHERE id = ? AND userId = ?";
  db.query(deleteQuery, [expenseId, userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to delete expense." });

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "Not authorized to delete this expense." });
    }

    res.status(200).json({ message: "Expense deleted." });
  });
});

module.exports = router;