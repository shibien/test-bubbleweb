
var PORT = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var IPADDRESS = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';


var express = require('express.io'),
    MemoryStore = express.session.MemoryStore,
    sessionStore = new MemoryStore(),
    app = express().http().io(),
    RedisStore = require('connect-redis')(express),
    util = require('util'),
    geo = require('geoip2ws')('87283', 'd3It94rXB1wi'),
    nodemailer = require('nodemailer')


require('./user/models/user.js')();
require('./user/controllers/signup.js').setup(app);
require('./user/controllers/login.js').setup(app);
require('./user/controllers/user.js').setup(app);

var database = require('./database'),
async = require('async');

//global variables
var URL_LOGIN_PAGE = "http://localhost:8686/login";
var ARRAY_VISITOR_DISCONNECTION_TIMEOUT = new Array();
var ARRAY_OPERATOR_DISCONNECTION_TIMEOUT = new Array();



 /**
 * Setup sessions
 */
 app.use(express.cookieParser());
 app.use(express.session({
    secret: '6543265432',
    store: new RedisStore({
        host: 'localhost',
        port: 6379
        //host: '10.0.2.15'

    }),
    cookie: {
        path: '/',
        maxAge: 1000*60*60*24*60,//60 days
        httpOnly: true
    }
}));


 app.use(express.static(__dirname + '/static'));

//decrease the number of log lines in the console
app.io.configure(function() {
    app.io.set('log level', 1);
})





//connection to MongoDb:
database.connectionToMongodb();


//------------------------------------------URL ROUTING------------------------------------------------------------------------------------------------------


app.get("/", function(req, res){
    res.render('index2.ejs');
    //req.session.admin=true;
});

app.get("/chatOperatorAlex", function(req, res){
    res.render('chatOperatorAlex.ejs');
    //req.session.admin=true;
});

app.get("/chatoperator", function(req, res){
    res.render('chatOperator.ejs');
    //req.session.admin=true;
});


app.get("/signup", function(req, res){
    res.render('addOperator.ejs');
});

app.get("/1", function(req, res){
    res.render('test.ejs');
});

app.get("/client", function(req, res){
    res.render('chatClient.ejs');
});

app.get("/client2", function(req, res){
    res.render('chatClient.ejs');
});

app.get("/login", function(req, res){
    res.render('login.ejs');
});

//---------------------------------------------------EVENT ROUTING------------------------------------------------------------------------------


app.io.route('ready', function(req){

    console.log('socket ready');
});

// app.io.route('testSocket', function(req){

//     console.log(util.inspect(req.socket));

//     console.log('testSocket event');
//     database.visitor.getAllVisitors(function(err, res){
//         if(err) return console.log(err);
//         for(i =0; i < res.length; i++){
//             if(res[i].socketId !== ""){
//                 console.log("emitting to " + res[i].socketId);
//                 req.socket.namespace.manager.sockets.socket(res[i].socketId).emit('azerty', {success : true});
//             }
//         }
//     })

// });


//Send the data needed for the page, then set the operator's session doesn't exist, set his session and join his rooms
app.io.route('setOperatorSessionAndSetPageData', function(req){

    console.log('setOperatorSessionAndSetPageData');

    var pageData = {}; //data to send to the page
    pageData.user = {};
    pageData.otherOperators = {};
    pageData.statistics = {};

    var roomIdList = new Array();
    var roomList = new Array();



    if(!req.session.user_id){
        console.log("session not found");
        req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
    }
    else{
            //if the operator's status is offline, we set it to online and we send an event to the other operators
            database.mongoose.model('User').getUserFromId(req.session.user_id, function(err, operator){
                if(err) return console.log(err);
                if(operator.status === "offline"){
                    database.mongoose.model('User').setStatusFromId(req.session.user_id, "online", function(err, nbAffected){
                        if(err) return console.log(err);
                        req.io.room(req.session.website).broadcast('updateOperatorList', {
                            idOperator: req.session.user_id, 
                            status: "online", 
                            firstName: operator.firstName, 
                            lastName: operator.lastName
                        });
                    })
                }
            })

            //UpdateTheSocketId of the user in the db
            database.mongoose.model('User').setSocketId(req.session.user_id, req.socket.id, function(err, res){
                if(err) return console.log(err);
            })

            //if the operator reconnected we clear the timeout that would disconnect him
            clearTimeout(ARRAY_OPERATOR_DISCONNECTION_TIMEOUT[req.session.user_id]);

            database.room.getRoomsWithOperator(req.session.user_id, function(err, res){

            if(err) return console.log(err);

            async.series([
                function(callback){                  
                    
                    async.forEach(res, function(room, done) {
                            var roomToAdd = {};
                            roomToAdd.id = room._id;
                            roomToAdd.is_active = room.is_active;
                            roomToAdd.is_displayed = room.is_displayed;
                            roomToAdd.dateOfInactivity = room.dateOfInactivity;
                            //if the room is displayed we get the conversation of the room
                            if(room.is_displayed){
                                var idVisitor = room.id_visitor;
                                //now we get the conversation with the roomId and the idVisitor
                                database.conversation.getMessagesOfConversation(idVisitor, room._id, function(err, conversations){
                                    if(err) return console.log(err);
                                    if(conversations[0]){
                                        roomToAdd.messages = conversations[0].messages; 
                                    }

                                    roomList.push(roomToAdd);
                                    roomIdList.push(room._id);                        
                                    req.io.join(room._id);

                                    done();                                
                                    
                                })
                            }
                            else{
                                roomList.push(roomToAdd);
                                roomIdList.push(room._id);                        
                                req.io.join(room._id);
                                done();
                            }
                            

                        
                            
                        },
                        function() {
                            
                            callback(null);  
                                                        
                        }
                    )
                },
                function(callback){

                    if(req.session.user_id){
                        database.mongoose.model('User').getUserFromId(req.session.user_id, function(err, user){
                            console.log(req.session.user_id);
                            console.log(user);
                            if(err) return console.log(err);
                            

                            pageData.user.firstName = user.firstName;
                            pageData.user.status = user.status;
                            req.session.website = user.website;
                            req.io.join(user.website);

                            //If he's connecting for the first time, we emit an event to the other operators to update the operator list
                            if(!req.session.notFirstConnection){
                                console.log("opérateur first connection");
                                req.session.notFirstConnection = true;
                                req.session.save();

                                //we get data on the current user
                                database.mongoose.model('User').getUserFromId(req.session.user_id, function(err, currentOperator){
                                    if(err) return console.log(err);
                                    if(!currentOperator){
                                        console.log("ERROR setOperatorSessionAndSetPageData: cannot find a user with id " + req.session.user_id);
                                    }
                                    else{
                                        req.io.room(user.website).broadcast('updateOperatorList', {
                                            idOperator: req.session.user_id, 
                                            status: currentOperator.status, 
                                            firstName: currentOperator.firstName, 
                                            lastName: currentOperator.lastName, 
                                            currentNumberOfConversations: currentOperator.currentNumberOfConversations
                                             })
                                    }
                                })
                                
                            }

                            roomIdList.push(user.website);
                            req.session.save();

                            //Get information (status, current nb of conversations) on the other online operators for the website

                            var otherOnlineOperators = new Array(); 

                            //first we get all the operators for the website
                            database.mongoose.model('User').getOperatorsFromWebsite(user.website, function(err, res){
                                if(err) return console.log(err);

                                var operatorToAdd = {};
                                async.forEach(res, function(operator, done) {
                                        //if the operator in not offline and is not the current connected operator, we add him to the list
                                        if((operator.status !== "offline") && (operator._id.toString() !== req.session.user_id)){
                                            operatorToAdd.status = operator.status;
                                            operatorToAdd.firstName = operator.firstName;
                                            operatorToAdd.lastName = operator.lastName;
                                            operatorToAdd.currentNumberOfConversations = operator.currentNumberOfConversations;
                                            operatorToAdd.id = operator._id;

                                            otherOnlineOperators.push(operatorToAdd);
                                            
                                        }
                                        done();
                                    },
                                    function() {
                                        pageData.otherOperators = otherOnlineOperators;
                                        //Get the current visitors of the website
                                        database.website.getVisitors(user.website, function(err, res){
                                            console.log("res:" + res);
                                            if(res.visitors){
                                                if(err) return console.log(err);
                                                var visitorList = new Array();
                                                async.forEach(res.visitors, function(visitor, done) {
                                                    database.visitor.getVisitor(visitor.visitor_id, function(err, res){
                                                        if(err) return console.log(err);
                                                        if(res[0]){
                                                            visitorList.push(res[0]);
                                                            done();
                                                        }
                                                        else{
                                                            console.log("ERROR setOperatorSessionAndSetPageData: cannot find a visitor with the idVIsitor " + visitor.visitor_id );
                                                        }
                                                        
                                                        
                                                    });
                                                }, function() {

                                                        pageData.visitors = visitorList;
                                                        //if he already has roomIdList in his session we add the rooms if they aren't already in the roomIdList
                                                        if(req.session.roomIdList){
                                                            for(j=0; j<roomIdList.length; j++){

                                                                if (req.session.roomIdList.indexOf(roomIdList[j]) == -1){
                                                                    req.session.roomIdList.push(roomIdList[j]);
                                                                }
                                                            }
                                                        }

                                                        else{
                                                            req.session.roomIdList = roomIdList;
                                                        }

                                                        req.session.isOperator=true;

                                                        req.session.save();
                                                        pageData.rooms = roomList;

                                                        //we get the statistics of the website
                                                        database.allStatistics.getAllStatistics(user.website, function(err, data){
                                                            if(err) return console.log(err);
                                                            pageData.statistics = data;
                                                            req.io.respond(pageData);
                                                            callback(null);

                                                        })

                                                        
                                                    })
                                                
                                                
                                            }
                                            else{
                                                console.log("ERROR website.getVisitors, impossible to find the website " + user.website);
                                            }             




                                        })
                                            
                                    }
                                )
                                

                            })         
                          
                        })
                    }
                  
                }
            ]);    
        });

    }


    
});

