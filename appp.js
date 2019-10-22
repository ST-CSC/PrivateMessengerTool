"use strict"
require('dotenv').config();
const axios = require('axios');
const cookie = require("cookie");
const cookieParser = require('cookie-parser');
const helper = require("./helper");
const colors = require('colors/safe');
const puppeteer = require('puppeteer');
const express = require('express')
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);                    
const exphbs  = require('express-handlebars');
const bodyParser = require('body-parser')
const path = require("path");
const md5 = require('md5');
const db = require('mysql-promise')();
const redis = require('redis').createClient();


db.configure({
	"host": "192.168.88.10",
	"user": "dardanisufi",
	"password": "D4rd4n.!$ufI",
	"database": "pmh_db"
});

const eventEhandler = new (class EventHandler extends require('events') {})();

const sessions = {};

let awaitEvent = async (event , thisID)=>{
    return new Promise(async (resolve , reject)=>{
        eventEhandler.on(event , (id)=>{
            resolve();
        });
    });
}


let startVBrowser = async (id)=>{
    return new Promise(
    async (resolve,response)=>{

        sessions[id].vbrowser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            //slowMo : 200,
            headless: false,
            ignoreHTTPSErrors: true
        });
        sessions[id].vbrowser.busy = true;

        sessions[id].vbrowser.on("disconnected", async (msg )=>{
            delete sessions[id];
        });
        sessions[id].page = await sessions[id].vbrowser.newPage();
        try{
            await sessions[id].page.goto('https://www.private-messenger.com', {waitUntil: 'networkidle2'});
            try{
            
                await sessions[id].page.waitForSelector("button[type='submit']", { timeout: 5000 });
                resolve(id);
            }catch{
                await sessions[id].vbrowser.close();
                await startVBrowser(id);
                resolve(id);
            }
        }catch{
            console.info(colors.red("Retrying..."));
            await sessions[id].page.waitFor(3000);
            await sessions[id].vbrowser.close();
            await startVBrowser(id);
            resolve(id);
        }
        
    });
    
}

let startService = async (id)=>{
    await startVBrowser(id);
    await awaitEvent(`PinSelect`, id);
    await sessions[id].vbrowser.close();
}



app.engine('.hbs', exphbs({extname: '.hbs' , defaultLayout: false}));
app.set('view engine', '.hbs');
app.use('/public' , express.static(path.join(__dirname,'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res){
    if(typeof(req.cookies.id) != "undefined"){
        let id = req.cookies.id;
        if(typeof(sessions[id]) != "undefined"){
            //existing session
            startService(id);
        }else{
            res.render("login"); 
        }
    }else{
        res.render("login"); 
    }
});

app.post('/', function (req, res){
    console.log(req.body)
    if(typeof(req.body.username) != "undefined" && typeof(req.body.password) != "undefined"){
        db.query(`SELECT id,name FROM users WHERE username='${req.body.username}' AND password='${md5(req.body.password)}'` ).then(function (rows) {
            if(rows[0].length != 0){
                let id = helper.makeid(32);
                sessions[id]={};
                sessions[id] = new helper.Session(rows[0][0].name , rows[0][0].id);
                console.log(sessions[id])
                res.cookie('id',id, {httpOnly: true ,maxAge: new Date().getTime() + 900000 });
                res.redirect("/");
            }
        }).catch(()=>{res.redirect("/")})
    }else{
        res.redirect("/")
    }
});


app.get('/test', function (req, res){
    res.render("messenger");
});
app.get('/test2', function (req, res){
    eventEhandler.emit("PinSelect");
    res.send("ok");
});



server.listen(process.env.PORT || 3000 , ()=>{
    console.info(colors.green( `Tool Started on port ${server.address().port}`));
});

io.on('connect', (client)=>{
    let id = cookie.parse(client.handshake.headers.cookie).id;
    if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
        sessions[id].socketID = client.id;
    }
    
})


