var request = require('request');

// load up the user model
var User = require('../routes/models/user');

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
        var pageID = entry.id;
        var timeOfEvent = entry.time;
        User
          .findOne({ 'facebook.page.id': pageID })
          .select({ 'facebook.page.$': 1 })
          .lean()
          .exec(function (err, user) {
          // Iterate over each messaging event
          entry.changes.forEach(function (changes) {
            if (changes.value.item == "comment" && changes.value.verb == "add") {
              // redirect to route to handle the request
              receivedComment(changes, user.facebook.page[0]);
            } else if (changes.value.item == "post" && changes.value.verb == "add") {
              receivedPost(changes, user.facebook.page[0]);
            } else {
              console.log("Webhook received %s, %s event by %s", changes.value.item, changes.value.verb, changes.value.sender_name);
            }
          });
        });
      });
      // Assume all went well.
      //
      // You must send back a 200, within 20 seconds, to let us know
      // you've successfully received the callback. Otherwise, the request
      // will time out and we will keep trying to resend.
      res.sendStatus(200);
    }
  });

  app.get('/webhook_comment/:pageid', function (req, res) {
    var user = req.user;
    user.facebook.page = undefined;
    user.save(function (err) {
      console.log(err);
      res.redirect('/' + req.user._id + '/profile');
    });
  });

  // =====================================
  // Listening to FB changes =============
  // =====================================
  function receivedComment(changes, page) {
    var senderID = changes.value.sender_id;
    var commentID = changes.value.comment_id;
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
      { "$match": { "facebook.message.received": messageText.toLowerCase() } }, // to make it case insensitive
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

  function callGraphAPI(messageData, commentID, token) {
    request({
      uri: 'https://graph.facebook.com/v2.8/' + commentID + '/comments',
      qs: {
        message: messageData,
        access_token: token
      },
      method: 'POST'
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log("Successfully sent generic message with id %s",
          JSON.parse(body).id);
      } else {
        var error = JSON.parse(body);
        console.error("Unable to send message: %d %s", response.statusCode, response.statusMessage);
        console.error("Error : ", error.error.type, error.error.message);
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
