var passport = require('passport'),
    bcrypt = require('bcrypt'),
    async = require('async'),
    LocalStrategy = require('passport-local').Strategy,
    Sequelize = require('sequelize'),
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
        function validateUsername(nextStep) {
            User.find({
                where: {
                    username: req.body.username
                }
            })
                .done(function(error, user) {
                    if (user) {
                        nextStep({
                            message: 'Username is already being used'
                        });
                    }
                    nextStep(null);
                });
        },
        // encrypt password and pass it to create user
        function encryptPassword(nextStep) {
            if (req.body.password === req.body.confirm_password) {
                exports.hashPassword(req.body.password, nextStep)
            } else {
                nextStep({
                    message: 'Passwords do not match'
                });
            }
        },
        // create user with hashed password
        function createUser(hashedPassword, complete) {
            User.create({
                username: req.body.username,
                first_name: req.body.first_name,
                email_address: req.body.email_address,
                last_name: req.body.last_name,
                password: hashedPassword
            })
                .success(function(user) {
                    req.user = req.session.user = user;
                    complete(null, {
                        message: 'User successfully created, you can now login'
                    });
                })
                .error(function(err) {
                    complete({
                        message: err
                    });
                });
            complete(null, 'done');
        }
    ], function finalize(error, result) {
        if (error) {
            req.flash('error', error.message);
            res.redirect('/create');
        } else {
            req.flash('success', result.message);
            res.redirect('/login');
        }
    });
};

//Sign in using username or email and password.
passport.use(new LocalStrategy(function(usernameOrEmail, password, done) {
    async.waterfall([
        // look for user with given username or email
        function findUser(callback) {

            function error() {
                return done(null, false, {
                    message: 'User not found.'
                });
            }

            User.find({
                where: Sequelize.or({
                    username: usernameOrEmail
                }, {
                    email_address: usernameOrEmail
                })
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