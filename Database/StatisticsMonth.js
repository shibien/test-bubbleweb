var mongoose = require('mongoose'),
    async = require('async');


// Création du schéma pour les rooms
var statisticsMonthSchema = new mongoose.Schema({
    month : Number,  
    year : Number,
    website : String,
    numberOfVisitors : Number,
    numberOfConversations : Number,
    numberOfConversationsNotAssigned: Number   
});

// Création du Model pour les rooms
var statisticsMonthModel = mongoose.model('statisticsmonth', statisticsMonthSchema);
module.exports.statisticsMonthModel = statisticsMonthModel;


var getMonthStatistics = function(website, callback){

	var date = new Date();
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsMonthModel.find({month:month, year: year, website: website}, function(err, res){
		callback(err, res);
	})
}
module.exports.getMonthStatistics = getMonthStatistics;

var getLastMonthStatistics = function(website, callback){

	var date = new Date();
	var month = date.getMonth();
	var year = date.getFullYear();

	var lastMonth;
	if(month > 0){
		lastMonth = month-1
	}
	else{
		lastMonth = 11
		year = year - 1;
	}	

	statisticsMonthModel.find({month:lastMonth, year: year, website: website}, function(err, res){
		callback(err, res);
	})
}
module.exports.getLastMonthStatistics = getLastMonthStatistics;


var createMonthStatistics = function(month, year, website, numberOfVisitors, numberOfConversations, numberOfConversationsNotAssigned, callback){

	statisticsMonthModel.count({month: month, year: year, website: website}, function(err, nb){
		if(err) return callback(err);
		if(nb == 0){

			var statisticsToAdd = new statisticsMonthModel({
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
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsMonthModel.update({month: month, year: year, website: website}, {$inc: {numberOfVisitors: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createMonthStatistics(month, year, website, 1, 0, 0, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfVisitors = addNumberOfVisitors;

var addNumberOfConversations = function(website, callback){
	var date = new Date();
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsMonthModel.update({month: month, year: year, website: website}, {$inc: {numberOfConversations: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createMonthStatistics(month, year, website, 0, 1, 0, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfConversations = addNumberOfConversations;

var addNumberOfConversationsNotAssigned = function(website, callback){
	var date = new Date();
	var month = date.getMonth();
	var year = date.getFullYear();

	statisticsMonthModel.update({month: month, year: year, website: website}, {$inc: {numberOfConversationsNotAssigned: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createMonthStatistics(month, year, website, 0, 0, 1, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfConversationsNotAssigned = addNumberOfConversationsNotAssigned;

