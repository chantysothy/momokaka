var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var fbpageSchema = mongoose.Schema({
    name: String,
    id: {type:String, unique:true},
    pagetoken: String,
    _isAppSubscribed: {type:String, default:"Not Connected"}
});

var msgSchema = mongoose.Schema({
    received: String,
    send: String
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
        page: [fbpageSchema],
        message: [msgSchema]
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

module.exports = mongoose.model('User', userSchema);