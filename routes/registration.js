const express = require("express");
const db = require("../config/db.js");
const bcrypt = require("bcrypt"); // Import bcrypt for password hashing
const router = express.Router();
require("dotenv").config();

// The number of salt rounds for bcrypt. A higher number is more secure but slower.
const saltRounds = 10;

// POST route for user registration
router.post("/user/signup", (req, res) => {
    const { name, email, password } = req.body;

    // Check for missing data
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        // Hash the password before storing it
        bcrypt.hash(password, saltRounds, (hashErr, hash) => {
            if (hashErr) {
                console.error("Error hashing password:", hashErr);
                return res.status(500).json({ message: "Error registering user" });
            }

            // Insert new user with the hashed password
            db.query(
                "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                [name, email, hash], // Use the hashed password
                (error, insertResults) => {
                    if (error) {
                        console.error("Error registering user:", error);
                        res.status(500).json({ message: "Error registering user" });
                    } else {
                        console.log("User registered successfully");
                        res.status(200).json({ message: "User registered successfully" });
                    }
                }
            );
        });
    });
});

// POST route for user login
// POST route for user login
router.post("/user/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    // Find the user by email
    // NEW: Include `current_level` in the SELECT statement
    db.query("SELECT id, name, email, password, current_level FROM users WHERE email = ?", [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error" });
        }

        // Check if a user with that email exists
        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = results[0];

        // Compare the submitted password with the hashed password in the database
        bcrypt.compare(password, user.password, (compareErr, isMatch) => {
            if (compareErr) {
                console.error("Error comparing passwords:", compareErr);
                return res.status(500).json({ message: "Authentication failed" });
            }

            if (isMatch) {
                req.session.isLoggedIn = true;
                // NEW: Include `current_level` in the session and response user object
                req.session.user = { id: user.id, name: user.name, email: user.email, current_level: user.current_level };
                console.log("User logged in successfully:", user.email);
                res.status(200).json({ message: "Login successful", user: req.session.user });
            } else {
                // Passwords do not match
                res.status(401).json({ message: "Invalid credentials" });
            }
        });
    });
});

// NEW: GET route to fetch a single user's data by ID
router.get("/api/user/:id", (req, res) => {
    const userId = req.params.id;

    db.query("SELECT id, name, email, current_level FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        // Return the user data, including the current_level
        res.status(200).json(results[0]);
    });
});

// A new route to check the login status (for the frontend)
router.get('/api/check-auth', (req, res) => {
    if (req.session.isLoggedIn) {
        res.json({ isLoggedIn: true, user: req.session.user });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// A new route to log the user out
router.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: "Could not log out." });
        }
        res.status(200).json({ message: "Logged out successfully" });
    });
});

module.exports = router;