app.io.route('clientConnected', function(req){

    req.session.isVisitor = true;

    req.session.save();
    var url = req.data.url;

    //If it's a new session, we add a new visitor in the database and we add it to the visitorList of the website
    if(!req.session.alreadyConnected){
        console.log("client connecting for first time, session id:" + req.session.id);
        req.session.isOperator = false;
        req.session.alreadyConnected = true;
        req.session.website = req.data.website;
        req.session.save();

        //we get the client's geolocalisation using maxmind with his ip
        console.log(util.inspect(req.socket.namespace.manager.sockets));
        // geo( req.socket.namespace.manager.sockets.socket, function(err, data){
        //     if(err) return console.log(err);
        //     console.log(data);
        // } );

        database.visitor.createVisitor(req.session.id, url, "geolocalisation", req.socket.id, function(err, visitor){
            if(err) return console.log(err);
            database.website.addVisitor(req.data.website, req.session.id, function(err, nbAffected){
                if(err) return console.log(err);
                if(nbAffected == 0){
                    console.log("ERROR1: website.addVisitor, no website named " + req.data.website + " found");
                }
                else{
                    //we update the number of visitors statistic for the website
                    database.allStatistics.addNumberOfVisitors(req.data.website, function(err){
                        if(err) return console.log(err);

                        req.io.room(req.data.website).broadcast('newClientConnected', { visitor: visitor});
                        req.io.respond({done: true});

                    })

                    

                }
            })           
        })       
        
    }  
    //
    else{
        console.log("client connecting NOT for first time, session id:" + req.session.id);
        //if he has a roomId in his session, we make him join the room
            if(req.session.roomId){
                req.io.join(req.session.roomId);
            }

        //we check if the visitor exists in the database, otherwise we create him
        database.visitor.testIfVisitorExists(req.session.id, function(visitorExists){
            //if the visitor doesn't exist in the database
            if(!visitorExists){
                console.log("visitor not existing in database");
                database.visitor.createVisitor(req.session.id, req.data.url, "geolocalisationTODO", req.socket.id, function(err, visitor){
                    if(err) return console.log(err);
                    database.website.addVisitor(req.data.website, req.session.id, function(err, nbAffected){
                        if(err) return console.log(err);
                        if(nbAffected == 0){
                            console.log("ERROR0: website.addVisitor, no website named" + req.data.website + " found");
                        }
                    })
                    req.io.room(req.data.website).broadcast('newClientConnected', { visitor: visitor});
                    req.io.respond({done: true});
                })
                              
            }
            //if the visitor already exists in the database, we set the 'reconnected' attribute to true, and we update his socketId  
            else{
                console.log("visitor existing in database");
                clearTimeout(ARRAY_VISITOR_DISCONNECTION_TIMEOUT[req.session.id]);

                database.visitor.setSocketId(req.session.id, req.socket.id, function(err, nbAffected){
                    if(err) return console.log(err);
                    if(nbAffected == 0){
                        console.log("ERROR: visitor.setReconnected, impossible to find the user with the session id "+ req.session.id+ " in the database");
                    }
                })

                //we check if the visitor'url changed, if it did, we update it in the db and send an event to the operator to update it,
                //and we add an automatic message to the conversation if he has one
                database.visitor.getVisitor(req.session.id, function(err, visitors){
                    if(err) return console.log(err);
                    if(!visitors[0]){
                        console.log("ERROR Client connected: cannot find the visitor with the id " + req.session.id);
                    }
                    else{
                        if(url !== visitors[0].url){
                            database.visitor.setUrl(req.session.id, url, function(err, nbAffected){
                                if(err) return console.log(err);

                                //now we check the visitor has an ongoing conversation, if he does we add an automatic message to the conversation
                                if(visitors[0].isChatting){


                                    //we check that there is a room associated to the visitor which is displayed 
                                    var date = new Date();
                                    database.room.getRoomsWithIdVisitor(req.session.id, function(err, rooms){
                                        if(err) return console.log(err);
                                        for(i = 0; i < rooms.length; i++){
                                            if(rooms[i].is_displayed){
                                                var roomId = rooms[i]._id;

                                                req.io.room(req.data.website).broadcast('updateVisitorURL', {visitorId: req.session.id, url: url, roomId: roomId, geolocalisation: visitors[0].geocalisation});
                                                database.conversation.addMessageToConversationWithCallback(req.session.id, roomId, "Nouvelle URL: " + url, date, false, true, "osef", function(err){
                                                    if(err) return console.log(err);
                                                    req.io.room(roomId).broadcast('addAutomaticMessageToRoom', {roomId: roomId, content: "Nouvelle URL: " + url, date: date});
                                                })
                                            }
                                        }
                                    })
                                }

                                else{
                                    req.io.room(req.data.website).broadcast('updateVisitorURL', {visitorId: req.session.id, url: url, geolocalisation: visitors[0].geocalisation});
                                }
                            })
                        }
                    }
                })

                req.io.respond({done:true});

                
            }
        });        


}    


});


