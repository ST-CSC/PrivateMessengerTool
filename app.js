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
var sessions = {};

function queue() { 
    return [
        {
            type: "StartService",
            data: "",
            running: false,
            done: false
        },
        {
            type: "LogIn",
            data:{},
            running: false,
            done: false
        },
        {
            type: "ProfileSelect",
            data:{
                SProfiles:{},
                AProfiles:[],
            },
            running: false,
            done:false
        },
    ];
}
var startVBrowser = (id)=>{
    return new Promise(
    async (resolve,response)=>{
        sessions[id].vbrowser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            //slowMo : 200,
            headless: false,
            ignoreHTTPSErrors: true
        });
        sessions[id].vbrowser.EXTID = 
        id;

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
var maxConection = ()=>{
    return new Promise(
    async (resolve, reject)=>{
        let nrOfcon = Object.keys(sessions).length ;
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
var login = function(data , id){
    return new Promise(
        async (resolve , reject) => {
            let allowlogin = "";
            
            try{
                let res = await axios.get(`${process.env.EXT_SERVER}/allowLogin`);
                allowlogin = res.data;
            }catch{
                allowlogin = "1"
            }
            if(allowlogin == "1"){
                await sessions[id].page.click("input#username");
                await sessions[id].page.keyboard.type(data.username);
                await sessions[id].page.click("input#password");
                await sessions[id].page.keyboard.type(data.password);
                await sessions[id].page.click("button[type='submit']");
                try{
                    await sessions[id].page.waitForSelector("button[aria-label='Exit']", { timeout: 15000 });
                    //await page.click("button[aria-label='Exit']");
                    resolve(data);
                }catch{
                    await sessions[id].page.evaluate(()=>{
                        document.querySelector("input#username").value = "";
                        document.querySelector("input#password").value = "";
                    });
                    reject();
                }
            }else{
                reject();
            }
        }
    );
}
var getProfiles = function(id){
    return new Promise(
    async (resolve,reject)=>{
        await sessions[id].page.click("a[aria-label='Dashboard']");
        await sessions[id].page.waitForSelector("div[ng-if='availableProfiles.length']", { timeout: 5000 });
        let res = await sessions[id].page.evaluate(()=>{
            let aprofiles = [];
            let sprofiles = [];
            let elements = document.querySelectorAll("[ng-if='availableProfiles.length'] button");
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                aprofiles.push(element.getAttribute("aria-label").split("\n")[0]);
                
            }
            elements = document.querySelectorAll("[ng-if='registeredProfiles.length'] button");
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                sprofiles.push(element.getAttribute("aria-label").split("\n")[0]);
                
            }
            return {aprofiles,sprofiles};
        }); 
        resolve(res);
    }) 
}








app.engine('.hbs', exphbs({extname: '.hbs' , defaultLayout: false}));
app.set('view engine', '.hbs');
app.use('/public' , express.static(path.join(__dirname,'public')));
app.use(cookieParser());

app.get('/', function (req, res) {
    if(typeof(req.cookies.id) == "undefined" || (typeof(req.cookies.id) != "undefined" && typeof(sessions[req.cookies.id]) == "undefined")){ 
        //render new
        maxConection().then(()=>{
            let id = helper.makeid(32);
            sessions[id]= {};
            sessions[id].lastseen = new Date().getTime();
            sessions[id].queue = queue();
            res.cookie('id',id, {httpOnly: true ,maxAge: new Date().getTime() + 900000 });
            res.render("loading");
        },()=>{
            res.send("Forbidden!\nContact Administrator...");
        }).catch(()=>{
            //redirect to Error page;
        });
        
    }else{
        //existing session
        let id = req.cookies.id;
        for (let i = 0; i < sessions[id].queue.length; i++) {
            const q = sessions[id].queue[i];
            if(q.done == false){
                switch (q.type) {
                    case "StartService":
                        res.render("loading");
                        break;
                
                    case "LogIn":
                        res.render("login");
                        break;
                    
                    case "ProfileSelect":
                        res.render("profiles");
                        break;

                    default:
                        res.send("NOOOOOOO");
                        break;
                }
                break;
            }
        } 
    }
});

//ext server simulation
app.get('/settings/maxConnections', function (req, res) {
    res.send("3");
});
app.get('/allowLogin', function (req, res) {
    res.send("1");
});
////

app.get("/hi" , function(req , res){
    getProfiles(req.cookies.id).then((result)=>{
        res.send(result);
    })
});






server.listen(process.env.PORT || 3000 , ()=>{
    console.info(colors.green( `Tool Started on port ${server.address().port}`));
});


io.on('connect', (client)=>{
    let id = cookie.parse(client.handshake.headers.cookie).id;
    if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
        sessions[id].socketID = client.id;
    }
    client.on("StartService",()=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            if(sessions[id].queue[0].running == false){
                sessions[id].queue[0].running = true;
                startVBrowser(cookie.parse(client.handshake.headers.cookie).id).then((id)=>{
                    sessions[id].queue[0].done = true;
                    sessions[id].queue[0].running = false;
                    io.to(sessions[id].socketID).emit("StartService-success");
                });
            }
        }
    });
    client.on("LogIn" , (data)=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            if(typeof(data) != "undefined" && sessions[id].queue[1].running == false){
                sessions[id].queue[1].running = true;
                login(data , id).then((data)=>{
                    sessions[id].queue[1].running = false;
                    sessions[id].queue[1].done = true;
                    sessions[id].queue[1].data = data;
                    io.to(sessions[id].socketID).emit("LogIn-success");
                },()=>{
                    sessions[id].queue[1].running = false;
                    io.to(sessions[id].socketID).emit("LogIn-fail");
                })
            }else if(sessions[id].queue[1].running == true){
                io.to(sessions[id].socketID).emit("LogIn-running");
            }
        }
    });
    client.on("ProfileSelect" , (data)=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            if(typeof(data) != "undefined" && sessions[id].queue[2].running == false){
                sessions[id].queue[2].running = true;
                getProfiles(req.cookies.id).then((result)=>{
                    io.to(sessions[id].socketID).emit("ProfileSelect-status" , result);
                })
            }else if(sessions[id].queue[2].running == true){
                io.to(sessions[id].socketID).emit("ProfileSelect-running");
            }
        }
    });
    client.on("alive" , ()=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            sessions[id].lastseen = new Date().getTime();
        }
    })
}); 


//check inactive
setInterval(async function(){
    let ids = Object.keys(sessions);

    for (let i = 0; i < ids.length; i++) {
        let id = ids[i];
        if(new Date().getTime() - sessions[id].lastseen > 600000){
            try{
                await sessions[id].page.waitForSelector("button[aria-label='Exit']", { timeout: 3000 });
                await sessions[id].page.click("button[aria-label='Exit']");
            }catch{}
            sessions[id].vbrowser.close();
            delete sessions[id];
        }   
    }
}, 60000);








