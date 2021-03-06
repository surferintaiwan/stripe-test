
require('dotenv').config();
var stripe = require('stripe')(process.env.STRIPE_API_KEY);

/* Import constants and helper functions */
const UTILS = require('../utils/index');

/**
 * @param {string} paymentMethodId The id of your customer's Stripe Payment Method (an 
 * abstraction of your customer's card information)
 * @param {Object} customerInfo An object containing your customer's email, name,
 * and the plan your customer wants to pay for
 * @return {Object} Your customer's newly created subscription
 */
async function createCustomerAndSubscription(paymentMethodId, customerInfo) {
  // const customer = await stripe.customers.retrieve('cus_LpdVvrm90kzJgA')

  /* Create customer and set default payment method */
  const customer = await stripe.customers.create({
    payment_method: paymentMethodId,
    email: customerInfo.email,
    name: customerInfo.name,
    address: customerInfo.address,
    invoice_settings: {
      default_payment_method: paymentMethodId,
    }
  });

  console.log('customer=>', customer)

  // const subscription = await stripe.subscriptions.retrieve('sub_1L7yE5JDn5tTmyIhdx3gd8y')

  /* Create subscription and expand the latest invoice's Payment Intent 
   * We'll check this Payment Intent's status to determine if this payment needs SCA
   */
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{
      plan: customerInfo.planId,
    }],
    expand: ["latest_invoice.payment_intent"],
    // trial_period_days:1
  });
  console.log('subscription =>', subscription)
  return subscription;
}

async function setupIntents(customerId) {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });

  return setupIntent
}

async function changeDefaultPaymentMethod(customerId, paymentMethodId) {
  // get old paymentMethodId from DB
  const oldPaymentMethodId = 'pm_1LIVcpJDn5tTmyIhDNP7nHn0'

  const customer = await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });

  // detached old paymentMethodId
  const oldPaymentMethod = await stripe.paymentMethods.detach(oldPaymentMethodId)

  // update new paymentMethodId into DB


  return { customer, oldPaymentMethod }
}

async function updateSubscription(subscriptionId, subscriptionItemId, newProductPriceId) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
    proration_behavior: 'create_prorations',
    items: [{
      id: subscriptionItemId,
      price: newProductPriceId,
    }]
  })

  return subscription
}

async function cancelSubscription(subscriptionId, cancelParams) {
  // const cancelSubscription = await stripe.subscriptions.del(subscriptionId, cancelParams)
  const cancelSubscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  })

  return cancelSubscription
}

/**
 * @param {Array} products An array of Stripe products
 * @return {Array} An array of Stripe products with additional display information
 */
function formatProducts(products) {
  products.forEach(product => {
    /* Append additional display information */
    product.subheader = UTILS.getValue(UTILS.PRODUCT_INFO[product.name], 'subheader', '');
  });

  return products;
}


/**
 * @param {Array} plans An array of Stripe plans
 * @return {Array} An array of Stripe plans with additional display information
 * This array is also sorted by amount
 */
function sortAndFormatPlans(plans) {
  plans = plans.sort((a, b) => {
    /* Sort plans in ascending order of price (amount)
    * Ref: https://www.w3schools.com/js/js_array_sort.asp */
    return a.amount - b.amount;
  });

  plans.forEach(plan => {
    /* Format plan price (amount) in USD */
    plan.amount = UTILS.formatUSD(plan.amount);

    /* Append additional display information */
    plan.formatted = JSON.stringify(plan);
    plan.features = UTILS.getValue(UTILS.PLAN_INFO[plan.nickname], 'features', []);
    plan.highlight = UTILS.getValue(UTILS.PLAN_INFO[plan.nickname], 'highlight', false);
  });

  return plans;
}


/**
 * @param {Array} plans An array of Stripe plans
 * @param {Array} products An array of Stripe products
 * @return {Array} An array of Stripe products with attached plans
 * Products with no plans are filtered out
*/
function attachPlansToProducts(plans, products) {
  products.forEach(product => {
    const filteredPlans = plans.filter(plan => {
      return product.id === plan.product;
    });

    product.plans = filteredPlans;
  });

  return products.filter(product => product.plans.length > 0);
}


/**
 * @return {Array} An array of Stripe products that have 1+ plans
 * Each Stripe product contains an array of Stripe plans
 */
function getProductsAndPlans() {
  return Promise.all([
    stripe.products.list({}), // Default returns 10 products, sorted by most recent creation date
    stripe.plans.list({}), // Default returns 10 plans, sorted by most recent creation date
  ]).then(stripeData => {
    var products = formatProducts(stripeData[0].data);
    var plans = sortAndFormatPlans(stripeData[1].data);
    return attachPlansToProducts(plans, products);
  }).catch(err => {
    console.error('Error fetching Stripe products and plans: ', err);
    return [];
  });
}

module.exports = {
  getProductsAndPlans,
  setupIntents,
  changeDefaultPaymentMethod,
  createCustomerAndSubscription,
  updateSubscription,
  cancelSubscription
};