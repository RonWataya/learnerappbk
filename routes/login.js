const express = require("express");
const session = require("express-session");
const db = require("../config/db.js"); // Import database connection from db.js
require('dotenv').config(); 
const router = express.Router();


// Session middleware configuration
router.use(
    session({
        secret: process.env.SESSION_SECRET || "secret-key",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true },
    })
);


// POST route for customer login
router.post("/user/signin", (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], (error, results) => {
        if (error) {
            console.error("Error retrieving user:", error);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = results[0];

        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Login success - save session data if needed
        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
        };

        return res.status(200).json({ message: "Login successful", user: req.session.user });
    });
});



module.exports = router;