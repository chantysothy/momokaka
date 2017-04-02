var request = require('request');
var async = require('async');
var fbRequest = require('./fbRequest')
// load up the user model
var User = require('../routes/models/user');

module.exports = function (app) {

    // =====================================
    // Managing Page Webhook(s)    =========
    // =====================================

    //  Activate webhook to pages
    app.get('/:userid/activatewebhook/:no', function (req, res, next) {
        var self = this;
        var user = req.user;
        var page = user.facebook.page[req.params.no];
        // ref : https://developers.facebook.com/docs/messenger-platform/webhook-reference
        pageWebhook(page, 'POST',
            function (error, response, body) {
                if (error || body.error) { return console.error(error || body.error); }
                if (!error && body.success == true) {
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

        pageWebhook(page, 'DELETE',
            function (error, response, body) {
                if (error || body.error) { return console.error(error || body.error); }
                if (!error && body.success == true) {
                    page._isAppSubscribed = 'Not Connected';
                    user.save(function (err) {
                        if (err) { console.log(err); }
                    });
                    return res.redirect('/' + req.user._id + '/profile');
                }
            });
    });

    function pageWebhook(page, method, callback) {
        return fbRequest.fbGraphAPI(
            { access_token: page.pagetoken },
            {
                objectID: page.id,
                edge: '/subscribed_apps',
                method: method
            }, callback
        );
    }
    // =====================================
    // Managing Message(s)         =========
    // =====================================

    // Save keywords and respective replies 
    app.post('/:userid/savefeed', function (req, res, next) {
        var user = req.user;
        // ref http://stackoverflow.com/questions/13460765/findone-subdocument-in-mongoose
        User.findOne({
            'facebook.feed.received': req.body.keyword.toLowerCase(),
            '_id': req.params.userid
        })
            .select({ 'facebook.feed.$': 1 })
            .lean()
            .exec(function (err, feed) {
                if (err) { console.log(err); }
                // if keyword still not exist
                if (!feed) {
                    var feedData = {
                        received: req.body.keyword.toLowerCase(),
                        send: req.body.reply,
                        imageURL: req.body.imageurl,
                        replyMSG: req.body.replymsg
                    }
                    // save the message as last element in the message database array
                    user.facebook.feed[user.facebook.feed.length] = feedData;
                    user.save(function (err) {
                        return res.redirect('/' + req.user._id + '/profile');
                    });
                }
                // if keyword already exist
                if (feed) {
                    req.flash('err', 'Received comment already exists');
                    return res.redirect('/' + req.user._id + '/profile');
                }
            });
    });

    // Delete keywords and respective replies 
    app.get('/:userid/removefeed/:no', function (req, res, next) {
        var user = req.user;
        user.facebook.feed[req.params.no].remove();
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
        fbRequest.fbGraphAPI(
            { access_token: user.facebook.token },
            {
                objectID: 'me',
                edge: '/accounts',
                method: 'GET'
            },
            function (error, response, body) {
                // catch FB OAuth Error
                if (body.error) { return callback(body.error.message) };
                var data = body.data;
                // Pass callback to asyc for updateUserPage function
                return callback(error, user, userid, data);
            }
        );
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