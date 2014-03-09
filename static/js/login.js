var socket = io.connect('http://localhost:8686');

console.log("gfnsdfngdk");

$("#connect_button").click(function() {

 console.log("button clicked");
 socket.emit('user:login', {email: $("#login_email").val(), password: $("#login_password").val()}, function(result){
     if(result.success){
         //ajouter le socketid dans la db
         //
         window.location.assign("http://localhost:8686/chatoperator");
     }
     else{
         console.log("success false");
         if ($('#error_message').length > 0) {
             $('#error_message').text(result.error);
         }
         else{
             $("#connect_button").after("<p id='error_message' class='text-danger'>" + result.error +"</p>");
         }

     }



 });

});