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

function messageCallback(err, res) {
    if (!err && res.statusCode == 200) {
        console.log("Successfully sent generic message with id %s",
            res.body.id);
    } else {
        console.error("Unable to send message: %d %s", res.statusCode, res.statusMessage);
        console.error("Error : ", res.body.err.type, res.body.err.message);
    }
}

function GraphAPI(options, fbObject, callback) {
    return request({
        uri: 'https://graph.facebook.com/v2.8/' + fbObject.objectID + fbObject.edge,
        qs: options,
        method: fbObject.method,
        json: true
    }, callback);
}