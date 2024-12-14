# Spectech
 
# SpecTech E-commerce Platform

## Overview
SpecTech is a modern e-commerce platform specializing in computer components and custom PC builds. The platform provides a seamless shopping experience for customers while offering comprehensive management tools for store owners.

## Features

### Customer Features
- Browse  computer components
- Custom PC Builder tool
- Shopping cart functionality
- User authentication
- Product reviews and ratings

### Store Owner Features
- Product management dashboard
- Inventory tracking
- Order management

### Admin Features
- User management
- Store approval system
- System monitoring

## Technology Stack

### Frontend
- React.js
- CSS with modern features
- React Icons for UI elements
- Responsive design principles

### Backend
- Node.js
- Express.js
- SQLite database
- RESTful API architecture


### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

```




```

## API Endpoints

### Authentication
- POST `/user/login` - User login
- POST `/users/register` - User registration
- POST `/logout` - User logout

### Products
- GET `/products` - Get all products
- GET `/products/:id` - Get specific product
- GET `/products/search` - Search products
- POST `/products/add` - Add new product (Store owners)

### Store Management
- GET `/stores/:storeId/products` - Get store products
- POST `/stores/:storeId/products/add` - Add product to store
- PUT `/stores/:storeId/products/:productId/stock/:newStock` - Update stock
- DELETE `/stores/:storeId/products/:productId` - Remove product


