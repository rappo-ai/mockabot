const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, './.env.server'),
});

const express = require('express');
const morgan = require('morgan')('combined');

const argv = require('./argv');
const logger = require('./logger');
const webhooks = require('./middlewares/webhooks');
const { callTelegramApi, getWebhookUrl } = require('./utils/telegram');
const port = require('./port');

const isDev = process.env.NODE_ENV !== 'production';
const isProd = process.env.NODE_ENV === 'production';
const ngrok =
  (isDev && process.env.ENABLE_TUNNEL) || argv.tunnel
    ? require('ngrok')
    : false;

const app = express();

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(morgan);
app.use(express.json());

if (isProd) {
  app.set('trust proxy', 1);
}

// If you need a backend, e.g. an API, add your custom backend-specific middleware here
app.use('/webhooks', webhooks);

// get the intended host and port number, use localhost and port 3000 if not provided
const customHost = argv.host || process.env.HOST;
const host = customHost || null; // Let http.Server use its default IPv6/4 host
const prettyHost = customHost || 'localhost';

// Start your app.
app.listen(port, host, async err => {
  if (err) {
    return logger.error(err.message);
  }

  let hostUrl = `https://${host}`;
  // Connect to ngrok in dev mode
  if (ngrok) {
    try {
      const ngrokOptions = {
        addr: port,
      };
      if (process.env.NGROK_AUTH_TOKEN) {
        ngrokOptions.authtoken = process.env.NGROK_AUTH_TOKEN;
      }
      if (process.env.NGROK_REGION) {
        ngrokOptions.region = process.env.NGROK_REGION;
      }
      hostUrl = await ngrok.connect(ngrokOptions);
    } catch (e) {
      return logger.error(e);
    }
    logger.appStarted(port, prettyHost, hostUrl);
  } else {
    logger.appStarted(port, prettyHost);
  }

  try {
    let setWebhookResponse;

    logger.info(`Calling setWebhook for bot with username ${process.env.TELEGRAM_BOT_USERNAME}`);
    setWebhookResponse = await callTelegramApi("setWebhook", process.env.TELEGRAM_BOT_TOKEN, {
      url: getWebhookUrl(hostUrl, process.env.TELEGRAM_BOT_USERNAME, process.env.TELEGRAM_BOT_SECRET),
    });
    logger.info(setWebhookResponse.data);
  } catch (e) {
    logger.error(e);
  }
});
