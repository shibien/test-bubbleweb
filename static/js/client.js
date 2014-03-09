
var socket = io.connect('http://localhost:8686');

//récupération du nom du site sur lequel le client est connecté passé en get:
var src=document.getElementById("bubbleWebScript").src;
var websiteName=src.split("website=")[1];


//------------------------------------GLOBAL VARIABLES------------------------------------------------------
var TIME_BEFORE_DISPLAYING_WELCOME_MESSAGE = 4000 //the time before the welcome message is displayed when the visitor clicks on the help button

var automaticallyEngageConversation = function(chatOpenTime){
    setTimeout(function(){
        console.log("automatic engage");
        socket.emit('assignRandomOperator', {website: websiteName, automatic: true}, function(data){
            if(data.success){
                var operatorFirstName = data.username;
                var welcomeMessage = data.welcomeMessage;
                var picture = data.picture;
                var dateMessage = data.dateMessage;
                openChat();
                setAgent(picture, operatorFirstName);
                addMessageFromOperator(welcomeMessage, dateMessage);
            }
        });
    }, chatOpenTime);

}


socket.emit('clientConnected', {website: websiteName, url: document.URL}, function(data){
    if(data.done){
        console.log("emitting initiateVisitorsPage");
        socket.emit('initiateVisitorsPage', {website: websiteName}, function(data){
            console.log("callback initiateVisitorsPage");
            console.log(JSON.stringify(data));
            var buttonPosition = data.buttonPosition;
            var marginTopLeft = data.marginTopLeft;
            var marginBotRight = data.marginBotRight;
            var disableOffline = data.disableOffline;
            var chatOpenTime = data.chatOpenTime;
            var isChatting = data.isChatting;
            var operatorsOnline = data.operatorsOnline;

            if(data.operatorFirstName){
                var messages = data.messages;
                var operatorFirstName = data.operatorFirstName;
                var operatorLastName = data.operatorLastName;
                var operatorPicture = data.operatorPicture;
            }

            initiatePageVisitor({
                buttonPosition: buttonPosition, 
                marginTopLeft: marginTopLeft, 
                marginBotRight: marginBotRight, 
                disableOffline: disableOffline, 
                chatOpenTime: chatOpenTime, 
                isChatting: isChatting, 
                operatorsOnline: operatorsOnline, 
                messages: messages, 
                operatorFirstName: operatorFirstName, 
                operatorLastName: operatorLastName, 
                operatorPicture: operatorPicture});

            //we call the function "automaticallyEngageConversation"
            automaticallyEngageConversation(chatOpenTime);

        });
    }
});


socket.on('newMessageToVisitor', function(data){
    console.log("newMessageToVisitor event recieved");
    var message=data.message;
    var date = new Date();
    $("#chat").append( "<div class='message'><p>  "+ date.toString() +": " + message + "</p> </div>" );

});


socket.on('transferToNewRoom', function(data){
    console.log("transferToNewRoom event");
    alert("transfert d'agent");

    var oldRoomId = data.oldRoomId;
    var newRoomId = data.newRoomId;
    var operatorFirstName = data.operatorFirstName;
    var operatorLastName = data.operatorLastName;
    var picture = data.picture;
    var messagesToTransfer = data.messagesToTransfer;

    socket.emit('setNewRoomForVisitor', {oldRoomId: oldRoomId, newRoomId: newRoomId, messagesToTransfer: messagesToTransfer});

    setAgent(picture, operatorFirstName);
})


// socket.on('checkConnection', function(){
//     console.log('check connection recieved');
//     socket.emit('clientReconnected');

// });

socket.on('addMessageFromOperator', function(data){


    if(data.needToOpenChat){
        openChat();
    }   

    var message = data.message;
    var dateMessage = data.dateMessage;
    var operatorFirstName = data.operatorFirstName; 
    
    addMessageFromOperator(message, dateMessage);

});

var visitorClosingRoom = function(){
    socket.emit('visitorClosingRoom');
};


$("#sendEmail").click(function(){
    socket.emit('sendEmail'); 
});

$("#deleteSession").click(function(){
    socket.emit('deleteSession');    

});

