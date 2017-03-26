var request = require('request');
var async = require('async');

// load up the user model
var User = require('../routes/models/user');

module.exports = function (app) {

    // =====================================
    // Managing Page Webhook(s)    =========
    // =====================================

    //  Activate webhook to pages
    app.get('/:userid/activatewebhook/:no', function (req, res, next) {
        var user = req.user;
        var page = user.facebook.page[req.params.no];
        // ref : https://developers.facebook.com/docs/messenger-platform/webhook-reference
        request({
            uri: 'https://graph.facebook.com/v2.8/' + page.id + '/subscribed_apps',
            method: 'POST',
            qs: { access_token: page.pagetoken }
        },
            function (error, response, body) {
                if (error) { console.log(err) }
                if (!error && JSON.parse(body).success == true) {
                    page._isAppSubscribed = 'Connected'
                    user.save(function (err) {
                        if (err) { console.log(err); }
                    });
                    return res.redirect('/' + req.user._id + '/profile');
                }
            });
    });

    // Deactivate webhook from page
    app.get('/:userid/deactivatewebhook/:no', function (req, res, next) {
        var user = req.user;
        var page = user.facebook.page[req.params.no];
        // ref : https://developers.facebook.com/docs/messenger-platform/webhook-reference
        request({
            uri: 'https://graph.facebook.com/v2.8/' + page.id + '/subscribed_apps',
            method: 'DELETE',
            qs: { access_token: page.pagetoken }
        },
            function (error, response, body) {
                if (error) { console.log(err); }
                if (!error && JSON.parse(body).success == true) {
                    page._isAppSubscribed = 'Not Connected';
                    user.save(function (err) {
                        if (err) { console.log(err); }
                    });
                    return res.redirect('/' + req.user._id + '/profile');
                }
            });
    });

    // =====================================
    // Managing Message(s)         =========
    // =====================================

    // Save keywords and respective replies 
    app.post('/:userid/savemessage', function (req, res, next) {
        var user = req.user;
        // ref http://stackoverflow.com/questions/13460765/findone-subdocument-in-mongoose
        User.findOne({
            'facebook.message.received': req.body.keyword.toLowerCase(),
            '_id': req.params.userid
        })
            .select({ 'facebook.message.$': 1 })
            .lean()
            .exec(function (err, message) {
                if (err) { console.log(err); }
                // if keyword still not exist
                if (!message) {
                    var messageData = {
                        received: req.body.keyword.toLowerCase(),
                        send: req.body.reply
                    }
                    // save the message as last element in the message database array
                    user.facebook.message[user.facebook.message.length] = messageData;
                    user.save(function (err) {
                        return res.redirect('/' + req.user._id + '/profile');
                    });
                }
                // if keyword already exist
                if (message) {
                    req.flash('err', 'Received message already exists');
                    return res.redirect('/' + req.user._id + '/profile');
                }
            });
    });

    // Delete keywords and respective replies 
    app.get('/:userid/removemessage/:no', function (req, res, next) {
        var user = req.user;
        user.facebook.message[req.params.no].remove();
        user.save(function (err) {
            return res.redirect('/' + req.user._id + '/profile');
        });
    });

    // =====================================
    // Connect / Disconnect Page(s)=========
    // =====================================

    app.get('/:userid/connect/page', function (req, res, next) {
        var user = req.user;
        var userid = req.params.userid;

        // using async waterfall
        async.waterfall([
            getUserPage(user, userid),
            updateUserPage,
            saveUser],
            function (err) {
                if (err) {
                    // user has manually removed the app from page messaging setting
                    // a new token is required to re-attach the app
                    user.facebook.token = undefined;
                    user.save();
                    // ideally to give a pop-up message to note the user about this error
                    return res.redirect('/');
                };
                // finalising connect page method
                return res.redirect('/' + req.user._id + '/profile');
            });

    });


    app.get('/:userid/disconnect/page', function (req, res) {
        var user = req.user;
        user.facebook.page = undefined;
        user.save(function (err) {
            if (err) { console.log(err) }
            res.redirect('/' + req.user._id + '/profile');
        });
    });
}


function getUserPage(user, userid) {
    return function (callback) {
        request.get({
            url: 'https://graph.facebook.com/me/accounts',
            qs: { access_token: user.facebook.token },
            json: true // Automatically parses the JSON string in the response
        }, function (error, response, body) {
            // catch FB OAuth Error
            if (body.error) { return callback(body.error.message) };
            var data = body.data;
            // Pass callback to asyc for updateUserPage function
            return callback(error, user, userid, data);
        });
    }
}

function updateUserPage(user, userid, data, callback) {
    var len = data.length;
    // ref http://stackoverflow.com/questions/21829789/node-mongoose-find-query-in-loop-not-working
    data.forEach(function (_data, index) {
        User.findOne({
            'user._id': { $ne: userid },
            'facebook.page.id': _data.id
        })
            .lean()
            .exec(function (err, _page) {
                if (err) { console.log(err) }
                if (!_page) {// if page is non existing
                    var pagedata = {
                        name: data[index].name,
                        id: data[index].id,
                        pagetoken: data[index].access_token,
                        _isAppSubscribed: 'Not Connected'
                    }
                    // Push pagedata to database
                    user.facebook.page[index] = pagedata;
                }
                
                if (_page) { // if page already exist
                    var pagedata = {
                        name: data[index].name,
                        id: 'None',
                        pagetoken: 'None',
                        _isAppSubscribed: 'Registered under ' + _page.facebook.name
                    }
                    // Push pagedata to database
                    user.facebook.page[index] = pagedata;
                }

                if (index == len - 1) {
                    // return callback to async to wrapup
                    return callback(null, user);
                }
            });
    });
}

function saveUser(user, callback) {
    user.save(function (err) {
        if (err) { console.log(err); }
    });
    return callback(null);
}