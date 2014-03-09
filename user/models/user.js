var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async'),
    // bcrypt = require('bcrypt'),
    bcrypt = require('./../../bcrypt/bCrypt'),
    room = require('./../../Database/Room');
    //generateId = require('../../../common/generate-id.js');

var SALT_WORK_FACTOR = 10,
    MAX_LOGIN_ATTEMPTS = 8,
    LOCK_TIME = 2 * 60 * 60 * 1000;//2 hours

var reasons = {
    NOT_FOUND: "Adresse email inconnue",
    PASSWORD_INCORRECT: "Mot de passe incorrect",
    MAX_ATTEMPTS: "Votre compte est bloqué pour une durée de 2 heures suite à un nombre trop important de tentatives de connection"
};
//TODOSONGPEEK set in nconf

module.exports = function() {
    var UserSchema = new Schema({
        // username      : { type: String, required: true, index: {unique: true}},//auto
        email         : { type: String, required: true },
        password      : { type: String, required: true },
        firstName     : { type: String, required: true },
        lastName      : { type: String, required: true },
        createdOn     : { type: Date, required: true, default: Date.now },
        lastOnline    : { type: Date },
        status        : { type: String }, //online, offline or away 
        activated     : { type: Boolean, required: true, default: false },
        //prevent bruteForce
        loginAttempts: { type: Number, required: true, default: 0 },
        lockUntil: { type: Number },
        socketId: { type: String, required: false },
        website: {type: String},
        facebook: {
            id: { type: String}
        },
        google: {
            id: { type: String}
        },
        twitter: {
            id: { type: String}
        },
        currentNumberOfConversations: {type: Number, default: 0},
        reconnected : { type: Boolean, default: true}
        //TODO: ajouter le lien vers la photo ou alors la récupérer depuis l'autre db

    }, {strict : false});


    UserSchema.statics.failedLogin = reasons;

    UserSchema.virtual('isLocked').get(function() {
        // check for a future lockUntil timestamp
        return !!(this.lockUntil && this.lockUntil > Date.now());
    });

    UserSchema.virtual('toFrontend').get(function() {
        var res = {};
        res.firstName = this.firstName;
        res.lastName = this.lastName;
        res.email = this.email;
        res.facebook = {
            id: this.facebook.id
        };
        res.google = {
            id: this.google.id
        };
        res.twitter = {
            id: this.twitter.id
        }
        return res;
    });

    UserSchema.methods.isEmailUnique =  function(callback) {
        mongoose.model("User").count({email: this.email}, function(err, count) {
            if(err || count == 1) return callback(false);
            return callback(true);

        });
    };

    UserSchema.methods.comparePassword = function(candidatePassword, callback) {
        bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
            if (err) return callback(err);
            callback(null, isMatch);
        });
    };

    UserSchema.methods.incLoginAttempts = function(callback) {
        // if we have a previous lock that has expired, restart at 1
        if (this.lockUntil && this.lockUntil < Date.now()) {
            return this.update({
                $set: { loginAttempts: 1 },
                $unset: { lockUntil: 1 }
            }, callback);
        }
        // otherwise we're incrementing
        var updates = { $inc: { loginAttempts: 1 } };
        // lock the account if we've reached max attempts and it's not locked already
        if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
            //TODOSONGPEEK: sends a email
            //TODOSONGPEEK: Add ip to database
            updates.$set = { lockUntil: Date.now() + LOCK_TIME };
        }
        return this.update(updates, callback);
    };

    UserSchema.statics.getAuthenticated = function(email, password, callback) {
        this.findOne({ email: email }, function(err, user) {
            if (err)  {
                return callback(err);
            } 

            // make sure the user exists
            if (!user) {
                return callback(null, null, reasons.NOT_FOUND);
            }

            // check if the account is currently locked
            if (user.isLocked) {
                return callback(null, null, reasons.MAX_ATTEMPTS);
            }

            // test for a matching password
            user.comparePassword(password, function(err, isMatch) {
                if (err) return callback(err);

                // check if the password was a match
                if (isMatch) {
                    // if there's no lock or failed attempts, just return the user
                    if (!user.loginAttempts && !user.lockUntil) return callback(null, user);
                    // reset attempts and lock info
                    var updates = {
                        $set: { loginAttempts: 0 },
                        $unset: { lockUntil: 1 }
                    };
                    return user.update(updates, function(err) {
                        if (err) return callback(err);
                        return callback(null, user);
                    })
                }

                // password is incorrect, so increment login attempts before responding
                user.incLoginAttempts(function(err) {
                    if (err){
                        return callback(err);
                    } 
                    return callback(null, null, reasons.PASSWORD_INCORRECT);
                });
            });
        });
    };

    //Get the ids of the operator of a specific website 
    UserSchema.statics.getIdFromWebsite = function(websiteName, callback){
        mongoose.model("User").find({website: websiteName}).select('_id').exec(function(err, res){

            callback(err, res);

        })

    };

    UserSchema.statics.getOperatorsFromWebsite = function(websiteName, callback){
        mongoose.model("User").find({website: websiteName}).exec(function(err, res){

            callback(err, res);

        })

    };


    //Update the current number of conversations by checking the state of the rooms, then throw a callback with true or false if the number of conversations changed, and if true with the new number.
    UserSchema.statics.updateCurrentNumberOfConversations = function(id, callback){
        var newNumberOfConversations = 0;
        var oldNumberOfConversations;
        mongoose.model("User").findById(id, function(err, user){
            if(err) return console.log(err);
            if(!user){
                console.log("ERROR in user.updateCurrentNumberOfConversations: cannot find a user with id " + id);
            }
            else{
                oldNumberOfConversations = user.currentNumberOfConversations;

                //we check all the rooms of the user and update newNumberOfConversations if there is a conversation currently in the room
                room.getRoomsWithOperator(id, function(err, rooms){
                    if(err) return console.log(err);
                    if(rooms.length != 4){
                        console.log("ERROR in user.updateCurrentNumberOfConversations: cannot find 4 rooms for the user with id " + id);
                    }
                    else{
                        for(i = 0; i<rooms.length; i++){
                            if(rooms[i].is_displayed){
                                newNumberOfConversations++;
                            }
                        }
                        //If there is a difference, we update the currentNumberOfConversations
                        if(oldNumberOfConversations != newNumberOfConversations){
                            mongoose.model("User").update({_id: id}, {$set: {currentNumberOfConversations: newNumberOfConversations}}, function(err, nbAffected){
                                if(err) return console.log(err);
                                callback(true, newNumberOfConversations);

                            })
                        }
                        else{
                            callback(false, null);
                        }

                    }
                })
            }
        })        

    } 

    UserSchema.statics.getNumberOfOnlineOperatorsForAWebsite = function(website, callback){
        mongoose.model("User").count({website: website, status: "online"}, function(err, count) {
            
            callback(err, count);

        });

    };


    UserSchema.statics.getStatusFromEmail = function(email, callback){
        mongoose.model("User").find({email: email}).select('status').exec(function(err, res){

            callback(err, res);

        })

    };

    UserSchema.statics.getOperatorFromEmail = function(email, callback){
        mongoose.model("User").find({email: email}).exec(function(err, res){

            callback(err, res);

        })

    };

    UserSchema.statics.getUserFromId = function(id, callback){
        mongoose.model("User").findById(id, function(err, user){
            callback(err, user);
        })

    };

    UserSchema.statics.getStatusFromId = function(id, callback){
        mongoose.model("User").find({_id: id}).select('status').exec(function(err, res){

            callback(err, res);

        })

    };

    UserSchema.statics.setStatusFromEmail = function(email, status, callback){
        mongoose.model("User").update({email: email}, {status: status}, function(err, res){
            callback(err, res);
        });

    };

    UserSchema.statics.setStatusFromId = function(id, status, callback){
        mongoose.model("User").update({_id: id}, {status: status}, function(err, res){
            callback(err, res);
        });

    };

    UserSchema.statics.setReconnected = function(idOperator, reconnected, callback){
        mongoose.model("User").update({_id: idOperator}, {reconnected: reconnected}, function(err, res){
            callback(err, res);
        });
    };

    UserSchema.statics.setSocketId = function(idOperator, socketId, callback){
        mongoose.model("User").update({_id: idOperator}, {socketId: socketId}, function(err, res){
            callback(err, res);
        });
    };

    UserSchema.statics.getWebsiteFromId = function(id, callback){
        mongoose.model("User").findById(id).select('website').exec(function(err, res){

            callback(err, res);

        })

    };






    UserSchema.pre("save", true, function(next, done) {
        // var self = this;
        // generateId.get(self.firstName+" "+self.lastName, mongoose.model('User'), function(err, username){
        //     if(!err) {
        //         self.username = username;
        //         done();
        //     }
        // });
        done();
        next();
    });

    UserSchema.pre("save", true, function(next, done) {
        var user = this;

        if(!user.isModified('password')) return next();
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if (err) {
                console.log('aaaaaaa');
                return done(err);
            } 

            // hash the password along with our new salt
            bcrypt.hash(user.password, salt, null, function(err, hash) {
                if (err){
                    console.log('bbbbbbbbbb');
                    return done(err);
                } 

                // override the cleartext password with the hashed one
                user.password = hash;
                done();
            });
        });
        next();
    });


    mongoose.model("User", UserSchema);
};