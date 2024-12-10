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
    db.get(`SELECT * FROM USERS WHERE EMAIL = ? AND PASSWORD = ?`, [email, password], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }
        if (!row) {
            return res.status(401).send("Invalid credentials");
        }
        return res.status(200).send("Login successful");
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
                   VALUES (?, ?, ?, ?, ?, ?)` ;
    
    db.run(query, [storeName, storeDescription, location, phoneNumber, openingHours, deliveryAvailable], (err) => {
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        res.status(200).send('Store registered successfully' );
        });
    });
// Get all products route 
server.get('/products', (req, res) => {
    const query = 'SELECT * FROM PRODUCTS';
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).send(err + err.message);
        } else {
            return res.send(rows);
        }
    });
});
//search for product
server.get('/products/search', (req, res) => {
    let name = req.query.name;
    let query = 'SELECT * FROM products WHERE stock > 0'
    let params = [];
    
    if (name&& name.trim()!=='') {
        query += ' AND name LIKE ?';
        params.push(`%${name}%`); }
    db.all(query, params, (err, rows) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err);
        } else {
            return res.send(rows);
        }
    });
});

// Get all stores endpoint
server.get('/stores', (req, res) => {
const query = `SELECT * FROM stores`;

db.all(query, (err, rows) => {
    if (err) {
        return res.status(500).send(err + err.message);
    } else {
        return res.send(rows);
    }
});
});
// Add product route
server.post('/products/addproducts', (req, res) => {
let name = req.body.name
let stock = req.body.stock
let price = req.body.price
let category = req.body.category
const query = `INSERT INTO products (name, stock, price, category) VALUES (?, ?, ?, ?)`;
db.run(query, [name, stock, price, category], (err) => {
    if (err) {
    console.log(err);
    return res.status(500).send("Error adding product: " + err.message);
}
    else {
        return res.status(200).send('Product added');
    }
});
});  
 
// Get all stores endpoint
server.get('/stores', (req, res) => {
const query = `SELECT * FROM stores`;
db.all(query, (err, rows) => {
    if (err) {
        return res.status(500).send(err + err.message);
    } else {
        return res.send(rows);
    }
});
});

// Modify product stock by ID
server.put(`/products/edit/:id/:stock`,(req,res)=>{
const query = `UPDATE products SET stock = ? WHERE ID = ?`; 
 db.run(query, [req.params.stock, req.params.id], (err) => {
     if (err) {
     console.log(err);
     return res.status(500).send(err);
     } else {
         return res.status(200).send('Product modified');
 }
});
}); 
// Start the server 
server.listen(port, () => {
    console.log(`Server started listening on port ${port}`);
});
