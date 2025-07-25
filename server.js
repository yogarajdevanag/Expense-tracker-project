const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

//  Import route files
const authRoutes = require("./server/routes/auth");
const paymentRoutes = require("./server/routes/payment");
const leaderboardRoutes = require("./server/routes/leaderboard");
const expenseRoutes = require("./server/routes/expenses"); // ✅ NEW: Add expense routes
const passwordRoutes = require("./server/routes/password");
//  Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(morgan("dev"));
// Mount all routes
app.use(authRoutes);                         // /signup, /login etc.
app.use(paymentRoutes);                      // /pay, /payment-status
app.use("/leaderboard", leaderboardRoutes);  // /leaderboard
app.use(expenseRoutes);                      // /expenses (GET/POST for user)
app.use("/password", passwordRoutes);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});
//  Start the server
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}/signup-page.html`);
}); 