app.io.route('initiateVisitorsPage', function(req){

    console.log("initiateVisitorsPage event");

    var websiteName = req.data.website;

    //TODO récupérer les variables suivantes dans leur bdd
    //the position of the help button (top, right, left, bottom)
    var buttonPosition = "top";
    //the top-left margin of the button in %
    var marginTopLeft = 20; 
    //the bottom-right margin of the button in %
    var marginBotRight = 20;
    //if the offline mode is disabled or not 
    var disableOffline = false;
    //The number of seconds before the chat automatically opens
    var chatOpenTime = 20000;

    //if the visitor is chatting
    var isChatting;
    //if there are online operators for the website
    var operatorsOnline;


    //we check if there are connected operators to the website
    database.mongoose.model('User').getNumberOfOnlineOperatorsForAWebsite(websiteName, function(err, nbOperators){
        if(err) return console.log(err);
        if(nbOperators == 0){
            operatorsOnline = false;
        }
        if(nbOperators > 0){
            operatorsOnline = true;
        }

        //we check if the visitor is chatting
        if(req.session.id){
            database.visitor.getVisitor(req.session.id, function(err, visitors){
                if(err) return console.log(err);
                if(!visitors[0]){
                    console.log("ERROR initiateVisitorsPage: cannot find a user with id " + req.session.id);
                }
                else{
                    if(visitors[0].isChatting){
                        isChatting = true;
                        //if the visitor is chatting, we need to get the firstname, lastname and picture of the operator associated
                        //and we need to get the messages of the conversation
                        var operatorId = visitors[0].operatorAssigned;
                        database.mongoose.model('User').getUserFromId(operatorId, function(err, operator){
                            if(err) return console.log(err);
                            if(!operator){
                                console.log("ERROR initiateVisitorsPage: impossible to find an operator with the id " + operatorId);
                            }
                            else{
                                var operatorFirstName = operator.firstName;
                                var operatorLastName = operator.lastName;
                                var operatorPicture = "images/suzy.jpg";
                                //TODO get the picture from their database

                                if(req.session.roomId){
                                    //now we get the conversation associated
                                    database.conversation.getMessagesOfConversation(req.session.id, req.session.roomId, function(err, conversations){
                                        if(err) return console.log(err);
                                        if(!conversations[0]){
                                            console.log("ERROR initiateVisitorsPage: impossible to find a conversation with the idVisitor " + req.session.id 
                                                +" and the roomId: " + req.session.roomId);
                                        }
                                        else{
                                            var messages = conversations[0].messages;
                                            //the position of the help button (top, right, left, bottom)

                                            req.io.respond({
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
                                                operatorPicture: operatorPicture

                                            })

                                        }
                                    })
                                }
                                else{
                                    console.log("ERROR initiateVisitorsPage: req.session.roomId undefined");
                                }
                                

                            }
                        })

                    }
                    else{
                        isChatting = false;
                        req.io.respond({
                            buttonPosition: buttonPosition,
                            marginTopLeft: marginTopLeft,
                            marginBotRight: marginBotRight,
                            disableOffline: disableOffline,
                            chatOpenTime: chatOpenTime,
                            isChatting: isChatting,
                            operatorsOnline: operatorsOnline
                        })
                    }
                }
            })                        
        }
        else{
            console.log("ERROR initiateVisitorsPage: req.session.id undefined");
        }

    })

    

})


//The disconnect event is triggered even when visitors are browsing the website when they change their URL.
//To make sure the visitor really left the website, on the disconnect event we trigger a function that will be called 1 min later to check
//if the visitor reconnected to the website or not.
app.io.route('disconnect', function(req){

    //if it's an operator disconnecting
    if(req.session.isOperator){
        console.log("operator socket disconnecting");
        if(req.session.user_id){

            var idOperator = req.session.user_id;             
            var timeoutOperatorToAdd = setTimeout(function(){

                console.log("operator not reconnected");

                //we set notFirstConnection to false so that it will update the operator list of others operators when he reconnects
                req.session.notFirstConnection = false;
                req.session.save();

                database.mongoose.model('User').setStatusFromId(idOperator, "offline", function(err, res){
                    if(err) return console.log(err);
                    if(res == 0){
                        console.log("ERROR checkIfOperatorReconnected: cannot find operator with id " + idOperator);
                    }                        
                })
                req.io.room(req.session.website).broadcast('deleteOperatorFromList', {idOperator: idOperator});                       
                        
            },15000);

            //we add the timeout to the timeout list associated to the visitors, so we can clear it when the visitor reconnects
            ARRAY_OPERATOR_DISCONNECTION_TIMEOUT[req.session.user_id] = timeoutOperatorToAdd;
        }

        else{
            req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
        }
        
    }
    //else if it's a client disconnecting
    else{
        if(req.session.isVisitor){
            
            console.log("visitor disconnection");
            var idVisitor = req.session.id; 

            var timeoutVisitorToAdd = setTimeout(function(){

                console.log("visitor not reconnected");
                req.io.room(req.session.website).broadcast('deleteVisitor', {idVisitor: idVisitor});
                req.io.route('deleteVisitorInDatabase');                              
                    
            },10000); 

            ARRAY_VISITOR_DISCONNECTION_TIMEOUT[idVisitor] = timeoutVisitorToAdd;                  
                
             
        }   

    }
});

