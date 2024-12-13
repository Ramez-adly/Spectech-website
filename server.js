/************************* DEPENDENCIES AND SETUP *************************/
const express = require('express');
const cors = require('cors');
const server = express();
const port = 5555;
const secretKey = 'spectech';
const db_access = require('./database.js');
const db = db_access.db;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

/************************* MIDDLEWARE CONFIGURATION *************************/
server.use(cookieParser());
server.use(express.json());

server.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

server.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

/************************* AUTHENTICATION UTILITIES *************************/
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

const isAdmin = (req, res, next) => {
    if (req.user && req.user.customertype === 'admin') {
        next();
    } else {
        res.status(403).send('Access denied: Admin privileges required');
    }
};
/************************* AUTHENTICATION ROUTES *************************/
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

// User registration route
server.post('/users/register', (req, res) => {
    let name = req.body.name;
    let email = req.body.email;
    let password = req.body.password;
    let customertype = req.body.customertype;

    if (!name || !email || !password) {
        return res.status(400).send('All fields are required');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send('Invalid email format. The email should contain "@*.com".');
    }

    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
            console.error(hashErr);
            return res.status(500).send('An error occurred while securing the password');
        }

        const query = 'INSERT INTO users (name, email, password, customertype) VALUES (?, ?, ?, ?)';
        db.run(query, [name, email, hashedPassword, customertype || 'user'], function(err) {
            if (err) {
                console.log(err.message);
                return res.status(401).send(err);
            }
            
            const token = generateToken(this.lastID, name, email, customertype || 'user');
            
            res.cookie('auth', token, {
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 5 * 60 * 60 * 1000 // 5 hours
            });
            
            return res.status(200).json({
                message: 'Registration successful',
                token,
                userId: this.lastID,
                customertype: customertype || 'user',
                email: email,
                name: name
            });
        });
    });
});

// User login route
server.post('/user/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: "Error comparing passwords" });
            }
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            const token = generateToken(user.ID, user.name, user.email, user.customertype);

            res.cookie('auth', token, {
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 5 * 60 * 60 * 1000
            });

            return res.status(200).json({
                message: 'Login successful',
                token,
                name: user.name,
                customertype: user.customertype,
                email: user.email
            });
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

/************************* USER MANAGEMENT ROUTES *************************/
// Get all users
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
/************************* STORE MANAGEMENT ROUTES *************************/
// Store registration route
server.post('/store/register', verifyToken, (req, res) => {
    let storeName = req.body.storeName;
    let storeDescription = req.body.storeDescription;
    let location = req.body.location;
    let phoneNumber = req.body.phoneNumber;
    let openingHours = req.body.openingHours;
    let deliveryAvailable = req.body.deliveryAvailable;
    const userId = req.user.id;

    if (!storeName || !location || !phoneNumber) {
        return res.status(400).send("Missing required fields");
    }

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

// Get all stores
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

// Add product to store
server.post('/stores/:storeId/products/add', verifyToken, (req, res) => {
    const storeID = req.params.storeId;
    const { productID, price, stock } = req.body;

    console.log('Received request:', { storeID, productID, price, stock });

    if (!productID || !price || stock === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const checkQuery = `SELECT * FROM store_products WHERE store_ID = ? AND product_ID = ?`;
    db.get(checkQuery, [storeID, productID], (err, existing) => {
        if (err) {
            console.error('Database error during check:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        if (existing) {
            return res.status(400).json({ error: 'Product already exists in store' });
        }

        const insertQuery = `INSERT INTO store_products (store_ID, product_ID, price, stock) VALUES (?, ?, ?, ?)`;
        db.run(insertQuery, [storeID, productID, price, stock], function(err) {
            if (err) {
                console.error('Database error during insert:', err);
                return res.status(500).json({ error: 'Error linking product to store', details: err.message });
            }
            
            res.status(200).json({ 
                success: true,
                message: 'Product added to store successfully',
                id: this.lastID,
                storeID,
                productID,
                price,
                stock
            });
        });
    });
});

/************************* PRODUCT MANAGEMENT ROUTES *************************/
// Get all products
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

// Get product by ID
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

// Search for products
server.get('/products/search', (req, res) => {
    let name = req.query.name;
    let query = 'SELECT * FROM products WHERE stock > 0'
    let params = [];
    
    if (name && name.trim() !== '') {
        query += ' AND name LIKE ?';
        params.push(`%${name}%`);
    }
    db.all(query, params, (err, rows) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err);
        } else {
            return res.send(rows);
        }
    });
});
// Get stores that sell a specific product
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

// Add product
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

// Modify product stock by ID
server.put(`/products/edit/:id/:stock`, (req, res) => {
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

/************************* PURCHASE ROUTES *************************/
// Purchase route
server.put('/purchase', verifyToken, (req, res) => {
    const productID = req.body.productID;
    const quantity = req.body.quantity;
    const userID = req.user.id;
    
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
        
        const totalPrice = row.price * quantity;
        const insertPurchaseQuery = `INSERT INTO purchased (user_ID, product_ID, quantity, TotalPrice) 
                                     VALUES (?, ?, ?, ?)`;
        
        db.run(insertPurchaseQuery, [userID, productID, quantity, totalPrice], (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error logging purchase");
            }

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

/************************* REVIEW ROUTES *************************/
// Add review
server.post('/reviews/product/:productId', (req, res) => {
    const userId = req.body.userId;
    const rating = req.body.rating;
    const comment = req.body.comment;
    const productId = req.params.productId;

    const checkCustomerTypeQuery = `SELECT customertype FROM users WHERE ID = ?`;
    db.get(checkCustomerTypeQuery, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (!user || user.customertype !== 'customer') {
            return res.status(403).json({ error: 'Only customers can write reviews' });
        }

        const checkPurchaseQuery = `SELECT * FROM purchased WHERE user_ID = ? AND product_ID = ?`;
        db.get(checkPurchaseQuery, [userId, productId], (err, purchase) => {
            if (err) {
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            if (!purchase) {
                return res.status(403).json({ error: 'You must purchase the product before reviewing it' });
            }

            const insertReviewQuery = `INSERT INTO reviews (user_ID, product_ID, rating, comment) VALUES (?, ?, ?, ?)`;
            db.run(insertReviewQuery, [userId, productId, rating, comment], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Error adding review', details: err.message });
                }
                res.status(201).json({
                    message: 'Review added successfully',
                    reviewId: this.lastID
                });
            });
        });
    });
});

// Get product reviews
server.get('/products/:productId/reviews', (req, res) => {
    const productId = req.params.productId;
    const query = `
        SELECT r.*, u.name as userName
        FROM reviews r
        JOIN users u ON r.user_ID = u.ID
        WHERE r.product_ID = ?
    `;
    
    db.all(query, [productId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json(rows);
    });
});

/************************* SERVER INITIALIZATION *************************/
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});