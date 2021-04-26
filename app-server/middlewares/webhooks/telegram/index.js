const express = require('express');
const { get: getObjectProperty } = require('lodash/object');

const logger = require('../../../logger');
const { getChatQueue } = require('../../../runtimes/telegram');
const router = express.Router();

function processWebhook(botUsername, botSecret, requestBody) {
  let chatId = getObjectProperty(requestBody, "message.chat.id") ||
    getObjectProperty(requestBody, "my_chat_member.chat.id") ||
    getObjectProperty(requestBody, "channel_post.chat.id");

  if (!chatId) {
    logger.info("no chat id for incoming webhook message");
    return;
  }

  const queue = getChatQueue(botUsername, botSecret, chatId);

  if (!queue) {
    logger.info(`no queue found for ${botUsername} ${chatId}`);
    return;
  }

  queue.push(
    {
      botUsername,
      botSecret,
      update: requestBody,
    },
    err => err && console.log(err.message),
  );
}

router.post('/:botUsername/:botSecret', (req, res) => {
  try {
    processWebhook(req.params.botUsername, req.params.botSecret, req.body);
  } catch (err) {
    logger.error(err);
  }
  res.status(200);
  return res.end();
});

module.exports = router;
