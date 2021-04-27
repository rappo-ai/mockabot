const axios = require('axios').default;
const { get: getObjectProperty } = require('lodash/object');

const TELEGRAM_MESSAGE_TYPES = ["text", "animation", "audio", "document", "photo", "sticker", "video", "video_note", "voice", "caption", "contact", "dice", "game", "poll", "venue", "location"];

async function callTelegramApi(endpoint, token, body = {}) {
  return axios.post(`https://api.telegram.org/bot${token}/${endpoint}`, {
    ...body,
  });
}

function getWebhookUrl(hostUrl, username, secret) {
  return `${hostUrl}/webhooks/telegram/${username}/${secret}`;
}

async function getMe(botToken) {
  return callTelegramApi(
    'getMe',
    botToken,
  );
}

async function sendMessage({ chat_id, text, reply_to_message_id = "", reply_markup = {}, parse_mode = "", entities = [] }, botToken) {
  return callTelegramApi(
    'sendMessage',
    botToken,
    {
      chat_id,
      text,
      reply_to_message_id,
      reply_markup,
      parse_mode,
      entities,
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

async function sendPhoto({ chat_id, photo, caption, caption_entities, reply_to_message_id = "", reply_markup = {}, parse_mode = "" }, botToken) {
  return callTelegramApi(
    'sendPhoto',
    botToken,
    {
      chat_id,
      photo,
      caption,
      caption_entities,
      reply_to_message_id,
      reply_markup,
      parse_mode,
    },
  );
}

async function sendAudio({ chat_id, audio, duration, performer, title, thumb, caption, caption_entities, reply_to_message_id = "", reply_markup = {}, parse_mode = "" }, botToken) {
  return callTelegramApi(
    'sendAudio',
    botToken,
    {
      chat_id,
      audio,
      duration,
      performer,
      title,
      thumb,
      caption,
      caption_entities,
      reply_to_message_id,
      reply_markup,
      parse_mode,
    },
  );
}

async function sendDocument({ chat_id, document, thumb, caption, caption_entities, reply_to_message_id = "", reply_markup = {}, parse_mode = "" }, botToken) {
  return callTelegramApi(
    'sendDocument',
    botToken,
    {
      chat_id,
      document,
      thumb,
      caption,
      caption_entities,
      reply_to_message_id,
      reply_markup,
      parse_mode,
    },
  );
}

async function sendVideo({ chat_id, video, duration, width, height, thumb, caption, caption_entities, reply_to_message_id = "", reply_markup = {}, parse_mode = "" }, botToken) {
  return callTelegramApi(
    'sendVideo',
    botToken,
    {
      chat_id,
      video,
      duration,
      width,
      height,
      thumb,
      caption,
      caption_entities,
      reply_to_message_id,
      reply_markup,
      parse_mode,
    },
  );
}

async function sendAnimation({ chat_id, animation, duration, width, height, thumb, caption, caption_entities, reply_to_message_id = "", reply_markup = {}, parse_mode = "" }, botToken) {
  return callTelegramApi(
    'sendAnimation',
    botToken,
    {
      chat_id,
      animation,
      duration,
      width,
      height,
      thumb,
      caption,
      caption_entities,
      reply_to_message_id,
      reply_markup,
      parse_mode,
    },
  );
}

async function sendVoice({ chat_id, voice, duration, caption, caption_entities, reply_to_message_id = "", reply_markup = {}, parse_mode = "" }, botToken) {
  return callTelegramApi(
    'sendVoice',
    botToken,
    {
      chat_id,
      voice,
      duration,
      caption,
      caption_entities,
      reply_to_message_id,
      reply_markup,
      parse_mode,
    },
  );
}

async function sendVideoNote({ chat_id, video_note, duration, length, thumb, reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendVideoNote',
    botToken,
    {
      chat_id,
      video_note,
      duration,
      length,
      thumb,
      reply_to_message_id,
      reply_markup,
    },
  );
}

async function sendLocation({ chat_id, longitude, latitude, horizontal_accuracy, live_period, heading, proximity_alert_radius, reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendLocation',
    botToken,
    {
      chat_id,
      longitude,
      latitude,
      horizontal_accuracy,
      live_period,
      heading,
      proximity_alert_radius,
      reply_to_message_id,
      reply_markup,
    },
  );
}

async function sendVenue({ chat_id, longitude, latitude, title, address, foursquare_id, foursquare_type, google_place_id, google_place_type, reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendVenue',
    botToken,
    {
      chat_id,
      longitude,
      latitude,
      title,
      address,
      foursquare_id,
      foursquare_type,
      google_place_id,
      google_place_type,
      reply_to_message_id,
      reply_markup,
    },
  );
}

async function sendContact({ chat_id, phone_number, first_name, last_name, vcard, reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendContact',
    botToken,
    {
      chat_id,
      phone_number,
      first_name,
      last_name,
      vcard,
      reply_to_message_id,
      reply_markup,
    },
  );
}

async function sendPoll({ chat_id, question, options, is_anonymous, type, allows_multiple_answers, correct_option_id, explanation, explanation_entities, open_period, close_date, is_closed, reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendPoll',
    botToken,
    {
      chat_id,
      question,
      options,
      is_anonymous,
      type,
      allows_multiple_answers,
      correct_option_id,
      explanation,
      explanation_entities,
      open_period,
      close_date,
      is_closed,
      reply_to_message_id,
      reply_markup,
    },
  );
}

async function sendDice({ chat_id, emoji = "", reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendDice',
    botToken,
    {
      chat_id,
      emoji,
      reply_to_message_id,
      reply_markup,
    },
  );
}

async function sendSticker({ chat_id, sticker, reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendSticker',
    botToken,
    {
      chat_id,
      sticker,
      reply_to_message_id,
      reply_markup,
    },
  );
}

async function sendGame({ chat_id, game_short_name, reply_to_message_id = "", reply_markup = {} }, botToken) {
  return callTelegramApi(
    'sendGame',
    botToken,
    {
      chat_id,
      game_short_name,
      reply_to_message_id,
      reply_markup,
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

async function cloneMessage({ message, chat_id, reply_to_message_id = "", reply_markup = {} }, botToken) {
  let apiResponse;
  TELEGRAM_MESSAGE_TYPES.forEach(type => {
    if (!message[type] || apiResponse) {
      return;
    }
    switch (type) {
      case "text":
        apiResponse = sendMessage({
          chat_id,
          reply_to_message_id,
          reply_markup,
          text: message.text,
          entities: message.entities,
        }, botToken);
        break;

      case "photo":
        apiResponse = sendPhoto({
          chat_id,
          reply_to_message_id,
          reply_markup,
          photo: message.photo[message.photo.length - 1].file_id, // last file observed to be the best quality full-res file
          caption: message.caption,
          caption_entities: message.caption_entities,
        }, botToken);
        break;

      case "audio":
        apiResponse = sendAudio({
          chat_id,
          reply_to_message_id,
          reply_markup,
          audio: message.audio.file_id,
          duration: message.audio.duration,
          performer: message.audio.performer,
          title: message.audio.title,
          thumb: getObjectProperty(message, "audio.thumb.file_id"),
          caption: message.caption,
          caption_entities: message.caption_entities,
        }, botToken);
        break;

      case "document":
        apiResponse = sendDocument({
          chat_id,
          reply_to_message_id,
          reply_markup,
          document: message.document.file_id,
          thumb: getObjectProperty(message, "document.thumb.file_id"),
          caption: message.caption,
          caption_entities: message.caption_entities,
        }, botToken);
        break;

      case "video":
        apiResponse = sendVideo({
          chat_id,
          reply_to_message_id,
          reply_markup,
          video: message.video.file_id,
          duration: message.video.duration,
          width: message.video.width,
          height: message.video.height,
          thumb: getObjectProperty(message, "video.thumb.file_id"),
          caption: message.caption,
          caption_entities: message.caption_entities,
        }, botToken);
        break;

      case "animation":
        apiResponse = sendAnimation({
          chat_id,
          reply_to_message_id,
          reply_markup,
          animation: message.animation.file_id,
          duration: message.animation.duration,
          width: message.animation.width,
          height: message.animation.height,
          thumb: getObjectProperty(message, "animation.thumb.file_id"),
          caption: message.caption,
          caption_entities: message.caption_entities,
        }, botToken);
        break;

      case "voice":
        apiResponse = sendVoice({
          chat_id,
          reply_to_message_id,
          reply_markup,
          voice: message.voice.file_id,
          duration: message.voice.duration,
          caption: message.caption,
          caption_entities: message.caption_entities,
        }, botToken);
        break;

      case "video_note":
        apiResponse = sendVideoNote({
          chat_id,
          reply_to_message_id,
          reply_markup,
          video_note: message.video_note.file_id,
          duration: message.video_note.duration,
          length: message.video_note.length,
          thumb: getObjectProperty(message, "video_note.thumb.file_id"),
        }, botToken);
        break;

      case "location":
        apiResponse = sendLocation({
          chat_id,
          reply_to_message_id,
          reply_markup,
          latitude: message.location.latitude,
          longitude: message.location.longitude,
          horizontal_accuracy: message.location.horizontal_accuracy,
          live_period: message.location.live_period,
          heading: message.location.heading,
          proximity_alert_radius: message.location.proximity_alert_radius,
        }, botToken);
        break;

      case "venue":
        apiResponse = sendVenue({
          chat_id,
          reply_to_message_id,
          reply_markup,
          latitude: message.venue.location.latitude,
          longitude: message.venue.location.longitude,
          title: message.venue.title,
          address: message.venue.address,
          foursquare_id: message.venue.foursquare_id,
          foursquare_type: message.venue.foursquare_type,
          google_place_id: message.venue.google_place_id,
          google_place_type: message.venue.google_place_type,
        }, botToken);
        break;

      case "contact":
        apiResponse = sendContact({
          chat_id,
          reply_to_message_id,
          reply_markup,
          phone_number: message.contact.phone_number,
          first_name: message.contact.first_name,
          last_name: message.contact.last_name,
          vcard: message.contact.vcard,
        }, botToken);
        break;

      case "poll":
        apiResponse = sendPoll({
          chat_id,
          reply_to_message_id,
          reply_markup,
          question: message.poll.question,
          options: message.poll.options,
          is_anonymous: message.poll.is_anonymous,
          type: message.poll.type,
          allows_multiple_answers: message.poll.allows_multiple_answers,
          correct_option_id: message.poll.correct_option_id,
          explanation: message.poll.explanation,
          explanation_entities: message.poll.explanation_entities,
          open_period: message.poll.open_period,
          close_date: message.poll.close_date,
          is_closed: message.poll.is_closed,
        }, botToken);
        break;

      case "dice":
        apiResponse = sendDice({
          chat_id,
          reply_to_message_id,
          reply_markup,
          emoji: message.dice.emoji,
        }, botToken);
        break;

      case "sticker":
        apiResponse = sendSticker({
          chat_id,
          reply_to_message_id,
          reply_markup,
          sticker: message.sticker.file_id,
        }, botToken);
        break;

      case "game":
        /*apiResponse = sendGame({
          chat_id,
          reply_to_message_id,
          reply_markup,
          game_short_name: message.game.?,
        }, botToken);*/
        break;

      default:
        logger.error(`cloneMessage: message type '${type}' not implemented`);
        break;
    }
  });
  return apiResponse;
}

module.exports = {
  callTelegramApi,
  TELEGRAM_MESSAGE_TYPES,
  getWebhookUrl,
  getMe,
  sendMessage,
  forwardMessage,
  copyMessage,
  sendPhoto,
  sendAudio,
  sendDocument,
  sendVideo,
  sendAnimation,
  sendVoice,
  sendVideoNote,
  sendLocation,
  sendVenue,
  sendContact,
  sendPoll,
  sendDice,
  sendSticker,
  sendGame,
  leaveChat,
  cloneMessage,
};
