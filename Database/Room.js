var mongoose = require('mongoose'),
    async = require('async');


// Création du schéma pour les rooms
var roomSchema = new mongoose.Schema({
    id_operator : String, //the id of the operator in the database
    id_visitor : String, //the session id of the visitor
    is_active : Boolean, //True if the last message of the visitor is recent
    dateOfInactivity : String, //contains the date of the last time the room turned inactive    //TODO: renommer dateOfLastMessageFromVisitor
    is_displayed: Boolean //true if operator windows displays this room
});

// Création du Model pour les rooms
var roomModel = mongoose.model('room', roomSchema);
module.exports.roomModel = roomModel;


//Create the four rooms of an operator (we will do it when we add a new operator)
var createRoomsForOperator = function(idOperator, callback){
    var success = true,
        list = [1,1,1,1];

    async.forEach(list, function(item, done) {
        // On créé une instance du Model
        var room = new roomModel({id_operator : idOperator });
        room.is_active = false;
        room.is_displayed = false;
        // On le sauvegarde dans MongoDB !
        room.save(function (err) {
            if (err) success = false;
        });
    }, function() {
        callback(success);
    });

   
};

module.exports.createRoomsForOperator = createRoomsForOperator;


var getRoomsWithOperator = function (idOperator, callback){

    query = roomModel.find({id_operator : idOperator})
    .exec(function(err, result) {
        callback(err, result);
    });

}
module.exports.getRoomsWithOperator = getRoomsWithOperator;

var getRoomsWithIdVisitor = function (idVisitor, callback){

    query = roomModel.find({id_visitor : idVisitor})
    .exec(function(err, result) {
        callback(err, result);
    });

}
module.exports.getRoomsWithIdVisitor = getRoomsWithIdVisitor;



var getAllRooms = function(callback){
    roomModel.find(function(err, result){
        callback(err, result);
    })
}
module.exports.getAllRooms = getAllRooms;

var getRoomsAvailableWithOperator = function (idOperator, callback){

    query = roomModel.find({id_operator : idOperator, is_displayed : false})
    .exec(function(err, result) {
        callback(err, result);
    });

}
module.exports.getRoomsAvailableWithOperator = getRoomsAvailableWithOperator;


var getOperatorId = function (roomId, callback){

    query = roomModel.find({_id : roomId})
    .select('id_operator')
    .exec(function(err, result) {
        callback(err, result);
    });

}

module.exports.getOperatorId = getOperatorId;

//If the room coresponding to 'roomId' is not displayed, it will set the 'id_visitor' of this room to 'visitorId'
var setVisitorIfRoomNotDisplayed = function (roomId, visitorId, callback){

    console.log(roomId);
    roomModel.findOneAndUpdate({_id : roomId, is_displayed : false}, { $set: { id_visitor: visitorId }})
    .exec(function (err, res) {
      callback(err, res );
  }); 

};

module.exports.setVisitorIfRoomNotDisplayed = setVisitorIfRoomNotDisplayed;

//sets the 'id_visitor' to 'visitorId' of the room which has the id equals to 'roomId'
var setVisitor = function (roomId, visitorId, callback){
    roomModel.findByIdAndUpdate(roomId, {$set: { id_visitor: visitorId} }, function(err, res){
        callback(err, res);
    });
}
module.exports.setVisitor = setVisitor;

var setActive = function (roomId, callback){

    roomModel.update({_id : roomId}, {$set: { is_active: true} }, function(err){
        callback(err);
    });
}
module.exports.setActive = setActive;

var setUnactive = function (roomId, callback){

    roomModel.update({_id : roomId}, {$set: { is_active: false} }, function(err){
        callback(err);
    });
}
module.exports.setUnactive = setUnactive;


var setDateOfInactivity = function (roomId, dateOfInactivity, callback){

    roomModel.update({_id : roomId}, {$set: { dateOfInactivity: dateOfInactivity} }, function(err){
        callback(err);
    });
}
module.exports.setDateOfInactivity = setDateOfInactivity;

var setDisplayed = function (roomId, callback){

    roomModel.update({_id : roomId}, {$set: { is_displayed: true} }, function(err){
        callback(err);
    });
}
module.exports.setDisplayed = setDisplayed;

var setNotDisplayed = function (roomId, callback){

    roomModel.update({_id : roomId}, {$set: { is_displayed: false} }, function(err){
        callback(err);
    });
}
module.exports.setNotDisplayed = setNotDisplayed;


// var getRoomFromId = function(roomId, callback){

//     roomModel.find({_id : roomId}, function(err, res){

//         callback(err, res);
//     });
// }

var getRoomFromId = function(roomId, callback){

    roomModel.findById(roomId, function(err, res){
        callback(err, res);
    });
};

module.exports.getRoomFromId = getRoomFromId;



/*//Search all the rooms
var assignRoomToAVisitor = function (idVisitor, idOperator, callback){


    roomModel.update({})
    roomModel.count({id_visitor: idVisitor, id_operator: idOperator}, function(err, res){

        if (err) { throw err; }

        if (res==0){
            console.log('res=0');
            createRoomsForOperator(idVisitor, idOperator, messageContent, messageDate, messageToVisitor);
        }
        else{
            console.log('res =' + res);
            roomModel.update({id_visitor: idVisitor, id_operator: idOperator}, {$push: {messages: {date: messageDate, content: messageContent, toVisitor: messageToVisitor} }}, {safe: true, upsert: true, multi:true}, function(err){

                if (err) { throw err; }
                else{
                    console.log("Room model updated");
                    
                }

            });
        }
        console.log('DB: message added to Room');

    })
};

module.exports.addMessageToRoom = addMessageToRoom;

var getMessagesOfRoom = function(data, callback) {


    var query = roomModel
    .find({id_visitor: data.idVisitor, id_operator: data.idOperator})
    .select('messages')
    .exec(function(err, result) {
        callback(err, result);
    });
}
module.exports.getMessagesOfRoom = getMessagesOfRoom;*/

