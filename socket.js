"use strict"
const server =  require("./app.js").server;
const colors = require('colors/safe');

const io = require('socket.io')(server); 


function init(){
    console.info(colors.green( `Socket server started!`));
    io.on('connect', (client)=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            sessions[id].socketID = client.id;
        }
        
    });
    return io;
}


module.exports.init = init;