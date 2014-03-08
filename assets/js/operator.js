var socket = io.connect('http://localhost:8686');

function addMessageToChat(chatId, message){


 var date = new Date();
 var divChatId = "#chat"+chatId;
 $(divChatId).append( "<div class='message'><p>  "+ date.toString() +": " + message + "</p> </div>" );





 // "<div class='message'>         <div class='hidden' >" + date.toString() + "</div>
 //            <p> Il y a moins d'une minute: " + message + "</p>

 //           </div>"

}

var getRoomData = function(roomId, callback){
    socket.emit('getRoomData', {roomId: roomId}, function(data){
        console.log("getRoomData, data:" + data);

        if(data.success){
            callback(data.room);
        }
        else{
            console.log("ERROR getRoomData");
        }

    });
};


//socket.emit('ready');
socket.emit('setOperatorSessionAndSetPageData', function(pageData){
    console.log('setOperatorSessionAndSetPageData');
    console.log(pageData);
    initiatePage(pageData);

});


socket.on('updateOperatorList', function(data){
    
    console.log("updateOperatorList event");
    var idOperator = data.idOperator;
    var status = data.status;
    var firstName = data.firstName;
    var lastName = data.lastName;
    var currentNumberOfConversations = data.currentNumberOfConversations;
    addAgent(idOperator, status, firstName, lastName);
});

socket.on('updateOperatorStatusInList', function(data){

    var operatorFirstName = data.operatorFirstName;
    var operatorLastName = data.operatorLastName;
    var operatorId = data.operatorId;
    var newStatus = data.status;

    updateStatutAgent(operatorId, newStatus, operatorFirstName, operatorLastName);
            
});


var logOut = function(){

    socket.emit('logOut', function(data){
        window.location.assign(data.url);
    });   
};


socket.on('redirectURL', function(data){

    window.location.assign(data.url);

});

socket.on('newMessageToOperator', function(data){
                      
    console.log("newMessageToOperator");
    var message = data.message;
    var roomId = data.roomId;
    var dateMessage = data.dateMessage;
    var operatorFirstName = data.operatorFirstName;

    recevoirMessage(message, roomId, dateMessage);
});






socket.on('addMessageFromOperator', function(data){
    addMessageFromOperator(data.message);

});

socket.on('test', function(data){
 console.log('test event recieved');
 alert("test recieved");

});


socket.on('deleteVisitor', function(data){
    console.log('deleteVisitor event');
    var idVisitor = data.idVisitor;
    deleteVisitor(idVisitor);

});

socket.on('newVisitorAssigned', function(data){
    console.log('newVisitorAssigned event');
    changeStatutVisitor(data.visitorId, "isChatting");
    ouvrirFenetre(data.roomId);
});



socket.on('updateVisitorStatus', function(data){
    var idVisitor = data.idVisitor;
    var status = data.status;
    console.log('updateVisitorStatus event');
    changeStatutVisitor(idVisitor, status);
});

socket.on('newClientConnected', function(data){
    //isChatting, failedToAssignOperator, alreadyChatted,
    
    console.log("newClientConnected event");
    var geolocalisation = data.visitor.geolocalisation;
    var idVisitor = data.visitor.idVisitor;
    var connectionDate = data.visitor.connectionDate;
    var url = data.visitor.url;
    var visitorState = "normalState";


    //TODO: augmenter de 1 la statistique nb de visiteurs pour le jour, la semaine et le mois

    if(data.visitor.failedToAssignOperator){
        visitorState = "failedToAssignOperator";
    }
    else{
        if(data.visitor.isChatting){
            visitorState = "isChatting";
        }
        else{
            if(data.visitor.alreadyChatted){
                visitorState = "alreadyChatted";
            }
        }
    }
    addVisitor(geolocalisation, idVisitor, url, connectionDate, visitorState);

});

socket.on('setRoomInactive', function(data){
    var roomId = data.roomId;
    inactif(roomId);
});

socket.on('updateCurrentNumberOfConversations', function(data){
    console.log('updateCurrentNumberOfConversation event');
    var operatorId = data.operatorId;
    var numberOfConversations = data.newNumberOfConversations;
    //TODO: modify the number of conversation for the operator in the list
});


socket.on('updateVisitorURL', function(data){
    console.log('updateVisitorURL event');
    var visitorId = data.visitorId;
    var url = data.url;
    var geolocalisation = data.geolocalisation;

    //TODO: donner la géolocalisation
    if(data.roomId){
        var roomId = data.roomId;
        robotUrl(url, roomId);
        robotInfosVisiteurForAgent(geolocalisation, url, roomId);
    }

    changerUrlVisiteurAccordion(geolocalisation, url, visitorId);
    
});

