const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../db/DB");
const { Parser } = require("json2csv");

const SECRET = process.env.JWT_SECRET || "default_secret";

//  Middleware to check token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

//  GET user’s own expenses (include id for edit/delete)
router.get("/expenses", authenticateToken, (req, res) => {
  db.query(
    "SELECT id, amount, description, category, created_at FROM expenses WHERE userId = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, results) => {
      if (err) return res.sendStatus(500);
      res.json(results);
    }
  );
});

//  POST new expense
router.post("/expenses", authenticateToken, (req, res) => {
  const { amount, description, category } = req.body;
  db.query(
    "INSERT INTO expenses (userId, amount, description, category) VALUES (?, ?, ?, ?)",
    [req.user.id, amount, description, category],
    (err) => {
      if (err) return res.sendStatus(500);
      res.status(201).json({ message: "Expense added" });
    }
  );
});

//  DELETE expense
router.delete("/expenses/:id", authenticateToken, (req, res) => {
  const expenseId = req.params.id;
  const userId = req.user.id;

  db.query(
    "DELETE FROM expenses WHERE id = ? AND userId = ?",
    [expenseId, userId],
    (err, result) => {
      if (err) {
        console.error(" Delete error:", err);
        return res.status(500).json({ message: "DB delete failed" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Expense not found or unauthorized" });
      }

      res.status(200).json({ message: "Expense deleted" });
    }
  );
});

//  UPDATE expense
router.put("/expenses/:id", authenticateToken, (req, res) => {
  const { amount, description, category } = req.body;
  const userId = req.user.id;
  const expenseId = req.params.id;

  console.log("🔧 PUT /expenses called");
  console.log("➡️ Data:", { amount, description, category });
  console.log("➡️ ID:", expenseId);
  console.log("➡️ User:", userId);

  db.query(
    "UPDATE expenses SET amount = ?, description = ?, category = ? WHERE id = ? AND userId = ?",
    [amount, description, category, expenseId, userId],
    (err, result) => {
      if (err) {
        console.error(" Update error:", err);
        return res.status(500).json({ message: "Failed to update" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Expense not found or unauthorized" });
      }

      res.status(200).json({ message: "Expense updated" });
    }
  );
});
//  FILTER expenses (daily, weekly, monthly)
router.get("/expenses/filter", authenticateToken, (req, res) => {
  const type = req.query.type;
  const userId = req.user.id;

  let interval;

  if (type === "daily") interval = "1 DAY";
  else if (type === "weekly") interval = "7 DAY";
  else if (type === "monthly") interval = "30 DAY";
  else return res.status(400).json({ message: "Invalid filter type" });

  db.query(
    `SELECT * FROM expenses WHERE userId = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ${interval}) ORDER BY created_at DESC`,
    [userId],
    (err, results) => {
      if (err) {
        console.error(" Filter error:", err);
        return res.status(500).json({ message: "Filter failed" });
      }
      res.json(results);
    }
  );
});

router.get("/expenses/download", authenticateToken, (req, res) => {
  db.query(
    "SELECT amount, description, category, created_at FROM expenses WHERE userId = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error("❌ Download error:", err);
        return res.status(500).json({ message: "Download failed" });
      }

      const parser = new Parser({ fields: ["amount", "description", "category", "created_at"] });
      const csv = parser.parse(results);

      res.header("Content-Type", "text/csv");
      res.attachment("expenses.csv");
      res.send(csv);
    }
  );
});
router.get("/expenses", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 10;

  db.query(
    "SELECT id, amount, description, category FROM expenses WHERE userId = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit],
    (err, results) => {
      if (err) return res.status(500).send("DB error");
      res.json(results);
    }
  );
});

module.exports = router;
