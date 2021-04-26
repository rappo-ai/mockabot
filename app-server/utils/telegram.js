const axios = require('axios').default;

async function callTelegramApi(endpoint, token, body = {}) {
  return axios.post(`https://api.telegram.org/bot${token}/${endpoint}`, {
    ...body,
  });
}

function getWebhookUrl(hostUrl, username, secret) {
  return `${hostUrl}/webhooks/telegram/${username}/${secret}`;
}

async function sendMessage({ chat_id, text, reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendMessage',
    botToken,
    {
      chat_id,
      text,
      reply_to_message_id,
      reply_markup,
    },
  );
}

async function forwardMessage({ chat_id, from_chat_id, message_id }, botToken) {
  return callTelegramApi(
    'forwardMessage',
    botToken,
    {
      chat_id,
      from_chat_id,
      message_id,
    },
  );
}

async function copyMessage({ chat_id, from_chat_id, message_id, reply_to_message_id }, botToken) {
  return callTelegramApi(
    'copyMessage',
    botToken,
    {
      chat_id,
      from_chat_id,
      message_id,
      reply_to_message_id,
    },
  );
}

async function leaveChat({ chat_id }, botToken) {
  return callTelegramApi(
    'leaveChat',
    botToken,
    {
      chat_id,
    }
  );
}

module.exports = {
  callTelegramApi,
  getWebhookUrl,
  sendMessage,
  forwardMessage,
  copyMessage,
  leaveChat,
};
