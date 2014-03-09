var statisticsDay = require('./StatisticsDay');
var statisticsWeek = require('./statisticsWeek');
var statisticsMonth = require('./statisticsMonth');

var addNumberOfVisitors = function(website, callback){
	statisticsDay.addNumberOfVisitors(website, function(err){
		if(err) callback(err);
	});
	statisticsWeek.addNumberOfVisitors(website, function(err){
		if(err) callback(err);
	});
	statisticsMonth.addNumberOfVisitors(website, function(err){
		if(err) callback(err);
	});

}
module.exports.addNumberOfVisitors = addNumberOfVisitors;

var addNumberOfConversations = function(website, callback){
	statisticsDay.addNumberOfConversations(website, function(err){
		if(err) callback(err);
	});
	statisticsWeek.addNumberOfConversations(website, function(err){
		if(err) callback(err);
	});
	statisticsMonth.addNumberOfConversations(website, function(err){
		if(err) callback(err);
	});

}
module.exports.addNumberOfConversations = addNumberOfConversations;

var addNumberOfConversationsNotAssigned = function(website, callback){
	statisticsDay.addNumberOfConversationsNotAssigned(website, function(err){
		if(err) callback(err);
	});
	statisticsWeek.addNumberOfConversationsNotAssigned(website, function(err){
		if(err) callback(err);
	});
	statisticsMonth.addNumberOfConversationsNotAssigned(website, function(err){
		if(err) callback(err);
	});

}
module.exports.addNumberOfConversationsNotAssigned = addNumberOfConversationsNotAssigned;


var getAllStatistics = function(website, callback){

	var data = {};

	statisticsDay.getTodayStatistics(website, function(err, dayStatistics){

		if(err) return callback(err, null);
		data.dayStatistics = dayStatistics;

		statisticsDay.getYesterdayStatistics(website, function(err, yesterdayStatistics){

			if(err) return callback(err, null);
			data.yesterdayStatistics = yesterdayStatistics;

			statisticsWeek.getThisWeekStatistics(website, function(err, weekStatistics){

				if(err) return callback(err, null);
				data.weekStatistics = weekStatistics;

				statisticsMonth.getMonthStatistics(website, function(err, monthStatistics){

					if(err) return callback(err, null);
					data.monthStatistics = monthStatistics;

					statisticsMonth.getLastMonthStatistics(website, function(err, lastMonthStatistics){
						if(err) return callback(err, null);
						data.lastMonthStatistics = lastMonthStatistics;

						callback(null, data);
					});

				});
			});
		})
		
	});
	
	

}
module.exports.getAllStatistics = getAllStatistics;

