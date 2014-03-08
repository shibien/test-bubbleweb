var mongoose = require('mongoose'),
    async = require('async');


// Création du schéma pour les rooms
var statisticsDaySchema = new mongoose.Schema({
    day : Number, 
    month : Number, 
    year : Number,
    website : String,
    numberOfVisitors : Number,
    numberOfConversations : Number,
    numberOfConversationsNotAssigned: Number   
});

// Création du Model pour les rooms
var statisticsDayModel = mongoose.model('statisticsDay', statisticsDaySchema);
module.exports.statisticsDayModel = statisticsDayModel;


var getTodayStatistics = function(website, callback){

	var date = new Date();
	var day = date.getDate();
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsDayModel.find({day: day, month: month, year: year, website: website}, function(err, res){
		callback(err, res);
	})
}
module.exports.getTodayStatistics = getTodayStatistics;

var getYesterdayStatistics = function(website, callback){

	var date = new Date();
	var dateOffset = (24*60*60*1000); //1 day
	date.setTime(date.getTime() - dateOffset);

	var day = date.getDate();
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsDayModel.find({day: day, month: month, year: year, website: website}, function(err, res){
		callback(err, res);
	})
}
module.exports.getYesterdayStatistics = getYesterdayStatistics;


var createDayStatistics = function(day, month, year, website, numberOfVisitors, numberOfConversations, numberOfConversationsNotAssigned, callback){

	statisticsDayModel.count({day: day, month: month, year: year, website: website}, function(err, nb){
		if(err) return callback(err);
		if(nb == 0){

			var statisticsToAdd = new statisticsDayModel({
				day: day,
				month: month,
				year: year,
				website: website,
				numberOfVisitors: numberOfVisitors,
				numberOfConversations: numberOfConversations,
				numberOfConversationsNotAssigned: numberOfConversationsNotAssigned
			});

			statisticsToAdd.save(function(err, elementAdded){
				callback(err);
			});
		}
	})

	

}

var addNumberOfVisitors = function(website, callback){
	var date = new Date();
	var day = date.getDate();
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsDayModel.update({day: day, month: month, year: year, website: website}, {$inc: {numberOfVisitors: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createDayStatistics(day, month, year, website, 1, 0, 0, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfVisitors = addNumberOfVisitors;

var addNumberOfConversations = function(website, callback){
	var date = new Date();
	var day = date.getDate();
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsDayModel.update({day: day, month: month, year: year, website: website}, {$inc: {numberOfConversations: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createDayStatistics(day, month, year, website, 0, 1, 0, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfConversations = addNumberOfConversations;

var addNumberOfConversationsNotAssigned = function(website, callback){
	var date = new Date();
	var day = date.getDate();
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsDayModel.update({day: day, month: month, year: year, website: website}, {$inc: {numberOfConversationsNotAssigned: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createDayStatistics(day, month, year, website, 0, 0, 1, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfConversationsNotAssigned = addNumberOfConversationsNotAssigned;