app.io.route('createAlert', function(req){
    console.log("createAlert event");

    var alertMessage = req.data.alertMessage;
    var operatorId = req.data.operatorId;

    //Now we get the socket id of the operator
    database.mongoose.model('User').getUserFromId(operatorId, function(err, operator){
        if(err) return console.log(err);
        if(!operator){
            console.log("ERROR createAlert: cannot find an operator with id: " + operatorId);
        }
        else{
            var socketId = operator.socketId;
            req.socket.namespace.manager.sockets.socket(socketId).emit('emitAlert', {alertMessage: alertMessage});
        }
    })

})



app.io.route('transferAccepted', function(req){
    var oldRoomId = req.data.oldRoomId;
    var oldOperatorId = req.data.oldOperatorId;

    //Now we get the socket id of the operator
    database.mongoose.model('User').getUserFromId(oldOperatorId, function(err, operator){
        if(err) return console.log(err);
        if(!operator){
            console.log("ERROR transferAccepted: cannot find an operator with id: " + operatorId);
        }
        else{
            var socketId = operator.socketId;
            req.socket.namespace.manager.sockets.socket(socketId).emit('transferAccepted', {oldRoomId: oldRoomId});
        }
    })
})

app.io.route('ckeckIfVisitorReconnected', function(req){

    console.log('ckeckIfVisitorReconnected event');
    
    

});


app.io.route('checkIfOperatorReconnected', function(req){

    console.log('checkIfOperatorReconnected event');
    
    if(req.session.user_id){
        var idOperator = req.session.user_id;
        database.mongoose.model('User').getUserFromId(idOperator, function(err, operator){
            if(err) return console.log(err);
            if(!operator){
                console.log("ERROR checkIfOperatorReconnected: cannot find operator with id " + idOperator);
            }
            else{
                if(!operator.reconnected){

                    console.log("operator not reconnected");

                    //we set notFirstConnection to false so that it will update the operator list of others operators when he reconnects
                    req.session.notFirstConnection = false;
                    req.session.save();

                    database.mongoose.model('User').setStatusFromId(idOperator, "offline", function(err, res){
                        if(err) return console.log(err);
                        if(res == 0){
                            console.log("ERROR checkIfOperatorReconnected: cannot find operator with id " + idOperator);
                        }                        
                    })
                    req.io.room(req.session.website).broadcast('deleteOperatorFromList', {idOperator: idOperator});
                }
            }
        })
        

    }
    else{
        
        req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
    }
    

});

//event called when the operator logs out
app.io.route('logOut', function(req){
    if(req.session.user_id){
        var operatorId = req.session.user_id;   
        database.mongoose.model('User').setStatusFromId(operatorId, "offline", function(err, res){
            if(err) return console.log(err);
            if(res == 0){
                console.log("ERROR logOut: cannot find operator with id " + operatorId);
            }
            else{
                //emit an event to update the operator list of other operators
                req.io.room(req.session.website).broadcast('deleteOperatorFromList', {idOperator: operatorId});

                //we destroy his session
                req.session.destroy();

                //we update all the rooms of the operator to 'displayed = false'
                database.room.getRoomsWithOperator(operatorId, function(err, rooms){
                    if(err) return console.log(err);
                    for(i = 0; i < rooms.length; i++){
                        if(rooms[i].is_displayed){
                            database.room.setNotDisplayed(rooms[i]._id, function(err){
                                if(err) return console.log(err);
                            })
                        }
                    }
                    req.io.respond({url: URL_LOGIN_PAGE});

                })
            }
        })
    }
    
    else{
        req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
    }
})





app.io.route('deleteVisitorInDatabase', function(req){
    console.log('deleteVisitorInDatabase event');

    if((req.session.id) && (req.session.website)){
        var idVisitor = req.session.id;
        database.visitor.removeVisitor(idVisitor, function(err){
            if(err) return console.log(err);            
            database.website.removeVisitor(req.session.website, idVisitor, function(err){
                if(err) return console.log(err);
            })
        })
    }
    else{
        console.log("ERROR deleteVisitorInDatabase: req.session.id or req.session.website undefined");
    }

    

})


//Get all the operators associated to the visitor's website, then browse the list of operators and select the operators with free rooms
//Then randomly choose one operator with free rooms
app.io.route('assignRandomOperator', function(req){

    console.log("assignRandomOperator event");

    var website = req.data.website;
    var automatic = req.data.automatic //true if the chat window was automatically opened in the visitor page, false if it's the visitor clicking on the help button
    
    var assignRandomOperator = function(){

        var operatorsOfWebsite = new Array(); //list of the operator associated to the website
        var availableOperators = new Array(); //list containing the operators available for the visitor
        var operatorsOnline = false; // if there are online operators for the website

        database.mongoose.model('User').getOperatorsFromWebsite(website, function(err, res){
            if(err) return console.log(err);
            if(res[0]){
                for(i = 0; i < res.length; i++){
                    operatorsOfWebsite.push(res[i]);
                }

                //now we browse the 'operatorsOfWebsite' array to keep the available ones in the 'availableOperators' array
                var nbRoomsAvailable;
                async.forEach(operatorsOfWebsite,
                    function(operator, done) {
                        if(operator.status === "online"){
                            operatorsOnline = true;
                            database.room.getRoomsAvailableWithOperator(operator._id, function(err, res){
                                if(err) return console.log(err);
                                if(res[0]){
                                    availableOperators.push(operator);
                                    done();
                                }
                                else{
                                    done();
                                }
                            })
                        }
                        else{
                            done();
                        }
                    },
                    function() {
                        //now we randomly select one availableOperator
                        var nbOfAvailableOperators = availableOperators.length;

                        if(nbOfAvailableOperators == 0){
                            req.io.respond({success: false});
                            //if there were online operators but they were not available, we set the status of the visitor to "failedToAssignOperator"
                            //and we send an event to all the operators of the website 
                            if(req.session.id){
                                if(operatorsOnline){
                                    database.visitor.setFailedToAssignOperator(req.session.id, true, function(err, nbAffected){
                                        if(err) return console.log(err);
                                        if(nbAffected == 0){
                                            console.log("ERROR  assignRandomoperator: cannot find a visitor with the id " + req.session.id);
                                        }
                                        else{
                                            database.visitor.setIsChatting(req.session.id, false, function(err, nbAffected){
                                                if(err) return console.log(err);
                                            });
                                            database.allStatistics.addNumberOfConversationsNotAssigned(req.session.website, function(err){
                                                if(err) return console.log(err);
                                                socket.emit("failedToAssignOperatorToVisitor", {idVisitor: req.session.id});
                                            })                                            
                                        }

                                        
                                    })
                                }
                            }
                            else{
                                console.log("Error assignRandomOperator: req.session.id undefined");
                            }
                            
                        } 
                        else{
                            var randomIndex = Math.floor((Math.random()*nbOfAvailableOperators));
                            var operatorAssigned = availableOperators[randomIndex];
                            if(req.session.id){
                                database.visitor.setOperatorAssigned(req.session.id, availableOperators[randomIndex]._id, function(err, operator){
                                    if(err) return console.log(err);
                                    console.log("assignRandomOperator success:true");
                                    //TODO get the picture URL and the welcomeMessage,
                                    var welcomeMessage = "welcomeMessage";
                                    var dateMessage = new Date();
                                    var picture = "images/suzy.jpg";
                                    
                                    req.io.respond({success: true, username: operatorAssigned.firstName, picture: picture, welcomeMessage: welcomeMessage, dateMessage: dateMessage});
                                });
                            }
                            else{
                                console.log("ERROR assignRandomOperator: req.session.id undefined");
                            }
                        }
                    }
                );
            }            
        });
    };
    

    //if it's an automatic event, if the visitor already closed the chat window (ie 'alreadyChatted' is true in the db, it will respond success = false)
    if(automatic){
        database.visitor.getVisitorFromSocketId(req.socket.id, function(err, res){
            if(err) return console.log(err);
            if(res[0]){
                if((res[0].alreadyChatted) || (res[0].isChatting)){
                    req.io.respond({success: false});
                }
                else{
                    assignRandomOperator();
                }

            }
            else{
                console.log("ERROR assignRandomOperator: cannot find a visitor in the db with the socket id " + req.socket.id);
            }
        })
    }
    else{
        assignRandomOperator();
    }  
    

});

