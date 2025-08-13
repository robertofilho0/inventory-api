const express = require('express');
const router = express.Router();
const { createProduct, getProducts, updateStock, deleteProduct } = require('../controllers/productController');

router.post('/', createProduct);
router.get('/', getProducts);
router.patch('/:id', updateStock);
router.delete('/:id', deleteProduct);

module.exports = router;
