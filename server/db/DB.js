// server/db/DB.js
const mysql = require('mysql2');

// Create a connection to the database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Yogu@2112',
  database: 'expenses_db'
});

// Attempt to connect
connection.connect((err) => {
  if (err) {
    console.error(" MySQL connection failed:", err.message);
    process.exit(1); // Exit the app if DB is not connected
  } else {
    console.log(" Connected to MySQL database");
  }
});

// Export the connection to use in other files
module.exports = connection;