app.io.route('toggleOperatorStatus', function(req){

    console.log('toggleOperatorStatus event');

    if(req.session.user_email){
        database.mongoose.model('User').getOperatorFromEmail(req.session.user_email, function(err, user){
            if(err) return console.log(err);
            if(!user[0]){
                console.log("ERROR toggleOperatorStatus event: cannot find a user with the email " + req.session.user_email);
            }
            else{
                if(user[0].status === "online"){
                    database.mongoose.model('User').setStatusFromEmail(req.session.user_email, "away", function(err, res){
                        if(err) return console.log(err);
                        req.io.room(req.session.website).broadcast('updateOperatorStatusInList', {operatorId: req.session.user_id, status: "away", operatorFirstName: user[0].firstName, operatorLastName: user[0].lastName}); 
                    })
                }
                if(user[0].status === "away"){
                    database.mongoose.model('User').setStatusFromEmail(req.session.user_email, "online", function(err, res){
                        if(err) return console.log(err);
                        req.io.room(req.session.website).broadcast('updateOperatorStatusInList', {operatorId: req.session.user_id, status: "online", operatorFirstName: user[0].firstName, operatorLastName: user[0].lastName}); 
                    })
                }                
            }
        })
        database.mongoose.model('User').setStatusFromEmail
    }
    else{
        console.log("ERROR toggleOperatorStatus event: req.session.user_email unknown")
        req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
    }

})

//assign a specific operator to a visitor and save it in the database then set the room to 'isDisplayed = true'
app.io.route('assignSpecificOperatorAndRoom', function(req){

    console.log("assignSpecificOperatorAndRoom event");

    var roomId = req.data.roomId;
    var idVisitor = req.data.idVisitor;

    if(req.session.website){

        var website = req.session.website;

        //First we get the operator Id linked to the room.
        database.room.getOperatorId(roomId, function(err, res){
            if(err) return console.log(err);
            if(res[0]){
                var operatorId = res[0].id_operator;

                //now we set operatorAssigned to the visitor in the db
                
                database.visitor.setOperatorAssigned(idVisitor, operatorId, function(err, nb){
                    if(err) return console.log(err);
                    if(nb == 0){
                        console.log("ERROR assignSpecificOperator: cannot find a visitor with the id " + idVisitor);
                        req.io.respond({success: false});
                    }
                    else{
                        
                        //set isDisplayed to true
                        database.room.setDisplayed(req.data.roomId, function(err){
                            if(err) return console.log(err);
                            database.room.setVisitor(req.data.roomId, idVisitor, function(err, res){
                                if(err) return console.log(err);
                                var socketIdVisitor;

                                //now we want to get the socket ID of the visitor to emit an event
                                
                                database.visitor.getVisitor(idVisitor, function(err, visitors){
                                    if(err) return console.log(err);
                                    if(visitors[0]){
                                        socketIdVisitor = visitors[0].socketId;
                                        console.log("socketId: " + socketIdVisitor);
                                        req.socket.namespace.manager.sockets.socket(socketIdVisitor).emit('joinSpecificRoom', {roomId: roomId});

                                        //Now we update the number of conversation of the operator
                                        
                                        database.mongoose.model('User').updateCurrentNumberOfConversations(operatorId, function(updated, newNumberOfConversations){
                                            if(err) return console.log(err);
                                            
                                            if(updated){
                                                req.io.room(website).broadcast('updateCurrentNumberOfConversations', {operatorId: operatorId, numberOfConversations: newNumberOfConversations});
                                            }

                                            //we update the statistic 'numberOfConversations' for the website
                                            database.allStatistics.addNumberOfConversations(req.session.website, function(err){
                                                if(err) return console.log(err);
                                                req.io.room(operator.website).broadcast('incrementNumberOfConversationStatistic');
                                                req.io.respond({success: true});
                                            });                                          
                                                             
                                        })

                                        
                                    }
                                })
                                
                            })

                        });
                        
                    }
                })
            }
            else{            
                console.log("ERROR assignSpecificOperator: cannot find a room in the db with the id " + roomId);
                req.io.respond({success: false});

            }
        })

    }
    else{
        console.log("ERROR assignSpecificOperator: req.session.website undefined")
        req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
    }    

})

app.io.route('joinRoomAndSetSession', function(req){

    console.log('joinRoomAndSetSession event');

    var roomId = req.data.roomId;


    //join the room and save the roomId in the session
    req.socket.join(roomId);
    req.session.roomId = roomId;
    req.session.save();
});

