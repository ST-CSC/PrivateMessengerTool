"use strict"
require('dotenv').config();
var axios = require('axios');
var cookie = require("cookie");
var cookieParser = require('cookie-parser');
var helper = require("./helper");
var colors = require('colors/safe');
var puppeteer = require('puppeteer');
var express = require('express')
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var exphbs  = require('express-handlebars');
var path = require("path");
var browser = {} , page = {};

function initQueue() { 
    return [
        {
            type: "StartService",
            data: "",
            running: false,
            done: false
        },
        {
            type: "LogIn",
            data:{username:"",password:""},
            running: false,
            done: false
        },
        {
            type: "ProfileSelect",
            data:{
                nrOfProfilesSelected:"",
                profiles:[],
                texts:{}
            },
            running: false,
            done:false
        }
    ];
}
var allQueue = {

}




var startVBrowser = (id)=>{
    return new Promise(
    async (resolve,response)=>{
        browser[id] = await puppeteer.launch({
            //slowMo : 200,
            headless: false,
            ignoreHTTPSErrors: true
        });
        page[id] = await browser[id].newPage();
        try{
            await page[id].goto('https://www.private-messenger.com', {waitUntil: 'networkidle2'});
        }catch{
            console.info(colors.red("No internet connection!!"));
            console.info(colors.red("Retrying..."));
            await page[id].waitFor(3000);
            await browser[id].close();
            startVBrowser(id);
        }
        try{
            
            await page[id].waitForSelector("button[type='submit']", { timeout: 5000 });
            resolve();
        }catch{
            await browser[id].close();
            startVBrowser(id);
        }
    });
    
}
var maxConection = ()=>{
    return new Promise(
    async (resolve, reject)=>{
        let nrOfcon = Object.keys(allQueue).length ;
        if(nrOfcon != 0){
            let maxConections ;
            try{
                let res = await axios.get(`${process.env.EXT_SERVER}/settings/maxConnections`);
                maxConections = parseInt(res.data);
            }catch{maxConections = parseInt(process.env.MAX_CONECTIONS) || 1 ;}
            if(maxConections <= nrOfcon){
                reject();
            }else{
                resolve();
            }
        }else{
            resolve();
        }
    });

}









app.engine('.hbs', exphbs({extname: '.hbs' , defaultLayout: false}));
app.set('view engine', '.hbs');
app.use('/public' , express.static(path.join(__dirname,'public')));
app.use(cookieParser());

app.get('/', function (req, res) {
    if(typeof(req.cookies.id) == "undefined"){ 
        //render new
        maxConection().then(()=>{
            let id = helper.makeid(32);
            allQueue[id]= {};
            allQueue[id].initQueue = initQueue();
            res.cookie('id',id, {httpOnly: true ,maxAge: new Date().getTime() + 900000 });
            res.render("loading");
        },()=>{
            res.redirect("/forbidden");
        }).catch(()=>{
            //redirect to Error page;
        });
        
    }else{
        if(typeof(allQueue[req.cookies.id]) != "undefined"){   
            let id = req.cookies.id;
            for (let i = 0; i < allQueue[id].initQueue.length; i++) {
                const q = allQueue[id].initQueue[i];
                if(q.done == false){
                    switch (q.type) {
                        case "StartService":
                            res.render("loading");
                            break;
                    
                        case "LogIn":
                            res.render("login");
                            break;
                    
                        default:
                            break;
                    }
                    break;
                }
            }   
        }else{
            //render new
            maxConection().then(()=>{
                let id = helper.makeid(32);
                allQueue[id]= {};
                allQueue[id].initQueue = initQueue();
                res.cookie('id',id, {httpOnly: true ,maxAge: new Date().getTime() + 900000 });
                res.render("loading");
            },()=>{
                res.redirect("/forbidden");
            }).catch(()=>{
                //redirect to Error page;
            });
        }
    }
});

app.get('/forbidden', function (req, res) {
    res.send("Forbidden!\nContact Administrator...");
});
app.get('/settings/maxConnections', function (req, res) {
    res.send("3");
});






server.listen(process.env.PORT || 3000 , ()=>{
    console.info(colors.green( `Tool Started on port ${server.address().port}`));
});


io.on('connect', (client)=>{
    client.on("StartService",()=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        console.log(allQueue);
        if(allQueue[id].initQueue[0].running == false){
            allQueue[id].initQueue[0].running = true;
            startVBrowser(cookie.parse(client.handshake.headers.cookie).id).then(()=>{
                allQueue[id].initQueue[0].done = true;
                client.emit("StartService-done");
            });
        }
        
    });
}); 








