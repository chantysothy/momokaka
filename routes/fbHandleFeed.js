// load up the user model
var User = require('../routes/models/user');
var fbRequest = require('./fbRequest.js');
var fbCommentReplyTemplate = require('./fbCommentReplyTemplate.js');
var fbMsgReplyTemplate = require('./fbMsgReplyTemplate.js');
var async = require('async');

module.exports = {
    receivedEntry: function (value) {
        // [{ new comment
        //   field: 'feed',
        //   value:
        //   {
        //     item: 'comment',
        //     sender_name: 'Kaka Momo',
        //     comment_id: '1700822450210360_1700822663543672',
        //     sender_id: 148991282245650,
        //     post_id: '1675019182790687_1700822450210360',
        //     verb: 'add',
        //     parent_id: '1675019182790687_1700822450210360',
        //     created_time: 1489899434,
        //     message: 'oi'
        //   }
        // }]

        // [{ new post
        //   field: 'feed',
        //   value:
        //   {
        //     item: 'post',
        //     sender_name: 'Kaka Momo',
        //     sender_id: 148991282245650,
        //     post_id: '1675019182790687_1700822450210360',
        //     verb: 'add',
        //     created_time: 1489899368,
        //     is_hidden: false,
        //     message: 'oi'
        //   }
        // }]

        var pageID = value.post_id.split('_')[0];
        var objectID = _ObjectID(value);
        var messageText = value.message || "undefined";

        handleFeedFlow(messageText, pageID, function (err, result) {
            if (err) { return console.log(err); }
            // respond to webhook events if received message and page token exists in database
            if (result[0].length != 0 && result[1].length != 0) {
                var feed = result[0][0].facebook.feed;
                var token = result[1].facebook.page[0].pagetoken;

                if (feed.send) {
                    // processing output from database and formatting it into FB comment reply format
                    var options = new fbCommentReplyTemplate
                        .prepareCommentReply(feed)
                        .compose();
                    options.access_token = token;
                    // sending a comment reply using Graph API
                    fbRequest.replyComment(options, objectID);
                }

                if (feed.replyMSG) {
                    // processing output from database and formatting it into FB comment reply format
                    var options = new fbCommentReplyTemplate
                        .prepareMessageReply(feed)
                        .compose();
                    options.access_token = token;

                    // sending a messenger reply using Graph API
                    fbRequest.replyMessage(options, objectID);
                }

            }
            else { return console.error("Message %s is not in database", messageText); }

        });
    },

    receivedMessaging: function (value) {
        // [{ new comment
        //   field: 'feed',
        //   value:
        //   {
        //     item: 'comment',
        //     sender_name: 'Kaka Momo',
        //     comment_id: '1700822450210360_1700822663543672',
        //     sender_id: 148991282245650,
        //     post_id: '1675019182790687_1700822450210360',
        //     verb: 'add',
        //     parent_id: '1675019182790687_1700822450210360',
        //     created_time: 1489899434,
        //     message: 'oi'
        //   }
        // }]

        // [{ new post
        //   field: 'feed',
        //   value:
        //   {
        //     item: 'post',
        //     sender_name: 'Kaka Momo',
        //     sender_id: 148991282245650,
        //     post_id: '1675019182790687_1700822450210360',
        //     verb: 'add',
        //     created_time: 1489899368,
        //     is_hidden: false,
        //     message: 'oi'
        //   }
        // }]
        console.log(value);
    }
};

function _ObjectID(value) {
    if (value.comment_id) {
        return value.comment_id;
    }
    return value.post_id;
}

function handleFeedFlow(messageText, pageID, callback) {
    return async.parallel([
        findMessageinDB(messageText, pageID),
        getPageToken(pageID)
    ], callback);
}


function findMessageinDB(messageText, pageid) {
    return function (callback) {
        // refer http://stackoverflow.com/questions/25677743/mongodb-embedded-array-elemmatchprojection-error-issue for clarification
        User.aggregate([
            { "$match": { 'facebook.page.id': pageid } },
            { "$unwind": "$facebook.feed" },
            { "$match": { "facebook.feed.received": messageText.toLowerCase() } }, // to make it case insensitive
            { "$project": { "facebook.feed": 1, } }
        ]).exec(callback);
    }
}

function getPageToken(pageid) {
    return function (callback) {
        User
            .findOne({ 'facebook.page.id': pageid })
            .select({ 'facebook.page.$': 1 })
            .lean()
            .exec(callback);
    }
}