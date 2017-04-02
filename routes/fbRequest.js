var request = require('request');

module.exports = {
    replyComment: function (options, objectID) {
        // https://developers.facebook.com/docs/graph-api/reference/v2.8/comment
        GraphAPI(options, {
            objectID: objectID,
            edge: '/comments',
            method: 'POST'
        }, messageCallback);
    },

    replyMessage: function (options, objectID) {
        // https://developers.facebook.com/docs/graph-api/reference/v2.8/comment
        GraphAPI(options, {
            objectID: objectID,
            edge: '/private_replies',
            method: 'POST'
        }, messageCallback);
    },

    fbGraphAPI: GraphAPI
}

function messageCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log("Successfully sent generic message with id %s",
            body.id);
    } else {
        console.error("Unable to send message: %d %s", response.statusCode, response.statusMessage);
        console.error("Error : ", body.error.type, body.error.message);
    }
}

function GraphAPI(options, fbObject, callback) {
    return request({
        uri: 'https://graph.facebook.com/v2.8/' + fbObject.objectID + fbObject.edge,
        qs: options,
        method: fbObject.method,
        json: true // Automatically parses the JSON string in the response
    }, callback);
}