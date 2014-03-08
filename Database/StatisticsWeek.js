var mongoose = require('mongoose'),
    async = require('async');


// Création du schéma pour les rooms
var statisticsWeekSchema = new mongoose.Schema({
    weekNumber : Number,  
    year : Number,
    website : String,
    numberOfVisitors : Number,
    numberOfConversations : Number,
    numberOfConversationsNotAssigned: Number   
});

// Création du Model pour les rooms
var statisticsWeekModel = mongoose.model('statisticsweek', statisticsWeekSchema);
module.exports.statisticsWeekModel = statisticsWeekModel;


var getThisWeekStatistics = function(website, callback){

	var date = new Date();
	var weekNumber = getWeek(date);
	var year = date.getFullYear();

	statisticsWeekModel.find({weekNumber: weekNumber, year: year, website: website}, function(err, res){
		callback(err, res);
	})
}
module.exports.getThisWeekStatistics = getThisWeekStatistics;


var createWeekStatistics = function(weekNumber, year, website, numberOfVisitors, numberOfConversations, numberOfConversationsNotAssigned, callback){

	statisticsWeekModel.count({weekNumber: weekNumber, year: year, website: website}, function(err, nb){
		if(err) return callback(err);
		if(nb == 0){

			var statisticsToAdd = new statisticsWeekModel({
				weekNumber: weekNumber,
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
	var weekNumber = getWeek(date);
	var year = date.getFullYear();

	statisticsWeekModel.update({weekNumber: weekNumber, year: year, website: website}, {$inc: {numberOfVisitors: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createWeekStatistics(weekNumber, year, website, 1, 0, 0, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfVisitors = addNumberOfVisitors;

var addNumberOfConversations = function(website, callback){
	var date = new Date();
	var weekNumber = getWeek(date);
	var year = date.getFullYear();

	statisticsWeekModel.update({weekNumber: weekNumber, year: year, website: website}, {$inc: {numberOfConversations: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createWeekStatistics(weekNumber, year, website, 0, 1, 0, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfConversations = addNumberOfConversations;

var addNumberOfConversationsNotAssigned = function(website, callback){
	var date = new Date();
	var weekNumber = getWeek(date);
	var year = date.getFullYear();

	statisticsWeekModel.update({weekNumber: weekNumber, year: year, website: website}, {$inc: {numberOfConversationsNotAssigned: 1}}, function(err, nbAffected){
		if(err) callback(err);
		if(nbAffected == 0){
			createWeekStatistics(weekNumber, year, website, 0, 0, 1, function(err){
				callback(err);
			});
		}
	})


}
module.exports.addNumberOfConversationsNotAssigned = addNumberOfConversationsNotAssigned;

var getWeek = function( d) { 
 
	// Create a copy of this date object  
	var target  = new Date(d.valueOf());  

	// ISO week date weeks start on monday  
	// so correct the day number  
	var dayNr   = (d.getDay() + 6) % 7;  

	// Set the target to the thursday of this week so the  
	// target date is in the right year  
	target.setDate(target.getDate() - dayNr + 3);  

	// ISO 8601 states that week 1 is the week  
	// with january 4th in it  
	var jan4    = new Date(target.getFullYear(), 0, 4);  

	// Number of days between target date and january 4th  
	var dayDiff = (target - jan4) / 86400000;    

	// Calculate week number: Week 1 (january 4th) plus the    
	// number of weeks between target date and january 4th    
	var weekNr = 1 + Math.ceil(dayDiff / 7);    

	return weekNr;    
 
}