const express = require("express");
const bcrypt = require('bcrypt');
const db = require("../config/db.js"); // Import database connection from db.js
require('dotenv').config();
const router = express.Router();

// Existing UI update route
router.post('/user/ui_update', (req, res) => {
    const { account_id } = req.body;
    db.query('SELECT * FROM users WHERE id = ?', [account_id], (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ message: 'Internal Server Error' });
        } else if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            return res.json(results[0]);  // Return only the first result
        }
    });
});

// Existing reset password update route
router.post("/user/password_update", async (req, res) => {
    const { email, password } = req.body;
    console.log('Received Password Update Request:', email);

    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password in the database
        db.query("UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email],
            (error, results) => {
                if (error) {
                    console.error("Error updating password:", error);
                    return res.status(500).json({ message: "Error updating password" });
                } else {
                    if (results.affectedRows === 0) {
                        // Email not found in the database
                        return res.status(404).json({ message: "User not found" });
                    } else {
                        console.log("Password updated successfully");
                        return res.status(200).json({ message: "Password updated successfully" });
                    }
                }
            });
    } catch (error) {
        console.error("Error processing request:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// --- NEW API ENDPOINTS FOR THE HOME PAGE ---

// GET route to fetch all courses and their questions
router.get('/api/courses', (req, res) => {
    // First, get all courses
    db.query('SELECT id, title, video_id, level FROM courses ORDER BY level ASC', (err, courses) => {
        if (err) {
            console.error("Database error fetching courses:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        // If no courses found, return an empty array
        if (courses.length === 0) {
            return res.json([]);
        }

        const coursesWithQuestions = [];
        let completedQueries = 0;

        // For each course, fetch its questions
        courses.forEach(course => {
            // FIX: Add 'id' to the SELECT statement to pass the question ID to the frontend
            db.query('SELECT id, question_text, option_a, option_b, option_c, correct_option FROM questions WHERE course_id = ?', [course.id], (err, questions) => {
                if (err) {
                    console.error("Database error fetching questions:", err);
                    return res.status(500).json({ message: "Internal Server Error" });
                }

                // Add the questions to the course object
                course.questions = questions;
                coursesWithQuestions.push(course);
                completedQueries++;

                // Check if all course queries are complete
                if (completedQueries === courses.length) {
                    // All data is collected, send the response
                    res.json(coursesWithQuestions);
                }
            });
        });
    });
});

// GET route to fetch user progress
router.get('/api/user-progress/:userId', (req, res) => {
    const { userId } = req.params;
    db.query('SELECT course_id, is_completed FROM user_progress WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error("Database error fetching user progress:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        res.json(results);
    });
});

// POST route to submit a quiz and update user progress
router.post('/api/submit-quiz', (req, res) => {
    const { userId, courseId, passed } = req.body;

    if (!userId || !courseId || passed === undefined) {
        return res.status(400).json({ message: "Missing required data" });
    }

    // Check if the user already has an entry for this course
    db.query('SELECT * FROM user_progress WHERE user_id = ? AND course_id = ?', [userId, courseId], (err, results) => {
        if (err) {
            console.error("Database error checking progress:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        const progressData = { user_id: userId, course_id: courseId, is_completed: passed };

        if (results.length > 0) {
            // Update existing progress
            db.query('UPDATE user_progress SET is_completed = ? WHERE user_id = ? AND course_id = ?', [passed, userId, courseId], (updateErr) => {
                if (updateErr) {
                    console.error("Database error updating progress:", updateErr);
                    return res.status(500).json({ message: "Error updating progress" });
                }
                if (passed) {
                    // Update user's current level
                    db.query('UPDATE users SET current_level = (SELECT level + 1 FROM courses WHERE id = ?) WHERE id = ?', [courseId, userId], (levelUpdateErr) => {
                        if (levelUpdateErr) {
                            console.error("Database error updating user level:", levelUpdateErr);
                            // This is not a critical failure, we can proceed
                        }
                    });
                }
                res.json({ message: "Progress updated successfully", passed });
            });
        } else {
            // Insert new progress entry
            db.query('INSERT INTO user_progress SET ?', progressData, (insertErr) => {
                if (insertErr) {
                    console.error("Database error inserting progress:", insertErr);
                    return res.status(500).json({ message: "Error inserting progress" });
                }
                if (passed) {
                    // Update user's current level
                    db.query('UPDATE users SET current_level = (SELECT level + 1 FROM courses WHERE id = ?) WHERE id = ?', [courseId, userId], (levelUpdateErr) => {
                        if (levelUpdateErr) {
                            console.error("Database error updating user level:", levelUpdateErr);
                            // Not a critical failure
                        }
                    });
                }
                res.json({ message: "Progress saved successfully", passed });
            });
        }
    });
});

// POST route to mark a user's training as fully completed
router.post('/api/complete-training', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "Missing user ID" });
    }

    db.query('UPDATE users SET training_completed = 1 WHERE id = ?', [userId], (err, result) => {
        if (err) {
            console.error("Database error updating training status:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Training status updated successfully" });
    });
});
// A new or modified GET route to fetch a single user by ID
router.get('/api/user/:id', (req, res) => {
    const { id } = req.params;
    // Make sure 'training_completed' is included in the SELECT statement
    db.query('SELECT id, name, email, current_level, training_completed FROM users WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error("Database error fetching user:", err);
            return res.status(500).json({ message: "Database error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        // The first result contains the full user data, including training_completed
        res.json(results[0]);
    });
});

module.exports = router;