// Inclusion de Mongoose
var mongoose = require('mongoose');
var commentaire = require('./commentaireArticleSchema');
var conversation = require('./Database/Conversation');
var room = require('./Database/Room');
var website = require('./Database/Website');
var user = mongoose.model("User");
var visitor = require('./Database/Visitor');
var allStatistics = require('./Database/allStatistics');


module.exports.mongoose = mongoose;
module.exports.commentaire = commentaire;
module.exports.conversation = conversation;
module.exports.room = room;
module.exports.website = website;
module.exports.user = user;
module.exports.visitor = visitor;
module.exports.allStatistics = allStatistics;

 var dbUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
 var dbPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD; 
 var dbHost = process.env.OPENSHIFT_MONGODB_DB_HOST;
 var dbPort = parseInt(process.env.OPENSHIFT_MONGODB_DB_PORT);

//var user = require('./user/models/user');
// On se connecte à la base de données
// N'oubliez pas de lancer ~/mongodb/bin/mongod dans un terminal !


var connectionToMongodb = function(){

  mongoose.connect("mongodb://"+dbUser+":"+dbPass+"@"+dbHost+":"+dbPort+"/blog", function(err) {
    if (err) { throw err; }
  });
};
module.exports.connectionToMongodb = connectionToMongodb;


// statisticsDay.addNumberOfVisitors("aaaaaaaa", function(err){
// 	if(err) return console.log(err);
// });


// allStatistics.getAllStatistics("test", function(err, data){
// 	if(err) return console.log(err);
// 	console.log("%j", data);
// });

// statisticsMonth.addNumberOfConversationsNotAssigned("test", function(err){
// 	if(err) return console.log(err);
// });

// website.removeAllVisitors("test", function(err){
// 	if(err) return console.log(err);
// });



// room.getOperatorId("53011fa645a3f7880b677dec", function(err, res){
//   console.log(res);
// });
//website.createWebsite("test");

// website.addVisitor("testWebsite", "visitor2", function(err){
//   if(err) return console.log(err);

// });


// website.removeVisitor("testWebsite", "visitor2", function(err){
//   if(err) return console.log(err);
// })


// room.roomModel.update({is_displayed:true}, {is_displayed:false}, {multi: true} , function(err, res){
// 	if(err){
// 		return console.log(err);
// 	}
// });


// room.getRoomFromId("52ffc45757984b1408948d0f", function(err, res){
//     console.log("bbbbbbbbbbbbbb");
//     if(err){
//       console.log("erreur");
//     }
//     console.log(res);

// });


//room.createRoomsForOperator('operator222');
// room.getRoomsIdOfOperator('52ffbbc4933a18d815952192', function(err, result){

//   if(err){
//     return console.log(err);
//   }

//   for (i=0; i<result.length; i++){
//     console.log(result[i]);
//   }
// });


// website.createWebsite("testWebsite");

/*commentaire.addCommentaire('Paul', "whatss up?");
commentaire.findComment('Paul');*/


//conversation.createConversationAndAddMessage('rr', 'tt', 'hey?', '10/01/2014', true);
//conversation.addMessageToConversation('cccc', 'dddd', 'wessssssssssssssssssssssssssssssh', '16/01/2014', true);

/*conversation.getMessagesOfConversation({idVisitor : 'rr', idOperator: 'tt'}, function(err, result){
  if(err){
    return console.log(err);
  }
  console.log('resultat query:' + result);
});*/



