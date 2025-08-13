const express = require("express");
const db = require("../config/db.js"); // Import database connection from db.js
require('dotenv').config(); 
const router = express.Router();


// API to handle KYC update
router.post('/user/kyc_verification', (req, res) => {
    const { account_id, id_number, id_photo, id_type, address, proof_of_address, questions, answers } = req.body;

    // Validate the input
    if (!account_id || !id_number || !id_photo || !id_type || !address || !proof_of_address || !questions || !answers) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Define the KYC insertion or update query
    const insertKYCQuery = `
      INSERT INTO KYC (account_id, id_number, id_photo, id_type, address, proof_of_address, security_question, security_answer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        id_number = VALUES(id_number),
        id_photo = VALUES(id_photo),
        id_type = VALUES(id_type),
        address = VALUES(address),
        proof_of_address = VALUES(proof_of_address),
        security_question = VALUES(security_question),
        security_answer = VALUES(security_answer)
    `;

    // Define the customer status update query
    const updateCustomerStatusQuery = `
      UPDATE Customer
      SET status = 'pending'
      WHERE account_id = ?
    `;

    // Begin the transaction process
    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            return res.status(500).json({ success: false, message: 'Database connection error' });
        }

        // Begin the transaction
        connection.beginTransaction((transactionErr) => {
            if (transactionErr) {
                connection.release();
                console.error('Transaction Error:', transactionErr);
                return res.status(500).json({ success: false, message: 'Database transaction error' });
            }

            // Insert or update KYC data
            connection.query(insertKYCQuery, 
              [account_id, id_number, Buffer.from(id_photo, 'base64'), id_type, address, Buffer.from(proof_of_address, 'base64'), questions, answers], 
              (kycErr, kycResult) => {
                if (kycErr) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error('Error inserting/updating KYC:', kycErr);
                        return res.status(500).json({ success: false, message: 'KYC database error' });
                    });
                }

                // Update customer status
                connection.query(updateCustomerStatusQuery, [account_id], (statusErr, statusResult) => {
                    if (statusErr) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error('Error updating customer status:', statusErr);
                            return res.status(500).json({ success: false, message: 'Customer status update error' });
                        });
                    }

                    // Commit the transaction
                    connection.commit((commitErr) => {
                        if (commitErr) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error('Commit Error:', commitErr);
                                return res.status(500).json({ success: false, message: 'Database commit error' });
                            });
                        }

                        // Release the connection back to the pool
                        connection.release();
                        res.json({ success: true, message: 'KYC updated and customer status set to pending' });
                    });
                });
            });
        });
    });
});

module.exports = router;