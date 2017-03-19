var User = require('./models/user.js');

module.exports = function (app, passport) {
    app.get('/', function (req, res) {
        res.render('index');
    });

    // =====================================
    // PROFILE =============================
    // =====================================

    app.get('/profile', isLoggedIn, function (req, res) {
        res.redirect('/'+ req.user._id + '/profile')
    });

    app.get('/:userid/profile', isLoggedIn, function (req, res) {
        res.render('profile.ejs', {
            user: req.user, // get the user out of session and pass to template
            msgerr: req.flash('err')
        });
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/:userid/logout', function (req, res) {
        req.logout(); // passport function
        res.redirect('/');
    });

    // =============================================================================
    // AUTHENTICATE (FIRST LOGIN) ==================================================
    // =============================================================================

    // =====================================
    // SIGN UP =============================
    // =====================================

    app.get('/signup', function (req, res) {
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/',
        failureRedirect: '/signup',
        failureFlash: true
    }));
    
    // =====================================
    // LOCAL LOGIN =========================
    // =====================================

    app.get('/login', function (req, res) {
        res.render('login.ejs', { message: req.flash('loginMessage') });
    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }));

    // =====================================
    // FACEBOOK ROUTES =====================
    // =====================================
    // route for facebook authentication and login
    app.get('/auth/facebook', passport.authenticate('facebook', {
        scope: ['email', 'manage_pages', 'publish_pages', 'pages_messaging']
    }));

    // handle the callback after facebook has authenticated the user
    // app.get('/auth/facebook/callback',
    //     passport.authenticate('facebook', {
    //         successRedirect : '/profile',
    //         failureRedirect : '/'
    // }));

    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', { failureRedirect: '/' }),
        function (req, res) {
            // Successful authentication, redirect home.
            res.redirect('/'+ req.user._id + '/profile');//, req.user.facebook.id);
        }
    );

    // =====================================
    // app.get('/auth/fb/:username/:password', function(req,res){
    //     var newUser = new User();
    //     newUser.local.username = req.params.username;
    //     newUser.local.password = req.params.password;
    //     console.log(newUser.local.username + ' ' + newUser.local.password);

    //     // saving to DB
    //     newUser.save(function(err){
    //         if(err)
    //             throw err;
    //     });
    //     res.send('Success')
    // });

    // =============================================================================
    // AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
    // =============================================================================

    // locally --------------------------------
    app.get('/connect/local', function (req, res) {
        res.render('connect-local.ejs', { message: req.flash('loginMessage') });
    });
    app.post('/connect/local', passport.authenticate('local-login', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/connect/local', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // facebook -------------------------------

    // send to facebook to do the authentication
    app.get('/:userid/connect/facebook', passport.authenticate('facebook', 
    { scope: ['email', 'manage_pages', 'publish_pages'] }));

    // handle the callback after facebook has authorized the user
    app.get('/:userid/connect/facebook/callback',
        passport.authorize('facebook', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));


    // ==============================================================
    // UNLINK ACCOUNTS ==============================================
    // ==============================================================
    // used to unlink accounts. for social accounts, just remove the token
    // for local account, remove email and password
    // user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/:userid/unlink/local', function (req, res) {
        var user = req.user;
        user.local.username = undefined;
        user.local.password = undefined;
        user.save(function (err) {
            res.redirect('/'+ req.user._id + '/profile');
        });
    });

    // facebook -------------------------------
    app.get('/:userid/unlink/facebook', function (req, res) {
        var user = req.user;
        user.facebook = undefined;
        user.save(function (err) {
            res.redirect('/'+ req.user._id + '/profile');
        });
    });
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login')
}
