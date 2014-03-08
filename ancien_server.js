

var port = 8686;

var express = require('express'),
app = express();
var http = require('http')
, server = http.createServer(app)
, io = require('socket.io').listen(server);

//We need this to store the session variables on a remote server
var RedisStore = require('connect-redis')(express);

app.use(express.static(__dirname + '/static'));

//gère le favicon
//app.use(express.favicon('images/favicon.ico'));
app.use(express.favicon(__dirname + 'static/images/favicon.ico'));

//Nécessaire pour gérer les cookies
app.use(express.cookieParser());
//the variable secret provides more security for the session
app.use(express.session({
	store: new RedisStore({
		host: 'localhost',
		port: 6379,
		db: 2,
		pass: 'RedisPASS'
	}),
	secret: '1234567890QWERTY'
}));
app.use(express.session({secret: '1234567890QWERTY'}));

var userConnected=0;



server.listen(port);



app.get("/", function(req, res){

//si la variable de session username n'existe pas encore on la crée
	if(!req.session.userName){
		req.session.userName='Visitor_'+userConnected;
	}
	
	res.render('index.ejs', {userName: req.session.userName});
});

app.get("/client", function(req, res){
	res.render('test_client.ejs', {pageTitle: 'Client Page'});
});





// io.sockets.on('connection', function (socket) {
//     socket.emit('message', { message: 'welcome to the chat' });
//     socket.on('send', function (data) {
//         io.sockets.emit('message', data);
//     });
// });



io.sockets.on('connection', function (socket) {

	socket.emit('retrieve_users', userConnected);
	console.log("socket id:" + socket.id);



	socket.on('nouveau_message', function (message) {
		socket.emit('allo', message);
	}); 

	socket.on('new_user', function (currentURL) {
		userConnected++;
		var userName="user"+userConnected;
        var url=currentURL
		socket.emit('update_user', userName, url);
	}); 

});


console.log("Listening on port " + port);

