var request = require('request');

module.exports = {
    replyFeed: function (messageData, commentID, token) {
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
}