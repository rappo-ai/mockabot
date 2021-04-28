const queue = require('async/queue');
const { get: getObjectProperty, has: hasObjectProperty, set: setObjectProperty } = require('lodash/object');

const logger = require('../../logger');
const { TELEGRAM_MESSAGE_TYPES, getMe, sendMessage, cloneMessage, deleteMessage, leaveChat } = require('../../utils/telegram');

const bots = {};

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
      text: `Hi ${update.message.from.first_name}! My name is Mockabot - I can help you mock the experience of a Telegram chatbot in a group. I do this by posting messages to a group as the bot you are trying to mock, after which you can take screenshots of the conversation to create your mockups.
      
I support posting all kinds of Telegram messages like text, photo, video, audio, etc. I can even reply to a message as another bot and attach callback buttons to messages. Click /tutorial for a quick tutorial.

Click /help for details on my commands and their usage.

Mockabot is open-source and can be found at https://github.com/rappo-ai/mockabot.`,
      parse_mode: "Markdown",
    },
      process.env.TELEGRAM_BOT_TOKEN);
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} started PM chat with ${update.message.from.first_name} | ${update.message.from.username} | ${update.message.from.id} `);
  },
  onPMChatMessage: async function (update) {
    await onMessage(update, false);
  },
  onPMChatBlocked: async function (update) {
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} blocked by ${update.my_chat_member.from.first_name} | ${update.my_chat_member.from.username} | ${update.my_chat_member.from.id}`);
  },
  onGroupChatJoin: async function (update) {
    logger.info(`@${process.env.TELEGRAM_BOT_USERNAME} joined group ${update.message.chat.title} | ${update.message.chat.id} by ${update.message.from.first_name} | ${update.message.from.username} | ${update.message.from.id} `);
  },
  onGroupChatMessage: async function (update) {
    await onMessage(update, true);
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

const cache = {};

async function onMessage(update, isGroup) {
  if (!update.message.text) {
    return;
  }
  const command_match = update.message.text.match(/(^\/[a-z]+)/);
  if (!command_match || !command_match.length) {
    return;
  }
  const command = command_match[0];
  let apiResponse;
  switch (command) {
    case "/help":
      {
        apiResponse = await onCommandHelp(update);
      }
      break;
    case "/tutorial":
      {
        apiResponse = await onCommandTutorial(update);
      }
      break;
    case "/chatid":
      {
        apiResponse = await onCommandChatid(update);
      }
      break;
    case "/clearcache":
      {
        apiResponse = await onCommandClearcache(update);
      }
      break;
    case "/send":
      {
        apiResponse = await onCommandSend(update);
      }
      break;
    case "/replyto":
      {
        apiResponse = await onCommandReplyto(update);
      }
      break;
    case "/reply":
      {
        apiResponse = await onCommandReply(update);
      }
      break;
  }
  return apiResponse;
}
async function onCommandHelp(update) {
  apiResponse = await sendMessage({
    chat_id: update.message.chat.id,
    text: `*Mockabot Command Usage*

- /send \`"<message>" <chatid/groupusername> <bottoken/botusername> <buttons>\` - send simple text message as a bot to a group; optionally can send callback buttons (see syntax below)
- /reply \`"<message>" <chatid/groupusername> <bottoken/botusername> <buttons>\` - reply to a message in a group with a simple text message as a bot; optionally can send callback buttons (see syntax below)
- /replyto - reply to a message in the target group with this command to set the target message to reply to
- /chatid - get the id of the current chat
- /clearcache - clears cached bots, bot tokens and groups for the current chat
- /tutorial - display a getting started tutorial
- /help - show this help message

*Notes*
- /send and /reply generally need both Mockabot and the target bot to be added as admins to the target group chat, as well as any other group used for sending the messages
- \`"<message>"\` is optional in /send and /reply if you are replying to a message with these commands; use this to send rich-text, multimedia, etc. messages
- \`<chatid/groupusername>\` and \`<bottoken/botusername>\` are optional once you have used these commands in a group; the last used bot token and group id are cached for future requests
- syntax for adding buttons is \`[[Row_1_Button_1_Text, ...Row_1_Button_N_Text], ...[Row_M_Button_1_Text, ...Row_M_Button_N_Text]]\`; for example \`[[Place Order, Cancel Order], [Contact Support]]\`

Mockabot is open-source and can be found at https://github.com/rappo-ai/mockabot.
`,
    parse_mode: "Markdown",
  },
    process.env.TELEGRAM_BOT_TOKEN);
}

async function onCommandTutorial(update) {
  apiResponse = await sendMessage({
    chat_id: update.message.chat.id,
    text: `To begin, use @BotFather to create a new bot - the bot you would like to mock. Once you have the bot token, I can send a message as this bot to any group using the command /send \`"<message>" <groupusername> <bottoken>\`. For example /send \`"hello" @mygroup 1234567890:mY-bOt-tOkEn\`. Before sending a message, your new bot must be a member of the target group.

Once you use a bot token in any command, it will be cached for you so the next time you can use the bot username instead of the token. For example /send \`"<message>" <groupusername> <botusername>\`. You can even skip the bot username or group username and use /send \`"<message>"\` to send the message - Mockabot will automatically send your message as the last bot and group used. For private groups, you can replace \`<groupusername>\` with \`<groupchatid>\` where chat id is obtained using the command /chatid in the private group.

To send rich media messages, create a separate group and add @mockabot and your target bot as admins. Post any rich media message to the group, then simply reply to that message with /send \`<groupusername> <bottoken>\`. You can skip \`<groupusername>\` and \`<bottoken>\` once these are cached, so just replying with a /send will do.

You can also reply to a message in the target group. Make sure Mockabot is added as an admin to the target group, then reply to the target message with the command /replyto. This will set the target message for the /reply command. Then use /reply instead of /send to send a reply to the target message.

To send callback buttons, you can add the following at the end of the /send and /reply commands - \`[[Row_1_Button_1_Text, ...Row_1_Button_N_Text], ...[Row_M_Button_1_Text, ...Row_M_Button_N_Text]]\`. Each row can have a different number of columns. For example /send \`"hello" @mygroupusername 1234567890:mY-bOt-tOkEn [[Place Order, Cancel Order], [Contact Support]]\`.

Mockabot does not store your data in any database, and your cache might get cleared without notice. To force your cache to get cleared for a particular group chat use the command /clearcache.

Mockabot also does not set any webhooks on your bots, or try to read any incoming updates using your bot tokens.

Mockabot is open-source and can be found at https://github.com/rappo-ai/mockabot.
`,
    parse_mode: "Markdown",
  },
    process.env.TELEGRAM_BOT_TOKEN);
}

async function onCommandChatid(update) {
  return sendMessage({
    chat_id: update.message.chat.id,
    text: `${update.message.chat.id}`,
    reply_to_message_id: update.message.message_id,
  },
    process.env.TELEGRAM_BOT_TOKEN);
}

async function onCommandClearcache(update) {
  setObjectProperty(cache, `[${update.message.chat.id}]`, {});
  return sendMessage({
    chat_id: update.message.chat.id,
    text: `Cache cleared.`,
    reply_to_message_id: update.message.message_id,
  },
    process.env.TELEGRAM_BOT_TOKEN);
}

async function onCommandSend(update) {
  return doSendMessage(update, false);
}

async function onCommandReplyto(update) {
  if (!update.message.reply_to_message) {
    return sendMessage({
      chat_id: update.message.chat.id,
      text: `Usage: Reply to any message in the target chat with /replyto to set the target message for /reply.`,
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  }
  setObjectProperty(cache, `${update.message.chat.id}.reply_to.message_id`, update.message.reply_to_message.message_id);
  setObjectProperty(cache, `${update.message.chat.id}.reply_to.command_message_id`, update.message.message_id);
  const apiResponse = await sendMessage({
    chat_id: update.message.chat.id,
    text: `This message will be replied to when you use /reply command with this target group.`,
    reply_to_message_id: update.message.message_id,
  },
    process.env.TELEGRAM_BOT_TOKEN);
  setObjectProperty(cache, `${update.message.chat.id}.reply_to.status_message_id`, apiResponse.data.result.message_id);
}

async function onCommandReply(update) {
  return doSendMessage(update, true);
}

async function doSendMessage(update, isReplyCommand) {
  const matches = update.message.text.match(/(^\/[a-z]+)\s*(".*")?\s*(@\w{5,})?(-?\d+)?\s*(\d{10}:\S{35})?(@\w{5,})?/);
  const command = matches[1];
  const message = matches[2] ? matches[2].slice(1, -1) : undefined;
  const group_username = matches[3];
  const chat_id = matches[4];
  let bot_token = matches[5];
  const bot_username = matches[6];

  const to_chat_id = group_username || chat_id || getObjectProperty(cache, `${update.message.chat.id}.recent_group]`);

  let apiResponse;
  if (!update.message.reply_to_message && message === undefined) {
    return sendMessage({
      chat_id: update.message.chat.id,
      text: `Usage - \`/${isReplyCommand ? 'reply' : 'send'} ${update.message.reply_to_message ? '' : '"<message>" '}<chatid/groupusername> <bottoken/botusername>\``,
      parse_mode: "Markdown",
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  } else if (group_username === undefined && chat_id === undefined && !hasObjectProperty(cache, `${update.message.chat.id}.recent_group`)) {
    return sendMessage({
      chat_id: update.message.chat.id,
      text: `No group found in the cache. Please specify the group username or chat id.

Usage - \`/${isReplyCommand ? 'reply' : 'send'} ${update.message.reply_to_message ? '' : '"<message>" '}<chatid/groupusername> <bottoken/botusername>\``,
      parse_mode: "Markdown",
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  } else if (bot_token === undefined && bot_username === undefined && !hasObjectProperty(cache, `${update.message.chat.id}.recent_bot`)) {
    return sendMessage({
      chat_id: update.message.chat.id,
      text: `No bot found in the cache. Please specify the bot token.

Usage - \`/${isReplyCommand ? 'reply' : 'send'} ${update.message.reply_to_message ? '' : '"<message>" '}<chatid/groupusername> <bottoken>\``,
      parse_mode: "Markdown",
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  } else if (bot_username && !hasObjectProperty(cache, `${update.message.chat.id}.bot_username_to_token.${bot_username}`)) {
    return sendMessage({
      chat_id: update.message.chat.id,
      text: `${bot_username} not found in the cache. Please specify a different bot username or the bot token.

Usage - \`/${isReplyCommand ? 'reply' : 'send'} ${update.message.reply_to_message ? '' : '"<message>" '}<chatid/groupusername> <bottoken/botusername>\``,
      parse_mode: "Markdown",
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  } else if (isReplyCommand && !hasObjectProperty(cache, `${to_chat_id}.reply_to.message_id`)) {
    return sendMessage({
      chat_id: update.message.chat.id,
      text: `Reply target message not set. Please reply to any message in the target group with /replyto command to set it as the target message for /reply.`,
      parse_mode: "Markdown",
      reply_to_message_id: update.message.message_id,
    },
      process.env.TELEGRAM_BOT_TOKEN);
  }

  if (bot_username) {
    bot_token = getObjectProperty(cache, `${update.message.chat.id}.bot_username_to_token.${bot_username}`);
  } else if (!bot_token) {
    bot_token = getObjectProperty(cache, `${update.message.chat.id}.recent_bot`);
  }

  const reply_markup = { inline_keyboard: getInlineKeyboard(update) };
  const reply_to_message_id = isReplyCommand ? getObjectProperty(cache, `${to_chat_id}.reply_to.message_id`) : undefined;

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
    process.env.TELEGRAM_BOT_TOKEN).then(async sendMessageApiResponse => {
      if (apiResponse.status === 200) {
        // cache the bot and the group
        setObjectProperty(cache, `${update.message.chat.id}.recent_group`, to_chat_id);
        setObjectProperty(cache, `${update.message.chat.id}.recent_bot`, bot_token);

        cached_bot_username = getObjectProperty(cache, `${update.message.chat.id}.bot_token_to_username.${bot_token}`);
        if (!cached_bot_username) {
          try {
            apiResponse = await getMe(bot_token);
            const fetched_bot_username = `@${apiResponse.data.result.username}`;
            setObjectProperty(cache, `${update.message.chat.id}.bot_token_to_username.${bot_token}`, fetched_bot_username);
            setObjectProperty(cache, `${update.message.chat.id}.bot_username_to_token.${fetched_bot_username}`, bot_token);
            await sendMessage({
              chat_id: update.message.chat.id,
              text: `${fetched_bot_username} added to cache. You can now use the bot's username instead of the bot token for all requests.`,
              reply_to_message_id: update.message.message_id,
            },
              process.env.TELEGRAM_BOT_TOKEN);
          } catch (err) {
            await sendMessage({
              chat_id: update.message.chat.id,
              text: `Unable to cache this token. Please use the bot token while we work to resolve this issue.`,
              reply_to_message_id: update.message.message_id,
            },
              process.env.TELEGRAM_BOT_TOKEN);
          }
        }

        // delete the reply-to command and status messages
        if (isReplyCommand) {
          let delete_api_response;
          delete_api_response = await deleteMessage({
            chat_id: to_chat_id,
            message_id: getObjectProperty(cache, `${to_chat_id}.reply_to.command_message_id`),
          }, process.env.TELEGRAM_BOT_TOKEN);
          delete_api_response = await deleteMessage({
            chat_id: to_chat_id,
            message_id: getObjectProperty(cache, `${to_chat_id}.reply_to.status_message_id`),
          }, process.env.TELEGRAM_BOT_TOKEN);
        }
      }
      return sendMessageApiResponse;
    });
}

function getInlineKeyboard(update) {
  inline_keyboard = [];

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
        inline_keyboard.push(reply_markup_row);
      });
    } catch (err) {
      logger.error(err);
    }
  }
  return inline_keyboard;
}

module.exports = {
  getChatQueue,
};