socket.on('addAutomaticMessageToRoom', function(data){
    var roomId = data.roomId;
    var content = data.content;
    var date = data.date;

    robotNotification(content, date, roomId);

});

socket.on('deleteOperatorFromList', function(data){
    console.log("deleteOperatorFromList");
    var idOperator = data.idOperator;
    deleteAgent(idOperator);

});

socket.on('TransferNewVisitor', function(data){
    console.log("transferNewVisitor");
    var roomId = data.roomId;
    var messagesToTransfer = data.messagesToTransfer;

    console.log("messagesToTransfer:");
    for(i = 0; i < messagesToTransfer.length; i++){
        console.log(JSON.stringify(messagesToTransfer[i]));
    }

    ouvrirFenetre(roomId);
    addFormerMessages(messagesToTransfer, roomId);

    

});


socket.on('transferProposal', function(data){

    console.log("transferProposal event");
    
    var newOperatorId = data.newOperatorId;
    var oldOperatorId = data.oldOperatorId;
    var oldRoomId = data.oldRoomId;
    var newOperatorFirstName = data.newOperatorFirstName;
    var newOperatorLastName = data.newOperatorLastName;
    var operatorPicture = data.operatorPicture;

    //If the operator accepts
    if(confirm('Un autre agent veut vous transférer un visiteur, acceptez-vous?')){
        console.log("emitting transferVisitorToOtherOperator event");
        socket.emit('transferVisitorToOtherOperator', {
            newOperatorId: newOperatorId, 
            oldOperatorId: oldOperatorId, 
            oldRoomId: oldRoomId, 
            newOperatorFirstName: newOperatorFirstName, 
            newOperatorLastName: newOperatorLastName,
            operatorPicture: operatorPicture
        }, function(data){
            if(!data.success){
                alert("transfert impossible");
                socket.emit('createAlert', {operatorId: oldOperatorId, alertMessage:"Impossible de transférer le visiteur."});
            }
            else{
                socket.emit('transferAccepted', {oldRoomId: oldRoomId, oldOperatorId: oldOperatorId});
            }
        });
    }
    //if the operator refuses
    else{
        socket.emit('createAlert', {operatorId: oldOperatorId, alertMessage:"L'opérateur a refusé le transfert"});
    }

});

socket.on('emitAlert', function(data){
    console.log("emitAlert event");

    var alertMessage = data.alertMessage;

    alert(alertMessage);
});

socket.on('transferAccepted', function(data){
    console.log("transferAccepted event");

    var oldRoomId = data.oldRoomId;
    alert("transfert accepté.");
    close(oldRoomId);    
});

socket.on('updateRoomDateOfInactivity', function(data){
    console.log("updateRoomDateOfInactivity event");

    var roomId = data.roomId;
    var dateOfInactivity = data.dateOfInactivity;

    //TODO: appeler une fonction qui met à jour la date of inactivity de la room
});

socket.on('incrementNumberOfConversationStatistic', function(data){
    console.log("incrementNumberOfConversationStatistic event");

    //TODO: incrémenter la statistique number of conversation pour le jour, la semaine et le mois
});

socket.on('failedToAssignOperatorToVisitor', function(data){
    console.log("failedToAssignOperatorToVisitor event");
    var idVisitor = data.idVisitor;

    changeStatutVisitor(idVisitor, "failedToAssignOperator");
    //TODO: Modifier la couleur du visiteur dans la liste, et augmenter de 1 le nombre de visiteur qui n'ont pas pu avoir d'agents assignés pour le jour/semaine/mois

});


var transferOperator = function(newOperatorId, oldRoomId){

    console.log("emitting transfer Operator");
    console.log("oldRoomId: " + oldRoomId);

    socket.emit('askForTransferVisitorToOtherOperator', {newOperatorId: newOperatorId, oldRoomId: oldRoomId}, function(data){
        if(!data.success){
            alert(data.errorMessage);
        }    

    });
};




var setRoomNotDisplayed = function(roomId){
    console.log("emitting setRoomNotDisplayed");
    socket.emit('setRoomNotDisplayed', {roomId: roomId});

};

var toggleOperatorStatus = function(){
    console.log("emitting toggleOperatorStatus event");
    socket.emit('toggleOperatorStatus');
};

var engageConversation = function(idVisitor, roomId){
    console.log("emitting assignSpecificOperatorAndRoom, idVisitor:" + idVisitor);
    socket.emit('assignSpecificOperatorAndRoom', {idVisitor: idVisitor, roomId: roomId}, function(data){
        if(!data.success){
            alert("Erreur: impossible de chatter avec ce visiteur");
        }

    });

};