//If the visitor clicks on this button after less than 10 sec after closing the chat, it will reopen the chat window in the same state than when he left it
//else it will open a new chat window and assign a new operator
$("#help-bubbleweb").click(function(){
    
    console.log("assignRandomOperator event");
    //socket.emit('assignRoom', {websiteName: websiteName});
    socket.emit('assignRandomOperator', {website: websiteName, automatic: false}, function(data){
        console.log("callback assignRandomOperator");
        console.log(data);
        
        if(data.success){
            
            var pictureUrl = data.picture;
            var operatorFirstName = data.username;
            var welcomeMessage = data.welcomeMessage;

            //we assign a room to the visitor
            socket.emit('assignRoom', function(data){
                if(data.success){
                    //we open the chat window
                    openChat();
                    //we update the picture and firstname of the operator
                    setAgent(pictureUrl, operatorFirstName);

                    //after x seconds, we display the welcomeMessage in the visitor's chat:
                    setTimeout(function(welcomeMessage){
                        var date = new Date();
                        addMessageFromOperator(welcomeMessage, date);
                    }, TIME_BEFORE_DISPLAYING_WELCOME_MESSAGE);
                }
                else{
                    //we open the window to send an email
                    openMailBox();
                }

            });                     
        }
        if(!data.success){
            //we open the window to send an email
            openMailBox();
        }
    }); 

});

socket.on('joinSpecificRoom', function(data){
    var roomId = data.roomId
    socket.emit('joinRoomAndSetSession', {roomId: roomId});
});

function submit(sms_xx, chatEntries){
    var date=new Date();
    var hour="00";
    var min="00";
    if(date.getHours()<10){
        hour="0"+date.getHours();
    }else{
        hour=date.getHours();
    }
    if(date.getMinutes()<10){
        min="0"+date.getMinutes();
    }else{
        min=date.getMinutes();
    }


    if($(sms_xx).val()){
        $(chatEntries).append('<br/><div id="ligne-bubbleweb"><div id="triangleSelfVisitor-bubbleweb"></div><div id="self-bubbleweb">'+$(sms_xx).val()+'<p class="infos text-right-bubbleweb">'+hour+':'+min+'</p></div></div>');
        //$(chatEntries).append('<br/><div id="ligne"><div id="triangleOther"></div><div id="other">'+$(sms_xx).val()+'</div></div>');
        console.log("emit sendMessageToOperator event");

        socket.emit('sendMessageToOperator', {message: $(sms_xx).val() }, function(data){
            if(!data.success){
                if(!data.needToAssignRoom){
                    //TODO DISPLAY ERROR
                    console.log("cannot send message");
                }
                //if a room has'nt been assigned yet, we assign it
                else{
                    console.log("callback sendMessageToOperator: emitting assignRoom");
                    socket.emit('assignRoom', function(data){
                        if(!data.success){
                            if(!data.needToReassignOperator){
                                //TODO DISPLAY ERROR
                                console.log("cannot send message");
                            }
                            else{
                                socket.emit('assignRandomOperator', {website: websiteName, automatic:false}, function(data){
                                    if(data.success){
                                        socket.emit('assignRoom', function(data){
                                            if(data.success){
                                                socket.emit('sendMessageToOperator', {message: $(sms_xx).val()});
                                                //clear input
                                                $(sms_xx).val("");
                                            }
                                            else{
                                                //TODO DISPLAY ERROR
                                                socket.emit('failedToAssignOperator');
                                                console.log("cannot send message");
                                            }
                                        })
                                    }
                                    else{
                                        //TODO DISPLAY ERROR
                                        console.log("cannot send message");
                                    }
                                })
                            }

                        }
                        else{
                            console.log("assignRoom success, emitting sendMessageToOperator");
                            socket.emit('sendMessageToOperator', {message: $(sms_xx).val()});
                            //clear input
                            $(sms_xx).val("");
                        }
                    })
                }

                
            }
            else{
                //clear input
                $(sms_xx).val("");
            }

        });  

        
        return false;
    }
    else{
        return false;
    }
}

$(document).on("submit", "#smsVisitor", function(){
    submit("#smsVisitor2","#chatEntriesVisitor-bubbleweb");
    return false;
});

