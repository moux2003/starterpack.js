var passport = require('passport'),
    bcrypt = require('bcrypt'),
    async = require('async'),
    LocalStrategy = require('passport-local').Strategy,
    User = require('../db/sql').User;

//Passport required serialization
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

// passport required deserialize find user given id from serialize
passport.deserializeUser(function(id, done) {
    User.find(id)
        .success(function(user) {
            done(null, user);
        })
        .failure(function(error) {
            done(error, null);
        })
});

// Use bcrypt to hash users plaintext password - plaintext is bad - hashed is good - bcrypt is great
exports.hashPassword = function(plaintext_password, callback) {
    bcrypt.genSalt(10, function(err, salt) {
        if (err) {
            return new Error('app/passport/passport.js: bcrypt salting error');
        }
        bcrypt.hash(plaintext_password, salt, function(error, password) {
            if (error) {
                return new Error('app/passport/passport.js: bcrypt hashing error');
            }
            callback(null, password);
        });
    });
}

// Helper function to test for valid value
function isEmptyOrNull(value) {
    return (value === null || value == '' || value == undefined);
};

// Create a local user
exports.localAuthentication = function(req, res) {
    var password = null;
    async.waterfall([
        // make sure username has not already been taken
        function validateUsername(callback) {
            User.find({
                where: {
                    username: req.body.username
                }
            })
                .done(function(error, user) {
                    if (user) {
                        return res.json({
                            error: {
                                username: 'Username is already being used'
                            }
                        });
                    }
                    callback(null);
                });
        },

        // encrypt password and pass it to create user
        function encryptPassword(callback) {
            if (req.body.password === req.body.confirm_password) {
                exports.hashPassword(req.body.password, callback)
            } else {
                return res.json({
                    error: {
                        confirm_password: 'Passwords do not match'
                    }
                });
            }
        },

        // create user with hashed password
        function createUser(hashed_password, callback) {
            User.create({
                username: req.body.username,
                first_name: req.body.first_name,
                email_address: req.body.email_address,
                last_name: req.body.last_name,
                password: hashed_password
            })
                .success(function(user) {
                    req.user = req.session.user = user;
                    res.json({
                        redirect: '/login'
                    });
                })
                .error(function(err) {
                    return res.json({
                        error: err
                    });
                })
        }
    ]);
};

//Sign in using username and password.
passport.use(new LocalStrategy(function(username, password, done) {
    async.waterfall([
        // look for user with given username
        function findUser(callback) {

            function error() {
                return done(null, false, {
                    message: 'User not found.'
                });
            }

            User.find({
                where: {
                    username: username
                }
            }).then(function(user) {
                if (user !== null) {
                    callback(null, user);
                } else {
                    return error();
                }
            }, function(error) {
                return error();
            })
        },

        // make sure password is valid
        function comparePassword(user, callback) {

            function error() {
                return done(null, false, {
                    message: 'Invalid email or password.'
                });
            }

            if (!user) {
                return error();
            }

            bcrypt.compare(password, user.password, function(err, match) {
                if (match) {
                    return done(null, user);
                } else {
                    return error();
                }
            });
        }
    ]);
}));