var auth = require('../passport/passport'),
    bcrypt = require('bcrypt'),
    User = require('../db/sql').User,
    async = require('async'),
    passport = require('passport');

exports.isAuthenticated = function(req, res, next) {
    if (req.user) return next();
    res.redirect('/login');
};

//local authentication
exports.localCreate = function(req, res) {
    auth.localAuthentication(req, res);
};

// Update user's data
exports.localUpdate = function(req, res) {
    var user = req.user;
    async.waterfall([

        // Initial check to see if username is changed to an already existing user in db, if so throw error
        function validateUsername(callback) {
            User.find({
                where: {
                    username: req.body.username
                }
            })
                .done(function(error, found_user) {
                    if (user && found_user && found_user.id != user.id) {
                        return res.json({
                            error: {
                                username: 'Username is already being used'
                            }
                        });
                    }
                    callback(null);
                });
        },

        // Further validations for updating can be put here, otherwise update user
        function updateUser(callback) {
            if (user) {
                user.updateAttributes({
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    username: req.body.username,
                    email_address: req.body.email_address,
                    gender: req.body.gender,
                    location: req.body.location,
                    picture: req.body.picture
                })
                    .success(function() {
                        return res.json({
                            redirect: '/user/update'
                        });
                    })
                    .failure(function(error) {
                        return res.json({
                            error: error
                        });
                    })
            }
        }
    ]);
};

// Update local user's password
exports.localPasswordUpdate = function(req, res) {
    var user = req.user;
    if (user) {
        async.waterfall([
            // Validate that user has entered current password correctly and that new passwords match
            function validatePassword(callback) {
                if (req.body.new_password === req.body.confirm_password) {
                    bcrypt.compare(req.body.old_password, req.user.password, function(err, password_match) {
                        password_match,
                        callback(null, password_match);
                    });
                } else {
                    return res.json({
                        error: {
                            new_password: 'Passwords do not match'
                        }
                    });
                }
            },

            // If user entered valid current password and valid new password hash new password to store in db
            function hashPassword(password_match, callback) {
                if (req.body.new_password.length == 0) {
                    return res.json({
                        error: {
                            new_password: 'Invalid new password'
                        }
                    });

                } else if (password_match) {
                    auth.hashPassword(req.body.new_password, callback);

                } else {
                    return res.json({
                        error: {
                            old_password: 'Incorrect password'
                        }
                    });
                }
            },

            // Update user with new hashed password
            function updatePassword(hashed_password, callback) {
                user.updateAttributes({
                    password: hashed_password
                })
                    .success(function() {
                        res.json({
                            redirect: '/user/update'
                        })
                    })
                    .failure(function(error) {
                        return res.json({
                            error: error
                        });
                    });
            }
        ]);

    }
};

// Delete current user - might need to put further security checks to prevent
// unnecessary deletion
exports.localDelete = function(req, res) {
    var user = req.user;
    if (user) {
        user.destroy()
            .success(function() {
                req.logout();
                res.redirect('/');
            })
    }
};

// Local authentication redirects
exports.localAuthentication = passport.authenticate('local', {
    failureRedirect: '/login',
    successRedirect: '/home',
    failureFlash: true
});