"use strict"
require('dotenv').config();
const http = require("./http");
const router = require("./router");
const socket = require("./socket");

let users = {};

http.init(process.env.PORT || 3000 );
http.app.use(router);

socket.init();





module.exports.server = http.server