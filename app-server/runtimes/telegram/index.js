const queue = require('async/queue');
const { get: getObjectProperty } = require('lodash/object');

const logger = require('../../logger');
const { TELEGRAM_MESSAGE_TYPES, getMe, sendMessage, leaveChat, cloneMessage } = require('../../utils/telegram');

const bots = {};
const connected_bots = {};

function addBot(username, secret, callbacks) {
  bots[username] = {
    secret,
    callbacks,
    queue: {}
  };
}

function getChatQueue(botUsername, botSecret, chatId) {
  return bots[botUsername] && bots[botUsername].secret === botSecret &&
    (bots[botUsername].queue[chatId] || (bots[botUsername].queue[chatId] = queue(processUpdate, 1)));
}

function hasAnyKey(object, baseKey, keys) {
  return keys.some(key => getObjectProperty(object, `${baseKey}.${key}`) !== undefined);
}

async function processUpdate(task, callback) {
  try {
    const chat_type = getObjectProperty(task, "update.message.chat.type") ||
      getObjectProperty(task, "update.my_chat_member.chat.type") ||
      getObjectProperty(task, "update.channel_post.chat.type");

    const chat_text = getObjectProperty(task, "update.message.text");

    const new_chat_members = getObjectProperty(task, "update.message.new_chat_members");
    const my_chat_member_new_status = getObjectProperty(task, "update.my_chat_member.new_chat_member.status");
    switch (chat_type) {
      case "private":
        if (chat_text === "/start") {
          await bots[task.botUsername].callbacks.onPMChatJoin(task.update);
        } else if (my_chat_member_new_status === "kicked") {
          await bots[task.botUsername].callbacks.onPMChatBlocked(task.update);
        } else if (hasAnyKey(task, "update.message", TELEGRAM_MESSAGE_TYPES)) {
          await bots[task.botUsername].callbacks.onPMChatMessage(task.update);
        }
        break;

      case "group":
      case "supergroup":
        if (new_chat_members && new_chat_members.find(m => m.username === task.botUsername)) {
          await bots[task.botUsername].callbacks.onGroupChatJoin(task.update);
        } else if (my_chat_member_new_status === "left") {
          await bots[task.botUsername].callbacks.onGroupChatLeave(task.update);
        } else if (hasAnyKey(task, "update.message", TELEGRAM_MESSAGE_TYPES)) {
          await bots[task.botUsername].callbacks.onGroupChatMessage(task.update);
        }
        break;

      case "channel":
        if (my_chat_member_new_status === "administrator") {
          await bots[task.botUsername].callbacks.onChannelJoin(task.update);
        } else if (my_chat_member_new_status === "left") {
          await bots[task.botUsername].callbacks.onChannelLeave(task.update);
        } else if (hasAnyKey(task, "update.channel_post", TELEGRAM_MESSAGE_TYPES)) {
          await bots[task.botUsername].callbacks.onChannelMessage(task.update);
        }
        break;

      default:
        break;
    }

  } catch (err) {
    logger.error(err);
    if (callback) {
      callback(err);
    }
  }
}

