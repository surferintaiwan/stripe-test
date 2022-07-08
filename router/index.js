const express = require('express');
const STRIPE_API = require('../api/stripe-functions');
var router = express.Router();
var stripe = require('stripe')(process.env.STRIPE_API_KEY);

router.get('/', async (req, res) => {
    const products = await STRIPE_API.getProductsAndPlans();
    res.render('pricing.html', { products });
});

router.post('/register', (req, res) => {
    const plan = JSON.parse(req.body.plan);
    plan.formatted = req.body.plan;

    res.render('register.html', {
        productName: req.body.productName,
        plan,
    });
});

router.get('/changeCreditCard', (req, res) => {
    // const plan = JSON.parse(req.body.plan);
    // plan.formatted = req.body.plan;

    res.render('changeCreditCard.html');
});

router.post('/setupIntent', async (req, res) => {
    const customerId = 'cus_M0WgQqQNcHpGMX'
    const setupIntent = await STRIPE_API.setupIntents(customerId)
    console.log('setupIntent =>', setupIntent)
    return res.json({ setupIntent });
});

router.post('/changeDefaultPaymentMethod', async (req, res) => {
    const customerId = 'cus_M0WgQqQNcHpGMX'
    const paymentMethodId = req.body.paymentMethodId
    const {customer, oldPaymentMethod} = await STRIPE_API.changeDefaultPaymentMethod(customerId, paymentMethodId)
    
    return res.json({ customer, oldPaymentMethod });
});

router.post('/handlePayment', async (req, res) => {
    const parsedPlan = JSON.parse(req.body.plan);

    const customerInfo = {
        name: req.body.name,
        email: req.body.email,
        planId: parsedPlan.id,
        address: req.body.address
    };

    const subscription = await STRIPE_API.createCustomerAndSubscription(
        req.body.paymentMethodId,
        customerInfo,
    );

    return res.json({ subscription });
});

router.post('/updateSubscription', async (req, res) => {
    const { subscriptionId, subscriptionItemId, newProductPriceId } = req.body
    const subscription = await STRIPE_API.updateSubscription(subscriptionId, subscriptionItemId, newProductPriceId)

    return res.json({ subscription });
})

router.post('/cancelSubscription', async (req, res) => {
    // const cancelParams = {
    //     invoice_now: req.body.invoice_now,
    //     prorate: req.body.prorate,
    // };

    const subscription = await STRIPE_API.cancelSubscription(req.body.subscriptionId)

    return res.json({ subscription });
});



module.exports = router;