var request = require('request');

// load up the user model
var User = require('../routes/models/user');

module.exports = function (app, passport) {


  app.get('/:userid/activatewebhook/:no', function (req, res, next) {
    var user = req.user
    var page = user.facebook.page[req.params.no];
    request({
      uri: 'https://graph.facebook.com/v2.8/' + page.id + '/subscribed_apps',
      method: 'POST',
      qs: { access_token: page.pagetoken }
    }, function (error, response, body) {
      if (!error && JSON.parse(body).success == true) {
        page._isAppSubscribed = 'Connected'
        user.save(function (err) {
          console.log(err);
        });
        next(); // go to next callback
      };
    });
  }, function (req, res) {
    res.redirect('/' + req.user._id + '/profile');
  });

  app.get('/:userid/deactivatewebhook/:no', function (req, res, next) {
    var user = req.user
    var page = user.facebook.page[req.params.no];
    request({
      uri: 'https://graph.facebook.com/v2.8/' + page.id + '/subscribed_apps',
      method: 'DELETE',
      qs: { access_token: page.pagetoken }
    }, function (error, response, body) {
      if (!error && JSON.parse(body).success == true) {
        console.log(JSON.parse(body).success);
        page._isAppSubscribed = 'Not Connected'
        user.save(function (err) {
          console.log(err);
        });
        next(); // go to next callback
      };
    });
  }, function (req, res) {
    res.redirect('/' + req.user._id + '/profile');
  });

  app.post('/:userid/savemessage', function (req, res, next) {
    var user = req.user;
    // checking datatabase
    User.findOne({
      'facebook.message.received': req.body.keyword,
      '_id': req.params.userid
    }, { 'facebook.message.$': 1 }, function (err, message) {
      if (err) { console.log(err); }
      // if keyword still not exist
      if (!message) {
        next() // go to next callback to store values
      }
      // if keyword already exist
      if (message) {
        res.redirect('/' + req.user._id + '/profile');
      }
    });
  }, function (req, res) {
    var user = req.user;
    var messageData = {
      received: req.body.keyword,
      send: req.body.reply
    }
    user.facebook.message[user.facebook.message.length] = messageData;
    user.save(function (err) {
      res.redirect('/' + req.user._id + '/profile');
    });
  });

  app.get('/:userid/removemessage/:no', function (req, res, next) {
    var user = req.user;
    user.facebook.message[req.params.no].remove();
    user.save(function (err) {
      res.redirect('/' + req.user._id + '/profile');
    });
  });


  app.get('/:userid/connect/page', function (req, res, next) {
    var user = req.user;
    request.get({
      url: 'https://graph.facebook.com/me/accounts',
      qs: { access_token: user.facebook.token }
    }, function (err, res) {
      var body = JSON.parse(res.body);
      if (!err && res.statusCode == 200) {
        body.data.forEach(function (data, index) {
          User.findOne({
            'user._id': { $ne: user._id },
            'facebook.page.id': data.id
          }, function (err, page) {
            if (err) {
              console.log(err);
            }
            // if page still does not exist
            if (!page) {
              var pagedata = {
                name: data.name,
                id: data.id,
                pagetoken: data.access_token,
                _isAppSubscribed: 'Not Connected'
              }
              // update datatabase
              user.facebook.page[index] = pagedata;
              user.save(function (err) {
                console.log(err);
              });
            }
            // if page already exist
            if (page) {
              var pagedata = {
                name: data.name,
                id: 'None',
                pagetoken: 'None',
                _isAppSubscribed: 'Registered under ' + user.facebook.name
              }
              // update datatabase
              user.facebook.page[index] = pagedata;
              user.save(function (err) {
                console.log(err);
              });
            }
          });
        });
        next(); // go to next callback 
      }
    });// end of request
  }, function (req, res) {
    // respond to /connect/page route
    res.redirect('/' + req.user._id + '/profile');
  });

  app.get('/:userid/unlink/page', function (req, res) {
    var user = req.user;
    user.facebook.page = undefined;
    user.save(function (err) {
      console.log(err);
      res.redirect('/' + req.user._id + '/profile');
    });
  });

  // =====================================
  // FB apps verification ================
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
        User.findOne({ 'facebook.page.id': pageID }, { 'facebook.page.$': 1 }, function (err, user) {
          // Iterate over each messaging event
          entry.changes.forEach(function (changes) {
            if (changes.value.item == "comment" && changes.value.verb == "add") {
              // redirect to route to handle the request
              receivedComment(changes, user.facebook.page[0].pagetoken);
              console.log(changes.value.message);
            } else if (changes.value.item == "post" && changes.value.verb == "add") {
              receivedComment(changes, user.facebook.page[0].pagetoken);
              console.log(changes.value.message);
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

  // =====================================
  // Listening to FB changes =============
  // =====================================
  function receivedComment(changes, pagetoken) {
    var senderID = changes.value.sender_id;
    var commentID = changes.value.comment_id;
    var timeOfMessage = changes.value.created_time;
    var messageText = changes.value.message;

    console.log("Received message for user %d at %d with message:",
      senderID, timeOfMessage, messageText);
    User.findOne({ 'facebook.message.received': messageText }, { 'facebook.message.$': 1 }, function (err, user) {
      if (err)
        console.log(err);
      if (!user)
        console.log("Message %s is not in database", messageText)
      if (user)
        callGraphAPI(user.facebook.message[0].send, commentID, pagetoken)
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
      // json: messageData

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;
        console.log("Successfully sent generic message with id %s to recipient %s",
          messageId, recipientId);
      } else {
        var error = JSON.parse(body)
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
