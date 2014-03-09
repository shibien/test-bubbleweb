var socket = io.connect('window.location.hostname');

$("#addOperatorForm").submit(function( event ) {
	console.log("submit");
	var hasEmptyField = false;

	$(this).find( 'input[type!="hidden"]' ).each(function () {
		if ( ! $(this).val() ) { hasEmptyField = true;  }
	});

	if ( !hasEmptyField ) {

		socket.emit('user:signup', {lastName: $("#lastname").val() , firstName: $("#firstname").val(), password: $("#password").val(), email: $("#operator").val(), website: $("#website").val(), welcomeMessage: $("#welcome_message").val(), chatOpenTime: $("#chat_open_time").val()}, function(result){


		});
	}
	

	
});