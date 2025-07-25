const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const cashfree = require("../cashfree-service");
const db = require("../db/DB");

const SECRET = process.env.JWT_SECRET || "default_secret";

//  Middleware to authenticate /pay
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = req.query.token || (authHeader && authHeader.split(" ")[1]);

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

//  POST /pay — Create Cashfree order + store in DB
router.post("/pay", authenticateToken, async (req, res) => {
  const orderId = `ORD_${Date.now()}`;
  const orderAmount = 199;
  const orderCurrency = "INR";
  const customerID = `user_${req.user.id}`;
  const customerPhone = "9876543210";

  try {
    const sessionId = await cashfree.createOrder(
      orderId,
      orderAmount,
      orderCurrency,
      customerID,
      customerPhone
    );

    db.query(
      "INSERT INTO orders (userId, orderId, status) VALUES (?, ?, ?)",
      [req.user.id, orderId, "PENDING"],
      (err) => {
        if (err) {
          console.error("DB insert failed:", err);
          return res.status(500).json({ message: "DB error" });
        }

        //  Return sessionId and orderId
        res.status(200).json({
          paymentSessionId: sessionId,
          orderId: orderId
        });
      }
    );
  } catch (err) {
    console.error(" Order creation failed:", err.message);
    res.status(500).json({ message: "Failed to create order" });
  }
});

//  GET /payment-status?order_id=...&token=... — Callback after payment
router.get("/payment-status", (req, res) => {
  const orderId = req.query.order_id;
  const token = req.query.token;

  if (!orderId || !token) return res.status(401).send("Missing order ID or token");

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).send("Invalid token");

    cashfree.getPaymentStatus(orderId)
      .then((status) => {
        db.query(
          "UPDATE orders SET status = ? WHERE orderId = ?",
          [status, orderId],
          (err) => {
            if (err) {
              console.error(" DB update failed:", err);
              return res.status(500).send("DB error");
            }

            //  Get userId from order
            db.query(
              "SELECT userId FROM orders WHERE orderId = ?",
              [orderId],
              (err, results) => {
                if (err || results.length === 0) {
                  console.error(" Could not find userId for order");
                  return res.redirect("/expense-page.html");
                }

                const orderUserId = results[0].userId;

                if (orderUserId !== user.id) {
                  console.warn(" Token user ID does not match order user ID");
                  return res.redirect("/expense-page.html");
                }

                // Upgrade to premium (even if FAILED)
                db.query(
                  "UPDATE users SET isPremium = 1 WHERE id = ?",
                  [user.id],
                  (err) => {
                    if (err) {
                      console.error(" Failed to update user to premium:", err);
                    }

                    //  Create updated token with isPremium = 1
                    const newToken = jwt.sign(
                      { id: user.id, isPremium: 1 },
                      SECRET,
                      { expiresIn: "2h" }
                    );

                    return res.redirect(`/premium-dashboard.html?token=${newToken}`);
                  }
                );
              }
            );
          }
        );
      })
      .catch((err) => {
        console.error(" Error fetching payment status:", err.message);
        res.redirect("/expense-page.html");
      });
  });
});

module.exports = router;
