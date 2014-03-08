var mongoose = require('mongoose');
var room = require('./Room');



// Création du schéma pour les commentaires
var conversationSchema = new mongoose.Schema({
	id_visitor : String,  //The session_id of the visitor
	id_room : String, //the id of the operator in the database
	messages : [{
		isAutomaticMessage: Boolean,  //if it's an automatic message like when the user changes of URL  	
		content : String,
		date : String,
		toVisitor : Boolean,
		operatorFirstName: String
	}]
});

// Création du Model pour les commentaires
var conversationModel = mongoose.model('conversation', conversationSchema);



var createConversationAndAddMessage = function(idVisitor, idRoom, messageContent, messageDate, messageToVisitor, isAutomaticMessage, operatorFirstName){

	// On créé une instance du Model
	var conversation = new conversationModel({ id_visitor : idVisitor, id_room : idRoom });
	conversation.messages = [{date: messageDate, content: messageContent, toVisitor: messageToVisitor, isAutomaticMessage: isAutomaticMessage, operatorFirstName: operatorFirstName}];
	// On le sauvegarde dans MongoDB !
	conversation.save(function (err) {
		if (err) { throw err; }
		console.log('conversation added with success');
	});

};

module.exports.createConversationAndAddMessage = createConversationAndAddMessage;


var createConversationAndAddMessageWithCallback = function(idVisitor, idRoom, messageContent, messageDate, messageToVisitor, isAutomaticMessage, operatorFirstName, callback){

	// On créé une instance du Model
	var conversation = new conversationModel({ id_visitor : idVisitor, id_room : idRoom });
	conversation.messages = [{date: messageDate, content: messageContent, toVisitor: messageToVisitor, isAutomaticMessage: isAutomaticMessage, operatorFirstName: operatorFirstName}];
	// On le sauvegarde dans MongoDB !
	conversation.save(function (err) {
		callback(err);
	});

};

module.exports.createConversationAndAddMessageWithCallback = createConversationAndAddMessageWithCallback;





//Adds a message to the conversation. If the conversation doesn't exist (ie it's the first message to be added), it will create it.
var addMessageToConversation = function (idVisitor, idRoom, messageContent, messageDate, messageToVisitor, isAutomaticMessage, operatorFirstName){


	conversationModel.count({id_visitor: idVisitor, id_room: idRoom}, function(err, res){

		if (err) { throw err; }

		if (res==0){
			console.log('res=0');
			createConversationAndAddMessage(idVisitor, idRoom, messageContent, messageDate, messageToVisitor, isAutomaticMessage, operatorFirstName);
		}
		else{
			console.log('res =' + res);
			conversationModel.update({id_visitor: idVisitor, id_room: idRoom}, {$push: {messages: {date: messageDate, content: messageContent, toVisitor: messageToVisitor, isAutomaticMessage: isAutomaticMessage, operatorFirstName: operatorFirstName} }}, {safe: true, upsert: true, multi:true}, function(err){

				if (err) { throw err; }
				else{
					console.log("conversation model updated");
					
				}

			});
		}
		console.log('DB: message added to conversation');

	})


};

module.exports.addMessageToConversation = addMessageToConversation;

var addMessageToConversationWithCallback = function (idVisitor, idRoom, messageContent, messageDate, messageToVisitor, isAutomaticMessage, operatorFirstName, callback){

	conversationModel.count({id_visitor: idVisitor, id_room: idRoom}, function(err, res){

		if (err) { callback(err); }

		if (res==0){
			console.log('res=0');
			createConversationAndAddMessageWithCallback(idVisitor, idRoom, messageContent, messageDate, messageToVisitor, isAutomaticMessage, operatorFirstName, function(err){
				callback(err);
			});
		}
		else{
			console.log('res =' + res);
			conversationModel.update({id_visitor: idVisitor, id_room: idRoom}, {$push: {messages: {date: messageDate, content: messageContent, toVisitor: messageToVisitor, isAutomaticMessage: isAutomaticMessage, operatorFirstName: operatorFirstName} }}, {safe: true, upsert: true, multi:true}, function(err){
				
				callback(err);				
			});
		}
		console.log('DB: message added to conversation');

	})


};

module.exports.addMessageToConversationWithCallback = addMessageToConversationWithCallback;

var getMessagesOfConversation = function(idVisitor, idRoom, callback) {


	var query =	conversationModel
	.find({id_visitor: idVisitor, id_room: idRoom})
	.select('messages')
	.exec(function(err, result) {
		callback(err, result);
	});
}
module.exports.getMessagesOfConversation = getMessagesOfConversation;

