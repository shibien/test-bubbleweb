var async = require('async'),
    mongoose = require('mongoose'),
    User = mongoose.model("User"),
    passport = require('passport');

var exports = module.exports;
exports.setup = function(app) {

    app.io.route('user:get', function(req) {
        if(req.session.user_email) {
            req.io.respond(exports.getSession(req.session, true));
        } else {
            req.io.respond(null);
        }
    });
};

exports.getSession = function(session, toFront) {
    var res = {};
    if(toFront === undefined) {
        res._id = session.user_id;
    }
    res.firstName = session.user_firstName;
    res.lastName = session.user_lastName;
    res.email = session.user_email;
    // res.facebook = {
    //     id: session.user_facebook_id
    // };
    // res.google = {
    //     id: session.user_google_id
    // };
    // res.twitter = {
    //     id: session.user_twitter_id
    // };

    return res;

};

exports.setSessionAndSetSocketId = function(session, socket_id, user) {


    User.findByIdAndUpdate(user._id, {socketId: socket_id}, {upsert: true}, function(err, res){
            if(err) return console.log(err);
        });
    session.user_id = user._id;
    session.user_firstName = user.firstName;
    session.user_lastName = user.lastName;
    session.user_email = user.email;
    // session.user_facebook_id = user.facebook.id;
    // session.user_google_id = user.google.id;
    // session.user_twitter_id = user.twitter.id;
    session.socketId = socket_id;
    session.save();
};