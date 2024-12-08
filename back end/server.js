const express = require('express');
const cors = require('cors');
const db = require('./db.js');
const server = express();
const port = 5555;

server.use(cors()); 
server.use(express.json());
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('pc_products.db');

// Table creation queries
const CreateUserTable = `CREATE TABLE IF NOT EXISTS users(
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    customertype TEXT NOT NULL
)`;

const CreateStoreTable = `CREATE TABLE IF NOT EXISTS stores(
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    storeName TEXT NOT NULL,
    storeDescription TEXT,
    location TEXT NOT NULL,
    phoneNumber TEXT NOT NULL,
    openingHours TEXT,
    deliveryAvailable BOOLEAN,
    rating DECIMAL(3,2) DEFAULT 0
)`;

const CreateProductsTable = `CREATE TABLE IF NOT EXISTS products(
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    stock INT NOT NULL, 
    price DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL
)`;

const CreatePurchasedTable = `
CREATE TABLE IF NOT EXISTS purchased(
    ID INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_ID INT, 
    product_ID INT,
    quantity INT NOT NULL,
    totalPrice DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY(user_ID) REFERENCES users(ID) ON DELETE CASCADE, 
    FOREIGN KEY(product_ID) REFERENCES products(ID) ON DELETE CASCADE
)`;

const CreateReviewTable = `CREATE TABLE IF NOT EXISTS reviews(
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    productID INT NOT NULL, 
    userID INT NOT NULL, 
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), 
    comment TEXT,
    FOREIGN KEY(productID) REFERENCES products(ID) ON DELETE CASCADE,
    FOREIGN KEY(userID) REFERENCES users(ID) ON DELETE CASCADE
)`;
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
    db.run(`INSERT INTO users(name,email,password,customertype)VALUES( ?, ?, ?, ?)`, 
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


// Start the server and initialize tables
server.listen(port, () => {
    console.log(`Server started listening on port ${port}`);
    db.serialize(() => {
        db.run(createUserTable, (err) => {
            if (err) {
                console.log("Error creating USERS table:", err);
            }
        });

        db.run(createProductsTable, (err) => {
            if (err) {
                console.log("Error creating PRODUCTS table:", err);
            }
        });
        db.run(createPurchasedTable, (err) => {
            if (err) {
                console.log("Error creating PURCHASED table:", err);
            }
        });
        db.run(createReviewTable, (err) => {
            if (err) {
                console.log("Error creating REVIEWS table:", err);
            }
        });
        db.run(createStoreTableNew, (err) => {
            if (err) {
                console.log("Error creating STORES table:", err);
    }
});
    });
});
