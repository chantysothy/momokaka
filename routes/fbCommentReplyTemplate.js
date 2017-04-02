module.exports.prepareCommentReply = function (params) {
    // function use to structure reply onto FB feed object
    // FB GraphAPI reference: https://developers.facebook.com/docs/graph-api/reference/v2.8/object/comments/
    var self = this;

    // packing text string into comment reply
    if (params.send) {
        self.message = params.send;
    }

    // packing image into comment reply
    if (params.imageURL) {
        self.attachment_url = params.imageURL;
    }

    self.compose = composeMessage();

    return self;
}

module.exports.prepareMessageReply = function (params) {
    // function use to structure reply onto FB feed object
    // FB GraphAPI reference: https://developers.facebook.com/docs/graph-api/reference/v2.8/object/comments/
    var self = this;

    // packing text string into comment reply
    if (params.replyMSG) {
        self.message = params.replyMSG;
    }

    self.compose = composeMessage();

    return self;
}

function composeMessage() {
    return function () {
        return this;
    }
}

