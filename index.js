const express = require("express");
const cors = require("cors");
const session = require('express-session');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

// We are only importing the single route file that contains both registration and login logic
const registrationRoute = require('./routes/registration'); 
const managementRoute = require('./routes/management'); 

const app = express();

// Use express-session to manage user sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Change this to a strong, random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Note: set secure: true in production with HTTPS
}));

// parse requests of content-type - application/json
app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Add Access Control Allow Origin headers
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

// Allowing CORS with credentials for session management
app.use(cors({
    origin: '*',
    credentials: true 
}));
//https
const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/traininghealthandsafety.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/traininghealthandsafety.com/fullchain.pem')
};
// Use the single route file for all authentication-related endpoints
app.use(registrationRoute); 
app.use(managementRoute); 

const PORT = process.env.PORT || 3000;
https.createServer(options, app).listen(PORT, () => {
    console.log(`HTTPS server running on port ${PORT}`);
});

/*
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
*/