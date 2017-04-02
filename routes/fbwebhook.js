var request = require('request');

// load up the user model
var User = require('../routes/models/user');
var handleFeed = require('./fbHandleFeed');

module.exports = function (app) {

  // =====================================
  // FB webhook           ================
  // =====================================
  app.get('/webhook_comment', function (req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === 'token') {
      console.log("Validating webhook");
      res.status(200).send(req.query['hub.challenge']);
    } else {
      console.error("Failed validation. Make sure the validation tokens match.");
      res.sendStatus(403);
    }
  });

  app.post('/webhook_comment', function (req, res) {
    var data = req.body;
    // Make sure this is a page subscription
    if (data.object === 'page') {
      // Iterate over each entry - there may be multiple if batched
      data.entry.forEach(function (entry) {

        if (entry.changes) {
          handleFeedChanges(entry.changes);
        }

        if (entry.messaging) {
          handleMessaging(entry.messaging);
        }

      });
      // Assume all went well.
      //
      // You must send back a 200, within 20 seconds, to let us know
      // you've successfully received the callback. Otherwise, the request
      // will time out and we will keep trying to resend.
      return res.sendStatus(200);
    }
  });

  function handleFeedChanges(changes) {
    // Iterate over each entry - there may be multiple if batched
    changes.forEach(function (entry) {
      var value = entry.value;


      if (value.item == 'post' && value.verb == 'add') {
        handleFeed.receivedEntry(value);
      }

      if (value.item == 'comment' && value.verb == 'add') {
        handleFeed.receivedEntry(value);
      }
      
      else {
        console.log("Webhook received %s, %s event by %s", entry.value.item, entry.value.verb, entry.value.sender_name);
      }

    });

  }

  
  function handleMessaging(messaging) {
    // [{
    //   sender: { id: '1304586366288736' },
    //   recipient: { id: '1675019182790687' },
    //   timestamp: 1489899304663,
    //   message:
    //   {
    //     mid: 'mid.$cAAWpnZ7nIqphFjB-11a5Os1rCMao',
    //     seq: 1000,
    //     text: 'mo'
    //   }
    // }]

    // {
    //   sender: { id: '1304586366288736' },
    //   recipient: { id: '1675019182790687' },
    //   timestamp: 1490003765279,
    //     message:
    //   {
    //     mid: 'mid.$cAAWpnZ7nIqphHGpwH1a6yUyXDprv',
    //       seq: 1039,
    //         sticker_id: 126361874215276,
    //           attachments: [[Object]]
    //   }
    // }

    // Iterate over each entry - there may be multiple if batched
    messaging.forEach(function (message) {
      handleFeed.receivedMessaging(message);
      
    });
    
  }



  function receivedPost(changes, page) {
    var senderID = changes.value.sender_id;
    var commentID = changes.value.post_id;
    var timeOfMessage = changes.value.created_time;
    var messageText = changes.value.message;
    var pagetoken = page.pagetoken
    var pageid = page.id
    console.log("Received message for user %d at %d with message:",
      senderID, timeOfMessage, messageText);
    // refer http://stackoverflow.com/questions/25677743/mongodb-embedded-array-elemmatchprojection-error-issue for clarification
    User.aggregate([
      { "$match": { 'facebook.page.id': pageid } },
      { "$unwind": "$facebook.message" },
      { "$match": { "facebook.message.received": messageText.toLowerCase() } },
      { "$project": { "facebook.message": 1 } }
    ]).exec(function (err, message) {
      if (err)
        console.log(err);
      if (message.length == 0)
        console.log("Message %s is not in database", messageText)
      if (message.length == 1)
        callGraphAPI(message[0].facebook.message.send, commentID, pagetoken)
    });
    // console.log(JSON.stringify(message));

    // var messageId = message.mid;

    // var messageText = message.text;
    // var messageAttachments = message.attachments;

    // if (messageText) {

    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.
    // switch (messageText) {
    //   case 'carousel':
    //     sendGenericMessage(senderID);
    //     break;
    // callGraphAPI(messageText, commentID, pagetoken)
    //   default:
    //   sendTextMessage(senderID, messageText);

    // }
    // } else if (messageAttachments) {
    //   sendTextMessage(senderID, "Message with attachment received");
    // }
  }

  function sendTextMessage(recipientId, messageText) {
    var messageData = {
      recipient: {
        id: 1162039973831674//recipientId
      },
      message: {
        text: "Hai " + messageText// sepatutnya sini messageText
      }
    };
    callSendAPI(messageData);
  }

  function callSendAPI(messageData, token) {
    request({
      uri: 'https://graph.facebook.com/v2.8/me/messages',
      qs: { access_token: token },
      method: 'POST',
      json: messageData

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;

        console.log("Successfully sent generic message with id %s to recipient %s",
          messageId, recipientId);
      } else {
        console.error("Unable to send message: %d %s", response.statusCode, response.statusMessage);
        console.error("Error : ", body.error.code, body.error.message);
      }
    });
  }

  function postPage(page) {
    request({
      uri: 'https://graph.facebook.com/v2.8/' + page.id + '/subscribed_apps',
      method: 'POST',
      qs: { access_token: page.pagetoken }
    }, function (error, response, body) {
      if (!error && JSON.parse(body).success == true) {
        console.log(JSON.parse(body).success);
        page._isAppSubscribed = 'Connected'
        page.save(function (err) {
          console.log(err);
        });
      };
    });
  }
}
