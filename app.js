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

db.configure({
	"host": "192.168.88.10",
	"user": "dardanisufi",
	"password": "D4rd4n.!$ufI",
	"database": "pmh_db"
});

const sessions = {};




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
let login = function(data , id){
    return new Promise(
        async (resolve , reject) => { 
        await sessions[id].page.click("input#username");
        await sessions[id].page.keyboard.type(data.username);
        await sessions[id].page.click("input#password");
        await sessions[id].page.keyboard.type(data.password);
        await sessions[id].page.click("button[type='submit']");
        try{
            await sessions[id].page.waitForSelector("button[aria-label='Exit']", { timeout: 15000 });
            resolve();
        }catch{
            await sessions[id].page.evaluate(()=>{
                document.querySelector("input#username").value = "";
                document.querySelector("input#password").value = "";
            });
            reject();
        }
        }
    );
}
let getProfiles = function(id){
    return new Promise(
    async (resolve,reject)=>{
        await sessions[id].page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
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
        sessions[id].profiles = sprofiles;
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
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res){
    if(typeof(req.cookies.id) != "undefined"){
        let id = req.cookies.id;
        if(typeof(sessions[id]) != "undefined"){
            //existing session
            if(sessions[id].prepared == false){
                switch (sessions[id].queue[0].type) {
                    case "PinSelect":
                        res.render("pins");
                        break;
                    case "ProfileSelect":
                        res.render("profiles");
                        break;
                
                    default:
                        break;
                }
            }else{

            }
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



server.listen(process.env.PORT || 3000 , ()=>{
    console.info(colors.green( `Tool Started on port ${server.address().port}`));
});

io.on('connect', (client)=>{
    let id = cookie.parse(client.handshake.headers.cookie).id;
    if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
        sessions[id].socketID = client.id;
    }
    client.on("PinSelect" , (data)=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            if(typeof(data) == "undefined"){
                if(sessions[id].selectedpin.pin == null){
                    db.query(`SELECT id,pin FROM pins WHERE users_id='${sessions[id].user.userid}'` ).then(function (rows) {
                        io.to(sessions[id].socketID).emit("PinSelect",{runing:false ,name:sessions[id].user.username , pins:rows[0]});
                    });
                }else{
                    io.to(sessions[id].socketID).emit("PinSelect",{runing:true , pin:sessions[id].selectedpin.pin, id:sessions[id].selectedpin.pinid});
                }
            }else{
                db.query(`SELECT id,pin,pass FROM pins WHERE users_id='${sessions[id].user.userid}' AND id=${data}` ).then(function (rows) {
                    if(rows[0].length != 0){
                        sessions[id].selectedpin.pin = rows[0][0].pin.trim();
                        sessions[id].selectedpin.pinid = rows[0][0].id.trim();
                        sessions[id].selectedpin.pinpass = rows[0][0].pass.trim();
                        startVBrowser(id).then((id)=>{
                            let data = {username:sessions[id].selectedpin.pin , password:sessions[id].selectedpin.pinpass}
                            return login(data , id);
                        }).then(()=>{
                            sessions[id].queue.shift();
                            io.to(sessions[id].socketID).emit("PinSelect" , "success");
                        });
                    }
                    
                });
            }
        }
    });
    client.on("ProfileSelect" , (data)=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            if(typeof(data) == "undefined" && sessions[id].queue[0].type == "ProfileSelect" && sessions[id].queue[0].runing == false){
                sessions[id].queue[0].running = true;
                getProfiles(id).then((data)=>{
                    io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                    sessions[id].queue[0].running = false;
                })
            }else if(typeof(data) != "undefined" && sessions[id].queue[0].type == "ProfileSelect"){
                sessions[id].queue[0].running = true;
                switch (data.action) {
                    case "grab":
                        grabProfile(id , data.name).then(()=>{
                            getProfiles(id).then((data)=>{
                                io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                                sessions[id].queue[0].running = false;
                                console.log("1");
                            })
                        },()=>{
                            getProfiles(id).then((data)=>{
                                io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                                sessions[id].queue[0].running = false;
                                console.log("2");
                            })
                        })
                        break;
                    case "release":
                        releaseProfile(id , data.name).then(()=>{
                            getProfiles(id).then((data)=>{
                                io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                                sessions[id].queue[0].running = false;
                                console.log("1");
                            })
                        },()=>{
                            getProfiles(id).then((data)=>{
                                io.to(sessions[id].socketID).emit("ProfileSelect" , data);
                                sessions[id].queue[0].running = false;
                                console.log("2");
                            })
                        })
                        break;
                
                    default:
                        break;
                }
                console.log(data);
            }else if(sessions[id].queue[0].running == true  && sessions[id].queue[0].type == "ProfileSelect"){
                io.to(sessions[id].socketID).emit("ProfileSelect", {aprofiles:[],sprofiles:sessions[id].profiles});
            }
        }
    });

    client.on("alive" , ()=>{
        let id = cookie.parse(client.handshake.headers.cookie).id;
        if(typeof(id) != "undefined" && typeof(sessions[id]) != "undefined"){
            sessions[id].lastseen = new Date().getTime();
        }
    })
})


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