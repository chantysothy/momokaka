var async = require('async');
var fbRequest = require('./fbRequest')
// load up the user model
var DB = require('../routes/models/user');
var User = DB.User;
var Page = DB.Page;
var Feed = DB.Feed;

module.exports = function (app) {

    // =====================================
    // Connect / Disconnect Page(s)=========
    // =====================================
    app.get('/:userid/getpagelist', function (req, res, next) {
        var user = req.user;
        var userfbid = req.params.userid;

        getUserPage(user, userfbid)
            .then(function (data) {
                return toarrayUserPage(user, data);
            }).then(function (pagedata) {
                return res.send(pagedata);
            }).catch(function (error) {
                console.error(error);
            });
    });


    app.get('/:userid/disconnect/page', function (req, res) {
        var user = req.user;
        user.facebook.pagelist = undefined;
        saveDB(user).then(function () {
            return res.redirect('/' + req.user._id + '/profile');
        });
    });

    // =====================================
    // Managing Page Webhook(s)    =========
    // =====================================

    //  Activate webhook to pages
    app.get('/:pageid/activatewebhook', function (req, res, next) {
        var user = req.user;
        var userToken = req.user.facebook.token;
        var pageid = req.params.pageid;
        // ref : https://developers.facebook.com/docs/messenger-platform/webhook-reference
        // check whether page is already registed in database
        Page.findOne({ 'id': pageid })
            .populate('_owner')
            .lean()
            .exec(function (err, pageDB) {
                if (err) { console.error(err); };
                if (pageDB) {
                    // page already exsted in database under different user
                    // return a message whom does it belongs to
                    return res.status(200).send({ 'error': pageDB.name + ' already registered under ' + pageDB._owner.facebook.name });
                };

                if (!pageDB) {
                    // use page from website, get access token, save the page into DB, make request to install webhook to fb and redirect
                    getPageAccessToken(pageid, userToken)
                        .then(function (body) {
                            return saveNewPage(body, req.user._id);
                        }).then(function (newPage) {
                            return pageWebhook(newPage, 'POST');
                        }).then(function (pagename) {
                            return res.status(200).send({ 'id': pageid, 'name': pagename});
                        }).catch(function (err) {
                            return res.status(200).send({ 'error': err });
                        });

                };
            });

    });


    // Deactivate webhook from page
    app.get('/:userid/deactivatewebhook/:no', function (req, res, next) {
        var user = req.user;
        var page = user.facebook.pagelist[req.params.no];
        // the page is deactivated from app and deleted from database
        Page.findOneAndRemove({ 'id': page.id })
            .lean()
            .exec(function (err, pageDB) {
                pageWebhook(pageDB, 'DELETE')
                    .then(function () {
                        return res.redirect('/' + req.user._id + '/profile');
                    }).catch(function (error) {
                        req.flash('err', error.message);
                        return res.redirect('/' + req.user._id + '/profile');
                    });
            });

        // need to delete all the associated messages as well


    });


    // =====================================
    // Managing Message(s)         =========
    // =====================================

    // Save keywords and respective replies 
    app.post('/:userid/savefeed', function (req, res, next) {
        var user = req.user;
        var userid = req.params.userid;

        var newFeed = new Feed();

        Page.find({ '_owner': userid })
            .lean()
            .exec(function (err, pages) {
                console.log(pages.map(function (a) { return a.id; }).toString());
            });

        Feed.findOne({
            '_owner': userid,
            received: req.body.keyword.toLowerCase()
        })
            .lean()
            .exec(function (err, feed) {
                if (err) { console.log(err); };
                if (feed) {
                    req.flash('err', 'Received comment already exists');
                    return res.redirect('/' + req.user._id + '/profile');
                };

                if (!feed) {
                    newFeed._owner = userid
                    newFeed.received = req.body.keyword.toLowerCase()
                    newFeed.send = req.body.reply
                    newFeed.imageURL = req.body.imageurl
                    newFeed.replyMSG = req.body.replymsg
                    newFeed.save(function (err) {
                        return res.redirect('/' + req.user._id + '/profile');
                    });
                };
            });

    });

    // Delete keywords and respective replies 
    app.get('/:userid/removefeed/:keyword', function (req, res, next) {
        var user = req.user;
        var userid = req.params.userid;
        Feed.findOneAndRemove({
            '_owner': userid,
            received: req.params.keyword.toLowerCase()
        })
            .lean()
            .exec(function (err, feed) {
                if (err) { console.log(err); };
                return res.redirect('/' + req.user._id + '/profile');
            });
    });

}

let getPageAccessToken = function (pageid, userAccessToken) {
    return new Promise(function (resolve, reject) {
        fbRequest.fbGraphAPI(
            { access_token: userAccessToken },
            {
                objectID: pageid,
                edge: '?fields=access_token,name',
                method: 'GET'
            }, function (err, res) {
                var body = res.body;
                if (body.error) { return reject(body.error.message) };
                // return pageaceesstoken and its ID
                return resolve(body);
            });
    });
};

let saveNewPage = function (body, userid) {
    return new Promise(function (resolve, reject) {
        var newPage = Page();
        newPage.name = body.name;
        newPage.id = body.id;
        newPage.pagetoken = body.access_token;
        newPage._owner = userid;
        newPage._isAppSubscribed = true;
        newPage.save(function (err) {
            if (err) { return reject(err) };
            return resolve(newPage);
        });
    });
};

// Graph API request to install app to the respective page
let pageWebhook = function (object, method) {
    return new Promise(function (resolve, reject) {
        fbRequest.fbGraphAPI(
            { access_token: object.pagetoken },
            {
                objectID: object.id,
                edge: '/subscribed_apps',
                method: method
            }, function (error, res, body) {
                if (error || body.error) { return reject(error || body.error); }
                return resolve(object.name);
            });
    });
};

let getUserPage = function (user, userid) {
    return new Promise(function (resolve, reject) {
        fbRequest.fbGraphAPI(
            {
                fields: 'id,name',
                access_token: user.facebook.token
            },
            {
                objectID: 'me',
                edge: '/accounts',
                method: 'GET'
            },
            function (error, response) {
                // catch FB OAuth Error
                if (error) { return reject(error.message) };
                var data = response.body.data;
                return resolve(data);
            }
        );
    });
};

let toarrayUserPage = function (user, data) {
    return new Promise(function (resolve, reject) {
        var pages_string = "";
        pages_string += data.map(function (_data) {
            return "<a href=\x22javascript:activatewebhook(event," + _data.id + ",'" + _data.name + "')\x22>" + _data.name + "</a>";
        });
        return resolve(pages_string);
    });
};

function saveDB(DBobject) {
    return new Promise(function (resolve, reject) {
        DBobject.save(function (err) {
            if (err) { console.log(err); }
        });
        return resolve(null);
    });
}
