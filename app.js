require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { Shopify } = require('@shopify/shopify-api');
const { addToQueue } = require('./webhook-queue');

const app = express();
const port = process.env.PORT || 3000;

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(','),
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ''),
  IS_EMBEDDED_APP: true,
  API_VERSION: '2023-07'  // Usa la versión más reciente de la API
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

// Middleware para verificar webhooks
const verifyWebhook = (req, res, next) => {
  const hmac = req.header('X-Shopify-Hmac-Sha256');
  const body = req.rawBody; // Necesitas usar body-parser's raw parser para esto
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8', 'hex')
    .digest('base64');

  if (hash === hmac) {
    next();
  } else {
    res.status(401).send('Webhook verification failed');
  }
};

// Ruta de autenticación
app.get('/auth', async (req, res) => {
  if (!req.query.shop) {
    res.status(400).send("Missing shop parameter. Please add ?shop=your-development-store.myshopify.com to your request");
    return;
  }

  const authRoute = await Shopify.Auth.beginAuth(
    req,
    res,
    req.query.shop,
    '/auth/callback',
    false,
  );

  res.redirect(authRoute);
});

// Ruta de callback para la autenticación
app.get('/auth/callback', async (req, res) => {
  try {
    const session = await Shopify.Auth.validateAuthCallback(
      req,
      res,
      req.query
    );
    console.log(session);
    
    // Registrar webhooks después de la autenticación exitosa
    await registerWebhooks(session.shop, session.accessToken);
    
    res.redirect('/'); // Redirigir a la página principal de la app
  } catch (error) {
    console.error(error);
    res.status(500).send("Error occurred during authentication");
  }
});

// Ruta para recibir webhooks
app.post('/webhooks/orders', verifyWebhook, async (req, res) => {
  const order = req.body;
  console.log('Received webhook for order:', order.id);

  addToQueue(order);

  res.status(200).send('Webhook received and queued for processing');
});

// Importar y usar las rutas de pedidos
const ordersRouter = require('./routes/orders');
app.use('/orders', ordersRouter);

// Función para registrar webhooks
const registerWebhooks = async (shop, accessToken) => {
  const client = new Shopify.Clients.Rest(shop, accessToken);

  try {
    await client.post({
      path: 'webhooks',
      data: {
        webhook: {
          topic: 'orders/create',
          address: `${process.env.HOST}/webhooks/orders`,
          format: 'json'
        }
      }
    });
    console.log('Webhook registered successfully');
  } catch (error) {
    console.error('Error registering webhook:', error);
  }
};

// Ruta principal
app.get('/', (req, res) => {
  res.render('index', { title: 'Shopify COD App' });
});

app.listen(port, () => console.log(`Server running on port ${port}`));