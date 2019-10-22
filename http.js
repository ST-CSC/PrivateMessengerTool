"use strict"
const colors = require('colors/safe');
const express = require('express')
const app = express();
const server = require('http').createServer(app);

function init(port){
    server.listen(port, ()=>{
        console.info(colors.green( `HTTP server started on port ${server.address().port}`));
    });
}

module.exports.app = app;
module.exports.init = init;
module.exports.server = server;

