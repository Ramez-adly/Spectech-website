const express = require('express');
//const cors = require('cors');
const server = express();
const port = 5555;
const db_access= require('./database.js');
const db = db_access.db;
//server.use(cors()); 
server.use(express.json());

// User login route
server.post('/user/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    db.get(`SELECT * FROM USERS WHERE EMAIL = ?AND PASSWORD = ?`, (err, row) => {
        if (err || !row) {
            return res.status(401).send("Invalid credentials");
        } else {
        return res.status(200).send("Login successful");
        }
    });
});

// User registration route
server.post('/user/register', (req, res) => {
    let name = req.body.name;
    let password = req.body.password;
    let email = req.body.email;
    let customertype = req.body.customertype;
    db.run(`INSERT INTO users(name,email,password,customertype)VALUES( ?, ?, ?, ?)`, [name, email, password, customertype],
         (err) => {
            if (err) {
                return res.status(500).send("Error during registration"+ err.message);
            } else {
        return res.status(200).send("Registration successful");
    }
        })
    })



// Store registration route
server.post('/store/register', (req, res) => {
    let storeName = req.body.storeName;
    let storeDescription = req.body.storeDescription;
    let location = req.body.location;
    let phoneNumber = req.body.phoneNumber;
    let openingHours = req.body.openingHours;
    let deliveryAvailable = req.body.deliveryAvailable;
    if (!storeName || !location || !phoneNumber) {
        return res.status(400).send( "Missing required fields" );
    }

    const query = `INSERT INTO stores (storeName, storeDescription, location, phoneNumber, openingHours, deliveryAvailable) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(query, (err) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        res.status(200).send('Store registered successfully' );
        });
    });

    server.get('/products/search', (req, res) => {
        let name = req.query.name;
        let stock = req.query.stock;
        let query = 'SELECT * FROM PRODUCTS WHERE stock > 0 AND name = ?';
        let params = [name];
    
        db.all(query, params, (err, rows) => {
            if (err) {
                console.log(err);
                return res.status(500).send(err);
            } else {
                return res.send(rows);
            }
        });
    });
    
// Start the server and initialize tables
server.listen(port, () => {
    console.log(`Server started listening on port ${port}`);
    
});