//Get the operator assigned to the visitor from the database, then tries to assign him an empty room
app.io.route('assignRoom', function(req){
    
    console.log("assignRoom event");
    var roomAssigned = {};
    console.log("visitor socketId:" + req.socket.id);
    database.visitor.getVisitorFromSocketId(req.socket.id, function(err, res){
        if(err) return console.log(err);
        if(res[0]){
            console.log("res[0]: " + res[0]);
            var idVisitor = res[0].idVisitor;
            var operatorAssignedId = res[0].operatorAssigned;
            console.log("operatorAssigned:" + res[0].operatorAssigned);

            //We check if the operator assigned is still online
            database.mongoose.model('User').getUserFromId(operatorAssignedId, function(err, operator){
                if(err) return console.log(err);;
                if(operator){
                    if(operator.status === "online"){
                        database.room.getRoomsWithOperator(operatorAssignedId, function(err, res){
                            if(err) return console.log(err);
                            if(res[0]){
                                var roomFound = false;
                                var i=0;
                                while((!roomFound)&&(i < res.length)){
                                    if(!res[i].is_displayed){
                                        roomAssigned = res[i];
                                        roomFound = true;
                                    }
                                    i++;
                                }

                                if(!roomFound){
                                    req.io.respond({success: false, needToReassignOperator : true});
                                }
                                else{

                                    if(req.session.id){
                                        req.io.join(roomAssigned._id);
                                        console.log("emitting newVisitorAssigned");
                                        req.io.room(roomAssigned._id).broadcast('newVisitorAssigned', {roomId: roomAssigned._id, idVisitor: idVisitor});
                                        req.session.roomId = roomAssigned._id;
                                        req.session.save();
                                        database.room.setVisitor(roomAssigned._id, req.session.id, function(err, res){
                                            if(err) return console.log(err);
                                        })
                                        database.room.setDisplayed(roomAssigned._id, function(err){
                                            if(err) return console.log(err);
                                            //we update the number of conversation for the operator
                                            database.mongoose.model('User').updateCurrentNumberOfConversations(operatorAssignedId, function(updated, newNumberOfConversations){
                                                if(err) return console.log(err);
                                                if(updated){
                                                    req.io.room(operator.website).broadcast('updateCurrentNumberOfConversations', {operatorId: operatorAssignedId, numberOfConversations: newNumberOfConversations});
                                                }                                 
                                            
                                            })
                                        })
                                        database.visitor.setIsChatting(req.session.id, true, function(err, visitor){
                                            if(err) return console.log(err);
                                            req.io.room(req.session.website).broadcast('updateVisitorStatus', {idVisitor: req.session.id, status: "isChatting"});

                                        })
                                        database.visitor.setFailedToAssignOperator(req.session.id, false, function(err, visitor){
                                            if(err) return console.log(err);
                                        })
                                        database.visitor.setAlreadyChatted(req.session.id, false, function(err, visitor){
                                            if(err) return console.log(err);
                                        })

                                        //we update the statistic 'numberOfConversations' for the website
                                        database.allStatistics.addNumberOfConversations(operator.website, function(err){
                                            if(err) return console.log(err);
                                            req.io.room(operator.website).broadcast('incrementNumberOfConversationStatistic');
                                        });

                                        req.io.respond({success: true});
                                    }
                                    else{
                                        console.log("ERROR assignRoom: req.session.id undefined")
                                    }

                                    
                                }
                            }
                            else{
                                console.log("ERROR assignRoom: impossible to find the rooms in the database for the operator with the id " + operatorAssignedId);
                            }
                        })
                    }
                    else{
                        req.io.respond({success: false, needToReassignOperator : true});
                    }
                }
                else{
                    console.log("ERROR assignRoom: impossible to find the operator in the db with the id " + operatorAssignedId);
                }
            })
        }
        else{
            console.log("ERROR assignRoom: impossible to find the visitor with the socketId" + req.socket.id + " in the database");
        }
    })

})

app.io.route('failedToAssignOperator', function(req){

    console.log("failedToAssignOperator event");
    
    if(req.session.id){
        //we set the status of the visitor to 'failedToAssignOperator'
        database.visitor.setFailedToAssignOperator(req.session.id, true, function(err, nbAffected){
            if(err) return console.log(err);
            if(nbAffected == 0){
                console.log("ERROR failedToAssignOperator: cannot find a visitor with the id " + req.session.id);
            }
            else{
                database.visitor.setIsChatting(req.session.id, false, function(err, nbAffected){
                    if(err) return console.log(err);
                });

                database.allStatistics.addNumberOfConversationsNotAssigned(req.session.website, function(err){
                    if(err) return console.log(err);
                });

                req.io.room(req.session.website).broadcast('failedToAssignOperatorToVisitor', {idVisitor: req.session.id});                
            }
        })



    }
    else{
        console.log("ERROR failedToAssignOperator event: req.session.id undefined")
    }

});

app.io.route('askForTransferVisitorToOtherOperator', function(req){
   
   console.log("transferVisitorToOtherOperator event");

   if(req.session.user_id){

        var newOperatorId = req.data.newOperatorId;
        var oldOperatorId = req.session.user_id;
        var oldRoomId = req.data.oldRoomId;
        

        //first we check that the new operator is online and has a free room
        database.mongoose.model('User').getUserFromId(newOperatorId, function(err, operator){
            if(err) return console.log(err);
            if(!operator){
                console.log("ERROR transferVisitorToOtherOperator: cannot find an operator with id " + newOperatorId);
            }
            else{
                if(operator.status !== "online"){
                    console.log("transferVisitorToOtherOperator respond false");
                    req.io.respond({success: false, errorMessage:"Transfert impossible: L'opérateur choisi est hors ligne"});
                }
                else{
                    //now we check if the operator has empty rooms
                    database.room.getRoomsAvailableWithOperator(newOperatorId, function(err, res){
                        if(err) return console.log(err);
                        if(!res[0]){
                            req.io.respond({success: false, errorMessage:"Transfert impossible: L'opérateur choisi n'a plus de places disponibles pour chatter."});
                            console.log("transferVisitorToOtherOperator respond false");
                        }
                        else{

                            //we emit an event to the new operator to know if he accepts the transfer or not
                            req.socket.namespace.manager.sockets.socket(operator.socketId).emit('transferProposal', {
                                newOperatorId: newOperatorId,
                                oldOperatorId: oldOperatorId,
                                oldRoomId: oldRoomId,
                                newOperatorFirstName: operator.firstName, 
                                newOperatorLastName: operator.lastName, 
                                operatorPicture: "images/suzy.jpg"
                            });
                            
                        }
                    })
                }
            }
        });

   }

   else{
        console.log("ERROR askForTransferVisitorToOtherOperator: req.session.user_id undefined")
        req.io.respond({success:false, errorMessage: "session expirée"});
        req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
   }

    

})

