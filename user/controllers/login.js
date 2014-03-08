var async = require('async'),
mongoose = require('mongoose'),
User = mongoose.model("User"),
userController = require('./user.js');
    // google = require('./../../../common/social/google.js'),
    // twitter = require('./../../../common/social/twitter.js');


    module.exports.setup = function(app) {
        var $this = this;
    //TODOSONGPEEK : check activated
    app.io.route('user:login', function(req) {
        console.log('user login event, data: %j', req.data);
        mongoose.model('User').getAuthenticated(req.data.email, req.data.password, function(err, user, errLogin){

            if(err){
                console.log('err');
                return req.io.respond({success:false, error:err});
            } 
            if(errLogin){
                console.log('errLogin');
                return req.io.respond({success: false, error: errLogin});
            } 

            mongoose.model('User').setStatusFromEmail(req.data.email, "online", function(err, res){

                if(err) return console.log(err);                
            });
            userController.setSessionAndSetSocketId(req.session, req.socket.id, user);
            console.log(req.session);
            req.io.respond({success: true, user: user.toFrontend});

        });
    });


    //TODOSONGPEEK : check activated
    // app.io.route('user:social:login', function(req) {
    //     var type = req.data.type;
    //     if(type=='facebook') {
    //         req.facebook.api('/me', {
    //             access_token: req.data.accessToken
    //         }, function(err, userFacebook) {
    //             if(err) {
    //                 req.io.respond(err);
    //             } else {
    //                 $this.loginSocial('facebook', userFacebook, req.session, function(err, user, userSocial) {
    //                     if(err) return req.io.respond(err);
    //                     if(user) {
    //                         req.io.respond(null, user);

    //                     } else if (userSocial) {
    //                         console.log('go register');
    //                         req.io.respond(null, null, {
    //                             firstName: userSocial.first_name,
    //                             lastName: userSocial.last_name,
    //                             email: userSocial.email
    //                         });
    //                     }
    //                 });

    //             }
    //         });

    //     } else if(type=='google') {
    //         google.getUser(req.data.accessToken, function(err, userGoogle) {
    //             if (err) return console.error(err);
    //             $this.loginSocial('google', userGoogle, req.session, function(err, user, userSocial) {
    //                 if(err) return req.io.respond(err);
    //                 if(user) {
    //                     req.io.respond(null, user);

    //                 } else if (userSocial) {
    //                     req.io.respond(null, null, {
    //                         firstName: userSocial.given_name,
    //                         lastName: userSocial.family_name,
    //                         email: userSocial.email
    //                     });
    //                 }
    //             })
    //         });
    //     } else if(type=='twitter') {
    //         twitter.getUser(req, function(err, userTwitter) {
    //             if (err) return console.error(err);
    //             $this.loginSocial('twitter', userTwitter, req.session, function(err, user, userSocial) {
    //                 if(err) return req.io.respond(err);
    //                 if(user) {
    //                     req.io.respond(null, user);

    //                 } else if (userSocial) {
    //                     req.io.respond(null, null, {
    //                         firstName: userSocial.screen_name,
    //                         lastName: "",
    //                         email: ""
    //                     });
    //                 }
    //             })
    //         });


    //     }
    // });
};

// module.exports.loginSocial = function(type, userSocial, session, callback) {
//     var req = null;
//     if(type=='facebook') {
//         req = {'facebook.id': userSocial.id};

//     } else if(type=='google') {
//         req = {'google.id': userSocial.sub};

//     } else if(type=='twitter') {
//         res = {'twitter.id': userSocial.id};
//     }
//     User.findOne(req, function(err, user) {
//         if(err) return callback(err);

//         if(user) {//connect him
//             userController.setSession(session, user);
//             callback(null, user.toFrontend);

//         } else {
//             callback(null, null, userSocial);
//         }
//     });
// };