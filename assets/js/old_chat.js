/*
var socket = io.connect('http://localhost:8686');

//contains the current URL of the visitor
var currentURL = document.URL;

socket.emit('new_user', currentURL);

$('#envoyer').click(function(){
	
	var message=$('#message').val();
	//$('.conversation').append('<p>' + message +'</p>');
	socket.emit('nouveau_message', message);


});

socket.on('retrieve_users', function(userConnected) {
    $('.user_list').append('<p>number of users connected: '+userConnected+'</p>');
    for (var i = 1;i < userConnected; i++)
    {
		$('.user_list').append('<p> User '+i+'</p>');
    } 
});

socket.on('allo', function(message1) {
    $('.conversation').append('<p>'+message1+'</p>');
});

socket.on('update_user', function(userName, url) {
    $('.user_list').append('<p>'+userName+'  '+url+'</p>');
});
*/