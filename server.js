const express = require('express');
//const cors = require('cors');
const server = express();
const port = 123;
const db_access= require('./database.js');
const db = db_access.db;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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
        const token = jwt.sign({ userId: row.ID }, 'spectech', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });

        return res.status(200).send("Login successful");
    });
});
// User registration route
server.post('/user/register', (req, res) => {
    let name = req.body.name;
    let password = req.body.password;
    let email = req.body.email;
    let customertype = req.body.customertype;
    
    if (!name || !email || !password || !customertype) {
        return res.status(400).send("All fields are required");
    }
    
    
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error("Error hashing password:", err);
            return res.status(500).send("Error hashing password");
        }
    // Insert the new user into the database with the hashed password
    db.run(`INSERT INTO users (name, email, password, customertype) VALUES (?, ?, ?, ?)`, 
        [name, email, hash, customertype], 
        (err) => {
            if (err) {
                return res.status(500).send("Error during registration: " + err.message);
            }
            return res.status(200).send("Registration successful");
        });
});
});

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
let image_url = req.body.image_url
const query = `INSERT INTO products (name, stock, price, category, image_url) VALUES (?, ?, ?, ?, ?)`;
db.run(query, [name, stock, price, category, image_url], (err) => {
    if (err) {
    console.log(err);
    return res.status(500).send("Error adding product: " + err.message);
}
    else {
        return res.status(200).send('Product added');
    }
});
});  
// Add product to store route
server.post('/stores/:storeID/products/add', (req, res) => {
    const storeID = req.params.storeID;
    const  productID = req.body.productID; 
    const price  = req.body.price; 

    // Check if the product exists
    const checkProductQuery = `SELECT * FROM products WHERE ID = ?`;
    db.get(checkProductQuery, [productID], (err, product) => {
        if (err) {
            return res.status(500).send("Error checking product: " + err.message);
        }
        if (!product) {
            return res.status(404).send("Product not found");
        }

        // Link the product to the store with the specified price
        const insertQuery = `INSERT INTO store_products (store_ID, product_ID, price) VALUES (?, ?, ?)`;
        db.run(insertQuery, [storeID, productID, price], (err) => {
            if (err) {
                return res.status(500).send("Error linking product to store: " + err.message);
            }
            res.status(200).send('Product linked to store successfully');
        });
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
// Purchase route
server.put('/purchase', (req, res) => {
    let productID = req.body.productID
    let quantity = req.body.quantity
    
    // Query to get the product by ID and ensure there is enough stock
    const query = `SELECT * FROM products WHERE ID = ? AND stock >= ?`;
    
    db.get(query, [productID, quantity], (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err);
        }
        if (!row) {
            return res.status(404).send('Product not available in sufficient stock');
        }
        
        // Calculate the total price
        const totalPrice = row.price * quantity;
        const insertPurchaseQuery = `INSERT INTO purchased (user_ID, products_ID, quantity, TotalPrice) 
                                     VALUES (?, ?, ?, ?)`;
        
        db.run(insertPurchaseQuery, [user_ID, productID, quantity, totalPrice], (err) => {
            if (err) {
        console.log(err);
                return res.status(500).send("Error logging purchase");
            }

            // Update the  stock after purchase
            const updateStockQuery = `UPDATE products SET stock = stock - ? WHERE ID = ?`;
            db.run(updateStockQuery, [quantity, productID], (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error updating stock");
                }
                return res.status(200).send('Purchase successful');
            });
        });
    });
});
//// review routes for adding deleting reviews
//add review with conditions
server.post('/reviews/product/:productId', (req, res) => {
    const userId = req.body.userId;
    const rating = req.body.rating;
    const comment = req.body.comment;
    const productId = req.params.productId;

    const checkCustomerTypeQuery = `SELECT customertype FROM users WHERE ID = ?`;
    //check if ther user is a customer
    db.get(checkCustomerTypeQuery, [userId], (err, user) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error checking user type');
        }
        if (!user || user.customertype !== 'customer') {
            return res.status(403).send('Only customers can add reviews');
        }
        
        // Check if user has purchased the product
        const checkPurchaseQuery = `SELECT * FROM purchased WHERE user_ID = ? AND products_ID = ?`;
        db.get(checkPurchaseQuery, [userId, productId], (err, purchase) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Error checking purchase history');
            }
            if (!purchase) {
                return res.status(403).send('You must purchase the product before reviewing');
            }
            
            // Add the review
            const addReviewQuery = `INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)`;
            
            db.run(addReviewQuery, [userId, productId, rating, comment], (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Error adding review');
                }
                return res.status(200).send('Review added successfully');
            });
        });
    });
});

// Start the server 
server.listen(port, () => {
    console.log(`Server started listening on port ${port}`);
});

