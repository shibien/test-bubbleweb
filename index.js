var port = 8686; //numéro de port

var express = require ('express'); //appel au module express pour accélérer la création du serveur
var app = express(); // créé un serveur à partir d'une fonction du module express
var io= require('socket.io'); // appel au module socket.io qui va gérer les interactions entre les utilisateurs et le serveur
var server = app.listen(port); // dit au serveur d'écouter le port donné

//We need this to store the session variables on a remote server
var redisStore = require('connect-redis')(express);

//Necessary to handle cookies
app.use(express.cookieParser());
//the variable secret provides more security for the session
app.use(express.session({
	store: new redisStore({
		host: 'localhost',
		port: 6379,
		db: 2,
		pass: 'RedisPASS'
	}),
	secret: '1234567890QWERTY',
	key: 'express.sid'

}));
//app.use(express.session({secret: '1234567890QWERTY'}));


app.use(express.static(__dirname + '/static'));

var pseudoArray=['admin']; //bloque le pseudo admin

// render et envoie la page home
app.get("/", function(req, res){
	res.render('index2.ejs');
	req.session.admin=true;
});

app.get("/1", function(req, res){
	res.render('test.ejs');
});

app.get("/client", function(req, res){
	res.render('test_client.ejs');
});


app.use(express.static(__dirname +'/public')); // donne l'emplacement des fichiers statiques, surtout les css

var servio = io.listen(server);// permet au socket d'écouter le serveur qui écoute à sont tour à un port

console.log("Listening on port" + port); // affiche dans la console le numéro de port écouté

var nbUsers=0; // nombre d'utilisateurs connectés

//var parseCookie = require('connect').utils.parseCookie;
var cookie = require('cookie');
var connect = require('connect');
var parseSignedCookie = connect.utils.parseSignedCookie;

servio.set('authorization', function (data, accept) {
    // check if there's a cookie header
    if (data.headers.cookie) {
        // if there is, parse the cookie
        data.cookie = cookie.parse(data.headers.cookie);
        // note that you will need to use the same key to grad the
        // session id, as you specified in the Express setup.
        data.sessionID = parseSignedCookie(data.cookie['connect.sid'], '1234567890QWERTY');
        console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.'+data.sessionID);
    } else {
       // if there isn't, turn down the connection with a message
       // and leave the function.
       console.log('No cookie transmitted.');
       return accept('No cookie transmitted.', false);
   }
    // accept the incoming connection
    accept(null, true);
});


var availableRoomList = ['room1', 'room2'];









servio.sockets.on('connection', function(socket){






	console.log('A socket with sessionID ' + socket.handshake.sessionID 
		+ ' connected!');
	//redisStore.get(socket.handshake.sessionID, function (error, session) {
      

		// var session = socket.handshake.session;
		
  //     if(typeof session.admin !== 'undefined'){
  //     	if(typeof session.room !== 'undefined'){
  //     		console.log('no room');
  //     		session.room = availableRoomList[0];
  //     		availableRoomList.shift();

  //     	}
      	

  //     }
  //     console.log('Room:' + session.room);
  //     socket.join(session.room);
    //});






 // lorsqu'un utilisateur se connecte
	nbUsers += 1; // on rajoute un utilisateur
	reloadUsers(); // met à jour le nombre d'utilisateurs connectés

	socket.on('message', function(data){
		//if(pseudoNotNull(socket) == true){
			var transmit = {date : new Date().toISOString(), pseudo : returnPseudo(socket), message : data};
			socket.broadcast.emit('message', transmit);
			console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
		//}

	});
	/*
	socket.on('setPseudo', function (data) { // Assign a name to the user
		if (pseudoArray.indexOf(data) == -1) // Test if the name is already taken
		{
			socket.set('pseudo', data, function(){
				pseudoArray.push(data);
				socket.emit('pseudoStatus', 'ok');
				console.log("user " + data + " connected");
			});
		}
		else
		{
			socket.emit('pseudoStatus', 'error') // Send the error
		}
	});*/

socket.on('disconnect', function(){
	nbUsers -= 1;
	reloadUsers();
		/*if(pseudoNotNull(socket)){
			var pseudo;
			socket.get('pseudo', function(err,name){
				pseudo = name;
			});
			var index = pseudoArray.indexOf(pseudo);
			pseudoArray.slice(index-1,1);
		}*/

	});


});

function pseudoNotNull(socket) { // Teste si l'utilisateur a un nom
var test;
socket.get('pseudo', function(err, name) {
	if (name == null ) test = false;
	else test = true;
});
return test;
}

function returnPseudo(socket) { // Return the name of the user
	var pseudo;
	socket.get('pseudo', function(err, name) {
		if (name == null ) pseudo = false;
		else pseudo = name;
	});
	return pseudo;
}

function reloadUsers(){ // met à jour le nombre d'utilisateurs connectés
servio.sockets.emit('nbUsers', {"nb": nbUsers});
}