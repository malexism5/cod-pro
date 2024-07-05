const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
require('dotenv').config(); // Cargar las variables de entorno desde .env

const app = express();
const PORT = process.env.PORT || 3000;

//clave secreta de la aplicación Shopify desde las variables de entorno
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// Configura el body parser para recibir JSON
app.use(bodyParser.json());

// Función para verificar el webhook
function verifyShopifyWebhook(req, res, next) {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = JSON.stringify(req.body);
  const generatedHmac = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (generatedHmac !== hmac) {
    return res.status(401).send('Webhook verification failed');
  }

  return next();
}

// Ruta para manejar los webhooks
app.post('/webhooks', verifyShopifyWebhook, (req, res) => {
  const topic = req.get('X-Shopify-Topic');
  const shop = req.get('X-Shopify-Shop-Domain');

  console.log(`Recibido webhook de ${shop} para el tema ${topic}`);
  console.log(req.body);

  // Aquí puedes procesar el webhook según el tema
  switch (topic) {
    case 'orders/create':
      // Manejar el webhook de creación de órdenes
      console.log('Orden creada:', req.body);
      break;
    case 'products/update':
      // Manejar el webhook de actualización de productos
      console.log('Producto actualizado:', req.body);
      break;
    case 'app/uninstalled':
      // Manejar el webhook de desinstalación de la aplicación
      console.log('App desinstalada:', req.body);
      break;
    // Agrega más casos según los webhooks que manejes
    default:
      console.log('Webhook no manejado:', topic);
      break;
  }

  res.status(200).send('Webhook recibido');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor de webhooks escuchando en http://localhost:${PORT}`);
});