app.io.route('transferVisitorToOtherOperator', function(req){

    console.log("transferVisitorToOtherOperator event");

    var newOperatorId = req.data.newOperatorId;
    var oldOperatorId = req.data.oldOperatorId;
    var oldRoomId = req.data.oldRoomId;
    var newOperatorFirstName = req.data.newOperatorFirstName;
    var newOperatorLastName = req.data.newOperatorLastName;
    var operatorPicture = req.data.operatorPicture;

    database.room.getRoomsAvailableWithOperator(newOperatorId, function(err, res){
        if(err) return console.log(err);
        if(!res[0]){
            req.io.respond({success: false});
            console.log("transferVisitorToOtherOperator respond false");
        }
        else{
           
            var idVisitor;
            var roomToAssign = res[0];
            var newRoomId = res[0]._id;
            database.room.getRoomFromId(newRoomId, function(err, room){
                if(err) return console.log(err)
                if(!room){
                    console.log("ERROR transferVisitorToOtherOperator: impossible to find a room with the id " + newRoomId)
                }
                else{

                    //we get the idVisitor from the oldRoom
                    database.room.getRoomFromId(oldRoomId, function(err, oldRoom){
                        if(err) return console.log(err);
                        if(!oldRoom){
                            console.log("ERROR transferVisitorToOtherOperator: cannot find a room with the id " + oldRoomId);
                        }
                        else{
                            if(req.session.website){

                                idVisitor = oldRoom.id_visitor;

                                //we set the operator assigned for the visitor
                                database.visitor.setOperatorAssigned(idVisitor, newOperatorId, function(err, res){
                                    if(err) return console.log(err);
                                })

                                //we set displayed the new room and modify the visitor associated
                                database.room.setDisplayed(newRoomId, function(err){
                                    if(err) return console.log(err);
                                    database.mongoose.model('User').updateCurrentNumberOfConversations(newOperatorId, function(updated, newNumberOfConversations){
                                        req.io.room(req.session.website).broadcast('updateCurrentNumberOfConversations', {operatorId: newOperatorId, newNumberOfConversations: newNumberOfConversations});                                        
                                    })
                                })
                                console.log("roomToAssign._id: " + roomToAssign._id + " idVisitor: " + idVisitor);
                                database.room.setVisitor(newRoomId, idVisitor, function(err){
                                    if(err) return console.log(err);
                                })
                                

                                database.room.setNotDisplayed(oldRoomId, function(err){
                                    if(err) return console.log(err);
                                    database.mongoose.model('User').updateCurrentNumberOfConversations(oldOperatorId, function(updated, newNumberOfConversations){
                                        req.io.room(req.session.website).broadcast('updateCurrentNumberOfConversations', {operatorId: oldOperatorId, newNumberOfConversations: newNumberOfConversations});
                                    })

                                })

                                database.room.setVisitor(oldRoomId, "", function(err, res){
                                    if(err) return console.log(err);
                                })

                                //Add an automatic message to the conversation to inform about the transfer
                                var date = new Date();
                                database.conversation.addMessageToConversationWithCallback(
                                    idVisitor, 
                                    oldRoomId, 
                                    "Visiteur transféré à " + newOperatorFirstName + " " + newOperatorLastName, 
                                    date, 
                                    false, 
                                    true, 
                                    "osef", 
                                    function(err){
                                        if(err) return console.log(err);
                                        //now we add the messages of the old conversation in the new one
                                        database.conversation.getMessagesOfConversation(idVisitor, oldRoom._id, function(err, res){
                                            if(err) return console.log(err);
                                            if(!res[0]){
                                                console.log("ERROR transferVisitorToOtherOperator: cannot find conversation with the id visitor " + idVisitor +" and the room id " + oldRoom._id);
                                            }
                                            else{
                                                var messagesToTransfer = new Array();
                                                async.forEach(res[0].messages, function(message, done) {
                                                    messagesToTransfer.push(message);
                                                    database.conversation.addMessageToConversationWithCallback(
                                                        idVisitor, 
                                                        newRoomId, 
                                                        message.content, 
                                                        message.date, 
                                                        message.toVisitor, 
                                                        message.isAutomaticMessage, 
                                                        message.operatorFirstName, 
                                                        function(err){
                                                            if(err) return console.log(err);
                                                            done();
                                                        }   
                                                    )                                                                                          
                                                                                               
                                                },
                                                function() {
                                                    console.log("transferVisitorToOtherOperator respond true");
                                                    req.io.respond({success: true});
                                                    req.io.room(oldRoomId).broadcast('transferToNewRoom', {
                                                        newRoomId: newRoomId, 
                                                        oldRoomId: oldRoomId, 
                                                        operatorFirstName: newOperatorFirstName, 
                                                        operatorLastName: newOperatorLastName, 
                                                        picture: "images/suzy.jpg", 
                                                        messagesToTransfer: messagesToTransfer
                                                    });

                                                })
                                            }
                                        })                                 

                                    }
                                );

                            }
                            else{
                                console.log("ERROR transferVisitorToOtherOperator: req.session.website undefined")
                                req.io.respond({success: false});
                                req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});

                            }
                            
                            
                        }
                    })

                    

                }
            })

        }
    })

});


app.io.route('setNewRoomForVisitor', function(req){

    console.log("setNewRoomForVisitor event");

    var oldRoomId = req.data.oldRoomId;
    var newRoomId = req.data.newRoomId;
    var messagesToTransfer = req.data.messagesToTransfer;

    //leave previous room and join the new one

    req.io.leave(oldRoomId);
    req.io.join(newRoomId);



    console.log("newRoomId: " + newRoomId);
    req.io.room(newRoomId).broadcast('TransferNewVisitor', {roomId: newRoomId, messagesToTransfer: messagesToTransfer});

    req.session.roomId = newRoomId;
    req.session.save();



})


//removes the roomId in session, unset 'operatorAssigned' in the db, unjoin socket from the room, set the room inactive in the db, unset the 'id_visitor' of the room in the db
// send an event to the operator to tell him the visitor closed the chat, and set the status of the visitor to 'alreadyCHatted' in the db
app.io.route('visitorClosingRoom', function(req){
    if(req.session.roomId){
        var roomId = req.session.roomId;
        
        delete req.session.roomId;
        req.session.save();

        var idVisitor;
        database.visitor.getVisitorFromSocketId(req.socket.id, function(err, res){
            if(err) return console.log(err);
            if(res){
                idVisitor = res.idVisitor;
                database.visitor.setOperatorAssigned(idVisitor, "", function(err, res){
                    if(err) return console.log(err);                
                })
                database.visitor.setAlreadyChatted(idVisitor, true, function(err, res){
                    if(err) return console.log(err);   
                    req.io.room(req.session.website).broadcast('updateVisitorStatus', {idVisitor: idVisitor, status: "alreadyChatted"});             
                });
                database.visitor.setIsChatting(idVisitor, false, function(err, res){
                    if(err) return console.log(err);                
                });                

                database.room.setVisitor(roomId, "", function(err, res){
                    if(err) return console.log(err);
                    if(!res){
                        console.log("ERROR visitorClisingRoom: impossible to find a room in the db with the id " + roomId);
                    }
                }) 
                database.room.setUnactive(roomId, function(err){
                    if(err) return console.log(err);
                })
                req.io.room(req.session.website).broadcast('updateVisitorStatus', {idVisitor: idVisitor, status: "alreadyChatted" });
                req.io.room(roomId).broadcast('setRoomInactive', { roomId: roomId});

                //separate the socket from the room
                req.io.leave(req.session.roomId);
            }
            else{
                console.log("ERROR visitorClosingRoom, impossible to find a visitor in the db with the socket id " + req.socket.id );
            }
        })
    }
});




