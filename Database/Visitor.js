var mongoose = require('mongoose'),
    async = require('async');


// Création du schéma pour les rooms
var visitorSchema = new mongoose.Schema({
    idVisitor : String, 
    reconnected : Boolean, 
    connectionDate : String,
    isChatting : Boolean,
    failedToAssignOperator : Boolean,
    alreadyChatted : Boolean,
    url : String,
    geolocalisation: String ,
    socketId: String, 
    operatorAssigned: String
    //TODO: p-e ajouter un attribut 'alreadyPushed' si il a déjà été push ou alors l'attribut alreadyChatted suffit p-e à voir

});

// Création du Model pour les rooms
var visitorModel = mongoose.model('visitor', visitorSchema);
module.exports.visitorModel = visitorModel;


module.exports.createVisitor = function(idVisitor, url, geolocalisation, socketId, callback){
	
	visitorModel.count({idVisitor: idVisitor}, function(err, res){
		if(res>0) return console.log("error createVisitor: a visitor with this idVisitor already exists");

		var date = new Date();
		var visitor = new visitorModel({
			idVisitor: idVisitor, 
			reconnected: true, 
			connectionDate: date, 
			isChatting: false, 
			failedToAssignOperator: false, 
			alreadyChatted: false, 
			url: url, 
			geolocalisation: geolocalisation,
			socketId: socketId,
			operatorAssigned: ""
		});
		
		visitor.save(function (err, visitor) {
			console.log(typeof(callback));
	  		callback(err, visitor);
		});

	})
};


var removeVisitor = function(idVisitor, callback){
	visitorModel.remove({idVisitor: idVisitor}, function(err){
		callback(err);
	})
}
module.exports.removeVisitor = removeVisitor;

var getAllVisitors = function(callback){
	visitorModel.find(function(err, res){
		callback(err, res);
	})
}
module.exports.getAllVisitors = getAllVisitors;

var testIfVisitorExists = function(idVisitor, callback){
	var visitorExists;
	visitorModel.count({idVisitor: idVisitor}, function(err, res){
		if(err) return console.log(err);
		if(res == 0){
			visitorExists = false;
		}
		else{
			visitorExists = true;
		}
		callback(visitorExists);
	})

}
module.exports.testIfVisitorExists = testIfVisitorExists;


var getVisitor = function(idVisitor, callback){
	visitorModel.find({idVisitor: idVisitor}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.getVisitor = getVisitor;


var getVisitorFromSocketId = function(socketId, callback){
	visitorModel.find({socketId: socketId}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.getVisitorFromSocketId = getVisitorFromSocketId;

var setReconnected = function(idVisitor, reconnected, callback){
	visitorModel.update({idVisitor: idVisitor}, {$set: {reconnected: reconnected}}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.setReconnected = setReconnected;

var setIsChatting = function(idVisitor, isChatting, callback){
	visitorModel.update({idVisitor: idVisitor}, {$set: {isChatting: isChatting}}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.setIsChatting = setIsChatting;

var setFailedToAssignOperator = function(idVisitor, failedToAssignOperator, callback){
	visitorModel.update({idVisitor: idVisitor}, {$set: {failedToAssignOperator: failedToAssignOperator}}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.setFailedToAssignOperator = setFailedToAssignOperator;

var setAlreadyChatted = function(idVisitor, alreadyChatted, callback){
	visitorModel.update({idVisitor: idVisitor}, {$set: {alreadyChatted: alreadyChatted}}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.setAlreadyChatted = setAlreadyChatted;

var setUrl = function(idVisitor, url, callback){
	visitorModel.update({idVisitor: idVisitor}, {$set: {url: url}}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.setUrl = setUrl;

var setGeolocalisation = function(idVisitor, geolocalisation, callback){
	visitorModel.update({idVisitor: idVisitor}, {$set: {geolocalisation: geolocalisation}}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.setGeolocalisation = setGeolocalisation;

var setSocketId = function(idVisitor, socketId, callback){
	visitorModel.update({idVisitor: idVisitor}, {$set: {socketId: socketId}}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.setSocketId = setSocketId;

var setOperatorAssigned = function(idVisitor, operatorAssigned, callback){
	visitorModel.update({idVisitor: idVisitor}, {$set: {operatorAssigned: operatorAssigned}}, function(err, visitor){
		callback(err, visitor);
	})

}
module.exports.setOperatorAssigned = setOperatorAssigned;


