const express = require('express');
const STRIPE_API = require('../api/stripe-functions');
var router = express.Router();

router.get('/', async (req, res) => {
    const products = await STRIPE_API.getProductsAndPlans();
    res.render('pricing.html', { products });
});

module.exports = router;