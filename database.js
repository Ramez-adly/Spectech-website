const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('spectech.db');

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
    category TEXT NOT NULL,
    image_url TEXT
)`;
const CreateStoreProductTable =`CREATE TABLE IF NOT EXISTS store_products (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    store_ID INT,
    product_ID INT,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY(store_ID) REFERENCES stores(ID) ON DELETE CASCADE,
    FOREIGN KEY(product_ID) REFERENCES products(ID) ON DELETE CASCADE
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
db.serialize(() => {
    db.run(CreateUserTable, (err) => {
        if (err) {
            console.log("Error creating USERS table:", err);
        }
    });

    db.run(CreateProductsTable, (err) => {
        if (err) {
            console.log("Error creating PRODUCTS table:", err);
        }
    });
    db.run(CreatePurchasedTable, (err) => {
        if (err) {
            console.log("Error creating PURCHASED table:", err);
        }
    });
    db.run(CreateReviewTable, (err) => {
        if (err) {
            console.log("Error creating REVIEWS table:", err);
        }
    });
    db.run(CreateStoreTable, (err) => {
        if (err) {
            console.log("Error creating STORES table:", err);
        }
    });
db.run(CreateStoreProductTable, (err) => {
    if (err) {
        console.log("Error creating STORE_PRODUCTS table:", err);
    }
});});
module.exports={
    db,
    CreateUserTable,
    CreateStoreTable,
    CreateProductsTable,
    CreatePurchasedTable,
    CreateReviewTable,
    CreateStoreProductTable
}