//Check if the operator linked to the room is online. If he is online, then sends him the visitor's message, else, sends the visitor an error message.
app.io.route('sendMessageToOperator', function(req){


    var success = true;
    var errorMessage = "erreur lors de l'envoi du message";

    console.log('sendMessageToOperator event');

    //We get the roomId to get the operator_id associated to the room, to then check if his status is 'online'
    if(req.session.roomId){  
        database.room.getOperatorId(req.session.roomId, function(err, res){
            if(err){
                console.log(err);
                req.io.respond({success : false});

            }
            if(res[0]){
                var operatorId = res[0].id_operator;
                database.mongoose.model('User').getUserFromId(operatorId, function(err, operator){
                    if(err){                        
                        console.log(err);
                        req.io.respond({success : false});
                    }
                    if(operator){
                        
                        //add the message to the conversation in the database and send an event to the operator with the message
                        console.log("sendMessageEvent: respond true");
                        var date = new Date();
                        database.conversation.addMessageToConversation(req.session.id, req.session.roomId, req.data.message, date, false, false, operator.firstName);

                        
                        //we update the dateOfInactivity of the room, and we send an event to update it for the operator                                
                        database.room.setDateOfInactivity(req.session.roomId, date, function(err){
                            if(err) return console.log(err);
                            req.io.room(req.session.roomId).broadcast('updateRoomDateOfInactivity', {roomId: req.session.roomId, dateOfInactivity: date});            
                        })
                        

                        req.io.room(req.session.roomId).broadcast('newMessageToOperator', {
                            message: req.data.message,
                            roomId: req.session.roomId,
                            dateMessage: date.toString(),
                            operatorFirstName: operator.firstName
                        });
                        
                        req.io.respond({success : true});                                
                        
                    }
                    else{
                        console.log("ERROR sendMessageToOperator: cannot find an operator with id " + operatorId);
                    }
                })
            }   

        })

    }
    else{
        console.log("no roomId in session");
        req.io.respond({
            success : false,
            needToAssignRoom : true
        })      

    }
});


app.io.route('setRoomNotDisplayed', function(req){
    console.log('setRoomNotDisplayed event');

    if(req.session.website){
        console.log("room id: " + req.data.roomId);
        database.room.roomModel.findByIdAndUpdate(req.data.roomId, {is_displayed: false}, function(err, res){
            if(err) return console.log(err);
            if(!res){
                console.log("ERROR setRoomNotDisplayed: cannot find a room with the id " + req.data.roomId);
            }
            else{
                database.mongoose.model('User').updateCurrentNumberOfConversations(res.id_operator, function(updated, newNumberOfConversations){
                    if(err) return console.log(err);
                    if(updated){
                        req.io.room(req.session.website).broadcast('updateCurrentNumberOfConversations', {operatorId: res.id_operator, numberOfConversations: newNumberOfConversations});
                    }                             
                
                })
            }               
        });
    }
    else{
        console.log("ERROR setRoomNotDisplayed: req.session.website undefined");
        req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
    }

    

});

//send the message to the visitor if he didn't already close the chat window (i.e 'alreadyChatted' is false in the db)
app.io.route('sendMessageToVisitor', function(req){

    var roomId = req.data.roomId;
    database.room.getRoomFromId(roomId, function(err, res){
        if(err) return console.log(err);
        if(res){
            console.log("res:" + res);
            var idVisitor = res.id_visitor;
            //now we check if the visitor didn't close the chat window
            database.visitor.getVisitor(idVisitor, function(err, visitor){
                if(err) return console.log(err);
                if(visitor[0]){
                    if(visitor[0].alreadyChatted){
                        req.io.respond({success:false});
                    }
                    else{

                        
                        if(req.session.user_firstName){
                            var date = new Date();

                            database.conversation.addMessageToConversation(idVisitor, roomId, req.data.message, date, true, false, req.session.user_firstName);

                            //if the visitor's chat is not opened (i.e 'isChatting' is false, we need to set it to true and to emit an event to open the chat)
                            if(!visitor[0].isChatting){
                                database.visitor.setIsChatting(idVisitor, true, function(err, res){
                                    if(err) return console.log(err);
                                    req.io.room(req.session.website).broadcast('updateVisitorStatus', {idVisitor: idVisitor, status: "isChatting"});
                                    req.io.room(req.data.roomId).broadcast('addMessageFromOperator', {
                                        message: req.data.message, needToOpenChat : true, dateMessage: date, operatorFirstName: req.session.user_firstName, picture: "images/suzy.jpg"
                                    }); 
                                })
                                database.visitor.setFailedToAssignOperator(idVisitor, false, function(err, res){
                                    if(err) return console.log(err); 
                                })

                            }

                            else{
                                req.io.room(req.data.roomId).broadcast('addMessageFromOperator', {
                                    message: req.data.message, needToOpenChat: false, dateMessage: date, operatorFirstName: req.session.user_firstName
                                    }); 
                            }

                        }

                        else{
                            
                            req.socket.emit('redirectURL', {url: URL_LOGIN_PAGE});
                        }                  
                                       
                    }
                }
                else{
                    console.log("ERROR sendMessageToVisitor: cannot find a visitor in the db with the idVisitor " + idVisitor);
                }
            })            
        }
        else{
            console.log("ERROR sendMessageToVisitor: cannot find a room with the id");
        }        
    })    

});


app.io.route('getRoomData', function(req){

    console.log('getRoomData event');
    var roomId = req.data.roomId;
    var success;
    var room = {};
    database.room.getRoomFromId(roomId, function(err, res){
        if(err) {
            console.log(err);
            
        }
        else{
            if(res){
                room.is_active = res.is_active;
                room.dateOfInactivity = res.dateOfInactivity;
                room.is_displayed = res.is_displayed;

                //we get the messages of the conversation
                database.conversation.getMessagesOfConversation(res.id_visitor, res._id, function(err, conversation){
                    if(err){
                        req.io.respond({success: false});
                        console.log(err);
                    }
                    else{
                        room.messages = new Array();
                        room.messages = conversation.messages;

                        console.log("respond getRoomData: success: " + success + " room: " + room);
                        req.io.respond({success: true, room: room});

                    }

                })
                


            }
            else{
                req.io.respond({success: false});
            }
        }
    })
})

app.io.route('deleteSession', function(req){
    console.log("deleting sessino");
    req.session.destroy();
})

app.io.route('sendEmail', function(req){
    console.log("sendEmail event");

    var smtpTransport = nodemailer.createTransport("SMTP",{
        service: "Gmail",
        auth: {
            user: "visitor.bubbleweb@gmail.com",
            pass: "bubblewebVisitor"
        }
    });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: "visitor ✔ <visitor.bubbleweb@gmail.com>", // sender address
        to: "paul.mathieu@telecomnancy", // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world ✔", // plaintext body
        html: "<b>Hello world ✔</b>" // html body
    }

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + response.message);
        }

        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
    });

});


app.listen(8686);