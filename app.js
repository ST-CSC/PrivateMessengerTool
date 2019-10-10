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
const path = require("path");
const sessions = {};

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
                SProfiles:[],
            },
            running: false,
            done:false
        },
    ];
}
let startVBrowser = (id)=>{
    return new Promise(
    async (resolve,response)=>{

        sessions[id].vbrowser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            //slowMo : 200,
            headless: false,
            ignoreHTTPSErrors: true
        });


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
let maxConection = ()=>{
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
let login = function(data , id){
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
                    resolve();
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
let getProfiles = function(id){
    return new Promise(
    async (resolve,reject)=>{
        await sessions[id].page.click("a[aria-label='Dashboard']");
        let res;
        let aprofiles = [];
        let sprofiles = [];
        try{
            await sessions[id].page.waitForSelector("[ng-if='availableProfiles.length'] button", { timeout: 1000 });
            aprofiles = await sessions[id].page.evaluate(()=>{
                let aprofiles = [];
                let elements = document.querySelectorAll("[ng-if='availableProfiles.length'] button");
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    aprofiles.push(element.getAttribute("aria-label").split("\n")[0]);
                    
                }
                return aprofiles;
            });
        }catch{
            //no aprofiles
        }

        try{
            await sessions[id].page.waitForSelector("[ng-if='registeredProfiles.length'] button", { timeout: 1000 });
            sprofiles = await sessions[id].page.evaluate(()=>{
                let sprofiles = [];
                let elements = document.querySelectorAll("[ng-if='registeredProfiles.length'] button");
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    sprofiles.push(element.getAttribute("aria-label").split("\n")[0]);
                    
                }
                return sprofiles;
            });
        }catch{
            //no sprofiles
        } 
        
        sessions[id].queue[2].data.SProfiles = sprofiles;
        resolve({aprofiles,sprofiles});
    }) 
}
let grabProfile = function(id , name){
    return new Promise(
    async (resolve,reject)=>{
        try{
            await sessions[id].page.click("a[aria-label='Dashboard']");
            await sessions[id].page.waitForSelector("[ng-if='availableProfiles.length'] button", { timeout: 5000 });
            await sessions[id].page.click(`div[ng-if="availableProfiles.length"] button[aria-label^="${name}"]`);
            await sessions[id].page.waitForXPath(`//md-content/h4[text()='${name}']`, { timeout: 5000 } );
            await sessions[id].page.evaluate(()=>{
                document.querySelectorAll('button[ng-click="showProfile()"]').forEach(e=>{
                    let name = e.parentNode.querySelector("h4").innerText.trim();
                    e.setAttribute("pname",name);
                })
                return ;
            });
            resolve();
        }catch{
            await sessions[id].page.goto('https://www.private-messenger.com', {waitUntil: 'networkidle2'});
            reject();
        }
        
    }) 
}
let releaseProfile = function(id , name){
    return new Promise(
    async (resolve,reject)=>{
        
            await sessions[id].page.click("a[aria-label='Dashboard']");
            await sessions[id].page.waitForSelector("[ng-if='registeredProfiles.length'] button", { timeout: 5000 });
            await sessions[id].page.click(`[ng-if="registeredProfiles.length"] button[aria-label^="${name}"]`);
            await sessions[id].page.waitForSelector(`[ng-if="registeredProfiles.length"] button[aria-label^="${name}"]`, { timeout: 5000 });
            resolve();

        
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
                    io.to(sessions[id].socketID).emit("StartService");
                });
            }
        }
    });
    client.on("LogIn" , (data)=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            if(typeof(data) != "undefined" && sessions[id].queue[1].running == false){
                sessions[id].queue[1].running = true;
                sessions[id].queue[1].data = data;
                login(data , id).then(()=>{
                    sessions[id].queue[1].running = false;
                    sessions[id].queue[1].done = true;
                    io.to(sessions[id].socketID).emit("LogIn" , "success");
                },()=>{
                    sessions[id].queue[1].running = false;
                    io.to(sessions[id].socketID).emit("LogIn" , "fail");
                })
            }else if(sessions[id].queue[1].running == true){
                io.to(sessions[id].socketID).emit("LogIn", sessions[id].queue[1].data);
            }
        }
    });
    client.on("ProfileSelect" , (data)=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            if(typeof(data) == "undefined" && sessions[id].queue[2].running == false){
                console.log("OK");
                sessions[id].queue[2].running = true;
                getProfiles(id).then((data)=>{
                    io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                    sessions[id].queue[2].running = false;
                })
            }else if(typeof(data) != "undefined"){
                sessions[id].queue[2].running = true;
                switch (data.action) {
                    case "grab":
                        grabProfile(id , data.name).then(()=>{
                            getProfiles(id).then((data)=>{
                                io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                                sessions[id].queue[2].running = false;
                                console.log("1");
                            })
                        },()=>{
                            getProfiles(id).then((data)=>{
                                io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                                sessions[id].queue[2].running = false;
                                console.log("2");
                            })
                        })
                        break;
                    case "release":
                        releaseProfile(id , data.name).then(()=>{
                            getProfiles(id).then((data)=>{
                                io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                                sessions[id].queue[2].running = false;
                                console.log("1");
                            })
                        },()=>{
                            getProfiles(id).then((data)=>{
                                io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                                sessions[id].queue[2].running = false;
                                console.log("2");
                            })
                        })
                        break;
                
                    default:
                        break;
                }
                console.log(data);
            }else if(sessions[id].queue[2].running == true){
                io.to(sessions[id].socketID).emit("ProfileSelect", {aprofiles:[],sprofiles:sessions[id].queue[2].data.SProfiles});
            }
        }
    });

    //alive
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








