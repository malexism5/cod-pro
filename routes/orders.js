const express = require('express');
const router = express.Router();
const { Shopify } = require('@shopify/shopify-api');

router.get('/cod-orders', async (req, res) => {
  try {
    const session = await Shopify.Utils.loadCurrentSession(req, res);
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);

    const response = await client.get({
      path: 'orders',
      query: { status: 'any', financial_status: 'pending' }
    });

    const codOrders = response.body.orders.filter(order => 
      order.gateway === 'Cash on Delivery (COD)' || order.tags.includes('COD')
    );

    res.render('manage-cod', { orders: codOrders });
  } catch (error) {
    console.error('Error fetching COD orders:', error);
    res.status(500).send('Error fetching COD orders');
  }
});

module.exports = router;
Last edited just now

// routes/orders.js

router.post('/mark-paid', async (req, res) => {
    try {
      const session = await Shopify.Utils.loadCurrentSession(req, res);
      const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
  
      const orderId = req.body.orderId;
  
      await client.post({
        path: `orders/${orderId}/transactions`,
        data: {
          transaction: {
            kind: 'capture',
            status: 'success'
          }
        }
      });
  
      res.redirect('/orders/cod-orders');
    } catch (error) {
      console.error('Error marking order as paid:', error);
      res.status(500).send('Error marking order as paid');
    }
  });