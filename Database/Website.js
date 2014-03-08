var mongoose = require('mongoose');


// Création du schéma pour les rooms
var websiteSchema = new mongoose.Schema({
    name : String, //the name of the website
    visitors: [{visitor_id: String}]
    
});
module.exports.websiteSchema = websiteSchema;


// Création du Model pour les rooms
var websiteModel = mongoose.model('website', websiteSchema);

module.exports.websiteModel = websiteModel;


var createWebsite = function(websiteName){

    // On créé une instance du Model
    websiteModel.count({name: websiteName}, function(err, nbWebsite){
        if(err) return console.log(err);
        if (nbWebsite > 0){
            return console.log("error trying to create a website with a name that already exists");
        }
        var website = new websiteModel({ name: websiteName });
        // website.visitors = new Array();
        website.visitors = [];
        // On le sauvegarde dans MongoDB !
        website.save(function (err) {
            if (err) { throw err; }
            console.log('website added with success');
        });
    })
    
};
module.exports.createWebsite = createWebsite;

var addVisitor = function(websiteName, visitorId, callback){
        websiteModel.count({name: websiteName, visitors: visitorId }, function(err, nb){
            if(err) return console.log(err);
            if(nb == 0){
                websiteModel.update({name : websiteName}, {$push: {visitors: {visitor_id: visitorId }}}, function(err, nbAffected){
                    callback(err, nbAffected);        
                });
            }
        })
        
};
module.exports.addVisitor = addVisitor;

var removeVisitor = function(websiteName, visitorId, callback){

    websiteModel.update({name : websiteName}, {$pull: {visitors: {visitor_id: visitorId} }}, function(err){
        callback(err);
    });
};
module.exports.removeVisitor = removeVisitor;


var removeAllVisitors = function(websiteName, callback){

    websiteModel.update({name : websiteName}, {$set: {visitors: []}}, {multi: true}, function(err){
        callback(err);
    });
}
module.exports.removeAllVisitors = removeAllVisitors;


var getVisitors = function(websiteName, callback){

    websiteModel.findOne({name : websiteName}).select('visitors').exec(function(err, res){
        callback(err, res);
    });
    
};
module.exports.getVisitors = getVisitors;










