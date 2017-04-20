var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird'); //ADD THIS LINE
Promise.promisifyAll(mongoose); //AND THIS LINE

var fbpageSchema = mongoose.Schema({
    _owner: { type: mongoose.Schema.ObjectId, ref: 'User' },
    name: String,
    id: String,
    pagetoken: String
});

var feedSchema = mongoose.Schema({
    _page: [{ type: mongoose.Schema.ObjectId, ref: 'Pages' }],
    received: String,
    send: String,
    imageURL: String,
    replyMSG: String
});

var messengerSchema = mongoose.Schema({
    _isConnected: { type: Boolean, default: false },
    send: String
});

var pagelistSchema = mongoose.Schema({
    name: String,
    id: String,
});

var userSchema = mongoose.Schema({
    local: {
        username: String,
        password: String
    },
    facebook: {
        id: String,
        token: String,
        email: String,
        name: String,
        pagelist: [pagelistSchema]
    }
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.local.password);
};

module.exports = {
    User: mongoose.model('User', userSchema),
    Page: mongoose.model('Page', fbpageSchema),
    Feed: mongoose.model('Feed', feedSchema),
}; 