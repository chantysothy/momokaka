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

}
