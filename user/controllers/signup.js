var async = require('async');
var validator = require('validator');
var mongoose = require('mongoose');
var User = mongoose.model("User");
var userController = require('./user.js');
var database = require('./../../database.js');






module.exports.setup = function(app) {


    app.io.route('user:signup', function(req) {
        console.log('signup event');
        var result = null;

        /**
         * Checks if email is an email and if password length is >= 4
         */
        if(!validator.isEmail(req.data.email) || !validator.isLength(req.data.password, 4)) {
            req.io.respond({success: false});
            return;
        }
        /**
         * Initialize the user
         */
         var user = new User(req.data);
         async.series([
            /**
             * Check if email exists
             */
             function(callback) {
                user.isEmailUnique(function(res) {
                    if(res) {
                        callback();
                    } else {
                        req.io.respond({success:false});
                    }
                });
            },
            /**
             * Save the user into db
             */
            function(callback) {
                console.log('user saved');

                // Once the user is saved, we create 4 chat rooms and we add the roomList to the user

                user.save(function(err, savedUser){
                    if(err) {           
                        result = {success:false};
                    } else {
                        console.log(savedUser.id);
                        console.log("createRooms");
                        database.room.createRoomsForOperator(savedUser.id, function(success){
                            if(success){
                                database.room.getRoomsIdOfOperator(savedUser.id, function(err, result){
                                    if(err) return console.log("erreur getRoomsIdOfOperator" + err);

                                    console.log("eeeeeeeeee" + result[0]);
                                    User.findByIdAndUpdate(savedUser._id, {roomList : {room1: result[0]._id, room2: result[1]._id, room3: result[2]._id, room4: result[3]._id}}, function(err){
                                        if(err) return console.log('erreur ajout roomList au user' + err);
                                        callback();
                                    });
                                    
                                });
                            }
                        });
                    }
                });
            }
        ], function() {
            if(user.activated) {
                result.activated = true;
                result.user = user.toFrontend;
                userController.setSession(req.session, user);
                //TODOSONGPEEK SEND WELCOME EMAIL
            } else {
                //TODOSONGPEEK SEND CONFIRM EMAIL
            }
            console.log('res: %j', result);
            req.io.respond(result);
        });
    });






    app.io.route('user:ensure-unique-email', function(req){

        var user = new User({
            email: req.data.email
        });
        user.isEmailUnique(function(res) {
            if(res) {
                req.io.respond({success:true});
            } else {
                req.io.respond({success:false});
            }
        });
    });
};