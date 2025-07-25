const express = require("express");
const router = express.Router();
const db = require("../db/DB");
const Sib = require("sib-api-v3-sdk");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const path = require("path");

require("dotenv").config();

//  Step 1: Send reset email
router.post("/forgotpassword", (req, res) => {
  const { email } = req.body;

  db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = results[0].id;
    const requestId = uuidv4();

    // Save the reset request
    db.query("INSERT INTO ForgotPasswordRequests (id, userId, isActive) VALUES (?, ?, true)", [requestId, userId]);

    // Send email using Brevo (Sendinblue)
    const client = Sib.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.SENDINBLUE_API_KEY;

    const transEmailApi = new Sib.TransactionalEmailsApi();

    const sender = {
  name: "YoguYogarj@gmail.com",
  email: "yoguyograj02362@gmail.com", //  Must be verified in Brevo
};
 // replace with verified email
    const receivers = [{ email:email }];

    await transEmailApi.sendTransacEmail({
      sender,
      to: receivers,
      subject: "Reset your password",
      htmlContent: `
        <p>Click the link below to reset your password:</p>
        <a href="${process.env.RESET_PASSWORD_BASE_URL}/${requestId}">Reset Password</a>
      `,
    });

    res.status(200).json({ message: "Reset email sent!" });
  });
});

// Step 2: Show HTML form to enter new password
router.get("/resetpassword/:id", (req, res) => {
  const filePath = path.join(__dirname, "../../public/reset-password.html");
  res.sendFile(filePath);
});

//  Step 3: Update password in DB
router.post("/resetpassword/:id", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  db.query("SELECT * FROM ForgotPasswordRequests WHERE id = ? AND isActive = true", [id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).send("Invalid or expired reset link");
    }

    const userId = results[0].userId;

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId], (err) => {
      if (err) return res.status(500).send("Failed to update password");

      // Mark the request as used
      db.query("UPDATE ForgotPasswordRequests SET isActive = false WHERE id = ?", [id]);
      return res.send(" Password updated successfully. You can now login.");
    });
  });
});

module.exports = router;
