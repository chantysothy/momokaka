var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
    message:{
        received : String,
        send     : String
    },
});

module.exports = mongoose.model('Message', messageSchema);