addBot(process.env.TELEGRAM_BOT_USERNAME, process.env.TELEGRAM_BOT_SECRET, {
  onPMChatJoin: async function (update) {
    await sendMessage({
      chat_id: update.message.chat.id,
      text: `Hi ${update.message.from.first_name}! My name is Mockabot - I can help you mock the experience of a Telegram chatbot.
      
To begin, use @BotFather to create a new bot. Once you have the bot token, you can send a message as your bot to anyone using the command \`/send <BOT TOKEN> <USERNAME> <MESSAGE>\`. Before sending a message, your bot must have initiated a conversation with \`<USERNAME>\`. 
      
If you'd like to not send the bot token every time, I can cache it for you with the command \`/connect <BOT TOKEN>\`. After this you can simply use \`/send <BOT USERNAME> <USERNAME> <MESSAGE>\`.

If you want to send a media or formatted text message, you can just send me the message you want to send and then reply to it with \`/send <BOT USERNAME> <USERNAME>\`.

You can even send to a group using \`/send <BOT USERNAME> <GROUPNAME>\`. Use \`/send <BOT USERNAME> <CHAT ID>\` to send to a private group, where chat id is obtained by sending /chatid in the private group.
      
Click /help for details on my commands and their usage.`,
      parse_mode: "Markdown",
    },
      process.env.TELEGRAM_BOT_TOKEN);
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} started PM chat with ${update.message.from.first_name} | ${update.message.from.username} | ${update.message.from.id} `);
  },
  onPMChatMessage: async function (update) {
    if (!update.message.text) {
      return;
    }
    let apiResponse;
    const args = update.message.text.split(' ');
    if (!args.length) {
      return;
    }
    switch (args[0]) {
      case "/help":
        {
          apiResponse = await command_help(update, args);
        }
        break;
      case "/chatid":
        {
          apiResponse = await command_chatid(update, args);
        }
        break;
      case "/messageid":
        {
          apiResponse = await command_messageid(update, args);
        }
        break;
      case "/connect":
        {
          apiResponse = await command_connect(update, args);
        }
        break;
      case "/send":
        {
          apiResponse = await command_send(update, args);
        }
        break;
      case "/reply":
        {
          apiResponse = await command_reply(update, args);
        }
        break;
    }
  },
  onPMChatBlocked: async function (update) {
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} blocked by ${update.my_chat_member.from.first_name} | ${update.my_chat_member.from.username} | ${update.my_chat_member.from.id}`);
  },
  onGroupChatJoin: async function (update) {
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} joined group ${update.message.chat.title} | ${update.message.chat.id} by ${update.message.from.first_name} | ${update.message.from.username} | ${update.message.from.id} `);
  },
  onGroupChatMessage: async function (update) {
    if (!update.message.text) {
      return;
    }
    let apiResponse;
    const args = update.message.text.split(' ');
    if (!args.length) {
      return;
    }
    switch (args[0]) {
      case "/help":
        {
          apiResponse = await command_help(update, args);
        }
        break;
      case "/chatid":
        {
          apiResponse = await command_chatid(update, args);
        }
        break;
      case "/messageid":
        {
          apiResponse = await command_messageid(update, args);
        }
        break;
      case "/send":
        {
          apiResponse = await command_send(update, args);
        }
        break;
      case "/reply":
        {
          apiResponse = await command_reply(update, args);
        }
        break;
    }
  },
  onGroupChatLeave: async function (update) {
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} kicked in group ${update.my_chat_member.chat.title} | ${update.my_chat_member.chat.id} by ${update.my_chat_member.from.first_name} | ${update.my_chat_member.from.username} | ${update.my_chat_member.from.id} `);
  },
  onChannelJoin: async function (update) {
    await sendMessage({ chat_id: update.my_chat_member.chat.id, text: 'This bot is not designed to be used in a channel and will leave the channel shortly.' },
      process.env.TELEGRAM_BOT_TOKEN);
    await leaveChat({ chat_id: update.my_chat_member.chat.id }, process.env.TELEGRAM_BOT_TOKEN);
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} joined channel ${update.my_chat_member.chat.title} | ${update.my_chat_member.chat.id} by ${update.my_chat_member.from.first_name} | ${update.my_chat_member.from.username} | ${update.my_chat_member.from.id} `);
  },
  onChannelMessage: async function (update) {
    logger.warn(`@${process.env.TELEGRAM_BOT_USERNAME} used in channel ${update.my_chat_member.chat.title} | ${update.my_chat_member.chat.id} `)
  },
  onChannelLeave: async function (update) {
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} kicked in channel ${update.my_chat_member.chat.title} | ${update.my_chat_member.chat.id} by ${update.my_chat_member.from.first_name} | ${update.my_chat_member.from.username} | ${update.my_chat_member.from.id} `);
  },
});

async function command_help(update) {
  apiResponse = await sendMessage({
    chat_id: update.message.chat.id,
    text: `Working on it, will have the help up soon.`,
  },
    process.env.TELEGRAM_BOT_TOKEN);
}

async function command_chatid(update) {
  return sendMessage({
    chat_id: update.message.chat.id,
    text: `${update.message.chat.id}`,
    reply_to_message_id: update.message.message_id,
  },
    process.env.TELEGRAM_BOT_TOKEN);
}

