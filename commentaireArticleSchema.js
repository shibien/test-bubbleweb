var mongoose = require('mongoose');



// Création du schéma pour les commentaires
var commentaireArticleSchema = new mongoose.Schema({
  pseudo : { type : String, match: /^[a-zA-Z0-9-_]+$/ },
  contenu : String,
  date : { type : Date, default : Date.now }
});

// Création du Model pour les commentaires
var CommentaireArticleModel = mongoose.model('commentaires', commentaireArticleSchema);



var addCommentaire = function(pseudo2, contenu2){

// On créé une instance du Model
var monCommentaire = new CommentaireArticleModel({ pseudo : pseudo2 });
monCommentaire.contenu = contenu2;

// On le sauvegarde dans MongoDB !
monCommentaire.save(function (err) {
  if (err) { throw err; }
  console.log('Commentaire ajouté avec succès !');
});



};
module.exports.addCommentaire = addCommentaire;




// Ici on va récupérer les 3 premiers commentaires ayant le pseudo Atinux

var findComment = function(pseudo2){

var query = CommentaireArticleModel.find(null);
query.where('pseudo', pseudo2);
query.limit(3);
// peut s'ecrire aussi query.where('pseudo', 'Atinux').limit(3);
query.exec(function (err, comms) {
  if (err) { throw err; }
  // On va parcourir le resultat et les afficher joliment
  var comm;
  for (var i = 0, l = comms.length; i < l; i++) {
    comm = comms[i];
    console.log('------------------------------');
    console.log('Pseudo : ' + comm.pseudo);
    console.log('Commentaire : ' + comm.contenu);
    console.log('Date : ' + comm.date);
    console.log('ID : ' + comm._id);
    console.log('------------------------------');
  }
});
};
module.exports.findComment = findComment;

