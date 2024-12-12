const express = require('express');
const cors = require('cors');
const server = express();
const port = 5555;
const secretKey = 'spectech';
const db_access= require('./database.js');
const db = db_access.db;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
server.use(cookieParser());
server.use(express.json());

server.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Add headers middleware
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

const generateToken = (id, name, email, customertype) => {
    return jwt.sign({ id, name, email, customertype }, secretKey, { expiresIn: '1h' });
}

const verifyToken = (req, res, next) => {
    const token = req.cookies.auth;
    if (!token) {
        return res.status(401).send("Unauthorized: no token provided login first");
    }
    
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).send("Unauthorized: invalid token");
        }
        req.user = decoded;
        next();
    });
}

// Admin middleware
const isAdmin = (req, res, next) => {
    if (req.user && req.user.customertype === 'admin') {
        next();
    } else {
        res.status(403).send('Access denied: Admin privileges required');
    }
};

// Check authentication status
server.get('/check-auth', (req, res) => {
    const token = req.cookies.auth;
    
    if (!token) {
        return res.json({ 
            authenticated: false,
            message: "No token found"
        });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.json({ 
                authenticated: false,
                message: "Invalid token"
            });
        }

        return res.json({
            authenticated: true,
            customertype: decoded.customertype,
            email: decoded.email,
            name: decoded.name
        });
    });
});

// Logout route
server.post('/logout', (req, res) => {
    res.clearCookie('auth', {
        httpOnly: true,
        sameSite: 'strict'
    });
    res.json({ message: 'Logged out successfully' });
});

// User login route
server.post('/user/login', (req, res) => {
    const { email, password } = req.body;

    // First, find the user by email
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error during login");
        }

        if (!user) {
            return res.status(401).send("User not found");
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error comparing passwords");
            }

            if (!result) {
                return res.status(401).send("Invalid password");
            }

            const generatedToken = generateToken(
                user.ID,
                user.name,
                user.email,
                user.customertype
            );

            res.cookie('auth', generatedToken, {
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 5 * 60 * 60 * 1000
            });

            return res.status(200).json({
                message: "Login successful",
                token: generatedToken,
                customertype: user.customertype,
                email: user.email
            });
        });
    });
});

server.post('/user/register', (req, res) => {
    let name = req.body.name;
    let password = req.body.password;
    let email = req.body.email;
    let customertype = req.body.customertype;
    
    if (!name || !email || !password || !customertype) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // First check if email already exists
    db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Error checking email: " + err.message });
        }
        if (row) {
            return res.status(400).json({ error: "Email already registered" });
        }

        // If email doesn't exist, proceed with registration
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.error("Error hashing password:", err);
                return res.status(500).json({ error: "Error hashing password" });
            }
            
            db.run(`INSERT INTO users (name, email, password, customertype) VALUES (?, ?, ?, ?)`, 
                [name, email, hash, customertype], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: "Error during registration: " + err.message });
                    }
                    
                    // Get the newly created user
                    db.get('SELECT ID, customertype FROM users WHERE email = ?', [email], (err, user) => {
                        if (err) {
                            return res.status(500).json({ error: "Error retrieving user data" });
                        }
                        return res.status(200).json({ 
                            message: "Registration successful",
                            user: user
                        });
                    });
                });
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
    const userId = req.body.userId;  // Changed to get from request body
     
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    if (!storeName || !location || !phoneNumber) {
        return res.status(400).send("Missing required fields");
    }

    // Check if this user is registered as a store type
    db.get('SELECT customertype FROM users WHERE ID = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (!user || user.customertype !== 'store') {
            return res.status(403).json({ error: 'Only store accounts can register stores' });
        }

        const query = `INSERT INTO stores (user_ID, storeName, storeDescription, location, phoneNumber, openingHours, deliveryAvailable) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(query, [
            userId,
            storeName, 
            storeDescription, 
            location, 
            phoneNumber, 
            openingHours, 
            deliveryAvailable
        ], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to register store', details: err.message });
            }
            res.status(201).json({
                message: 'Store registered successfully',
                storeId: this.lastID
            });
        });
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

// Get product by ID endpoint
server.get('/products/:id', (req, res) => {
    const productId = req.params.id;
    const query = `SELECT * FROM products WHERE ID = ?`;
    
    db.get(query, [productId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.json(row);
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
// Get stores that sell a specific  product
server.get('/products/:productId/stores', (req, res) => {
    const productId = req.params.productId;
    let query = `
        SELECT s.ID as storeId, s.storeName, s.location, s.deliveryAvailable, sp.price 
        FROM stores s 
        INNER JOIN store_products sp ON s.ID = sp.store_ID 
        WHERE sp.product_ID = ?
    `;
    let params = [productId];
    
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
server.get('/users', (req, res) => {
    const query = `SELECT * FROM users`;
    
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).send(err + err.message);
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
server.put('/purchase', verifyToken, (req, res) => {
    const productID = req.body.productID;
    const quantity = req.body.quantity;
    const userID = req.user.id; // Get user ID from verified token
    
    // Query to get the product by ID and ensure there is enough stock
    const query = `SELECT * FROM products WHERE ID = ? AND stock >= ?`;
    
    db.get(query, [productID, quantity], (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err);
        }
        if (!row) {
            return res.status(404).send('Product not found');
        }
        if (req.user.customertype !== 'customer') {
            return res.status(403).send('Only customers can make purchases');
        }
        
        // Calculate the total price
        const totalPrice = row.price * quantity;
        const insertPurchaseQuery = `INSERT INTO purchased (user_ID, product_ID, quantity, TotalPrice) 
                                     VALUES (?, ?, ?, ?)`;
        
        db.run(insertPurchaseQuery, [userID, productID, quantity, totalPrice], (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error logging purchase");
            }

            // Update the stock after purchase
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

// route  for deletion
server.delete('/admin/users/:id', verifyToken, isAdmin, (req, res) => {
    const userID = req.params.id;
    
    db.run('DELETE FROM users WHERE ID = ?', [userID], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete user', details: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    });
});

server.delete('/admin/stores/:id', verifyToken, isAdmin, (req, res) => {
    const storeID = req.params.id;
    
    db.run('DELETE FROM stores WHERE ID = ?', [storeID], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete store', details: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Store not found' });
        }
        res.json({ message: 'Store deleted successfully' });
    });
});

server.delete('/admin/products/:id', verifyToken, isAdmin, (req, res) => {
    const productID = req.params.id;
    
    db.run('DELETE FROM products WHERE ID = ?', [productID], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete product', details: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    });
});

// Start the server 
server.listen(port, () => {
    console.log(`Server started listening on port ${port}`);
});