async function command_messageid(update) {
  if (!update.message.reply_to_message) {
    return sendMessage({
      chat_id: update.message.chat.id,
      text: `Usage: Reply to any message with /messageid to know the message id`,
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  }
  return sendMessage({
    chat_id: update.message.chat.id,
    text: `${update.message.reply_to_message.message_id}`,
    reply_to_message_id: update.message.message_id,
  },
    process.env.TELEGRAM_BOT_TOKEN);
}

async function command_connect(update, args) {
  let apiResponse;
  if (args[1] === undefined) {
    await sendMessage({
      chat_id: update.message.chat.id,
      text: `Usage - \`/connect <BOT TOKEN>\``,
      parse_mode: "Markdown",
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
    return apiResponse;
  }
  const bot_token = args[1];
  try {
    apiResponse = await getMe(bot_token);
    const bot_username = `@${apiResponse.data.result.username}`;
    connected_bots[bot_username] = bot_token;
    await sendMessage({
      chat_id: update.message.chat.id,
      text: `Connected bot ${bot_username}. You can now use the bot's username instead of the token for all requests.`,
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  } catch (err) {
    await sendMessage({
      chat_id: update.message.chat.id,
      text: `Unable to connect this token. Please check the token and try again.`,
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  }
  return apiResponse;
}
async function command_send(update, args) {
  return on_send_message(update, args, false);
}

async function command_reply(update, args) {
  return on_send_message(update, args, true);
}

async function on_send_message(update, args, isReply) {
  let apiResponse;
  if (args[1] === undefined || args[2] === undefined || (!update.message.reply_to_message && args[3] === undefined)) {
    await sendMessage({
      chat_id: update.message.chat.id,
      text: `Usage - \`/send ${update.message.reply_to_message ? '' : '<MESSAGE> '}${isReply ? '<REPLY TO MESSAGE ID> ' : ''}[CHAT ID | GROUP USERNAME] [BOT TOKEN | BOT USERNAME]\``,
      parse_mode: "Markdown",
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
    return;
  }

  let message;
  let reply_to_message_id;
  let to_chat_id;
  let bot_token;

  if (update.message.reply_to_message) {
    reply_to_message_id = isReply ? args[1] : undefined;
    to_chat_id = args[isReply ? 2 : 1];
    bot_token = args[isReply ? 3 : 2];
  } else {
    message = args[1];
    reply_to_message_id = isReply ? args[2] : undefined;
    to_chat_id = args[isReply ? 3 : 2];
    bot_token = args[isReply ? 4 : 3];
  }

  let reply_markup = { inline_keyboard: [] };

  let reply_markup_text = update.message.text.match(/\[.+]/g);
  if (reply_markup_text && reply_markup_text.length) {
    reply_markup_text = reply_markup_text[0];
  }

  if (reply_markup_text) {
    try {
      const button_rows = reply_markup_text.match(/\[[^\[\]]+]/gm);
      button_rows.forEach(row => {
        const reply_markup_row = [];
        const columns = row.slice(1, -1).trim().split(',');
        columns.forEach(column => {
          reply_markup_row.push({
            text: column,
            callback_data: column,
          });
        });
        reply_markup.inline_keyboard.push(reply_markup_row);
      });
    } catch (err) {
      logger.error(err);
    }
  }

  if (bot_token.charAt(0) === "@") {
    token = connected_bots[bot_token];
    if (!token) {
      apiResponse = await sendMessage({
        chat_id: update.message.chat.id,
        text: `Bot ${bot_token} is not connected. Please use \`/connect <BOT_TOKEN>\` to connect this bot first.`,
        parse_mode: "Markdown",
        reply_to_message_id: update.message.message_id,
      },
        process.env.TELEGRAM_BOT_TOKEN);
      return;
    }
    bot_token = token;
  }
  try {
    if (update.message.reply_to_message) {
      apiResponse = await cloneMessage({
        chat_id: to_chat_id,
        message: update.message.reply_to_message,
        reply_markup,
        reply_to_message_id,
      },
        bot_token);
    } else {
      apiResponse = await sendMessage({
        chat_id: to_chat_id,
        text: message,
        reply_markup,
        reply_to_message_id,
      },
        bot_token);
    }
  } catch (err) {
    if (err.response) {
      apiResponse = err.response;
    } else {
      throw err;
    }
  }
  const response = apiResponse.status === 200 ? "✅ Message sent" : "❌ Message not sent";
  return sendMessage({
    chat_id: update.message.chat.id,
    text: response,
    reply_to_message_id: update.message.message_id,
  },
    process.env.TELEGRAM_BOT_TOKEN);
}

module.exports = {
  getChatQueue,
};
