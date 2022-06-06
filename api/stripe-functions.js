
      require('dotenv').config();
      var stripe = require('stripe')(process.env.STRIPE_API_KEY);

      /* Import constants and helper functions */
      const UTILS = require('../utils/index');

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
      };
    