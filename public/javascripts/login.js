const origin = window.location.origin;
const socket = io(origin);
socket.on('connect', () => {
    console.log("Socket connection established");
    socket.emit("LogIn");
    setInterval(function(){
        socket.emit("alive");
    }, 60000);
});

socket.on("LogIn" ,(res)=>{
    switch (res) {
        case "success":
            window.location = origin;
            break;
        case "fail":
            document.querySelector("#loading").style.visibility = "hidden";
            document.querySelector("#username").disabled = false;
            document.querySelector("#password").disabled = false;
            document.querySelector("button").disabled = false;
            alert("Username or Password is wrong!");
            break;       
        default:
            console.log(res);
            document.querySelector("#username").value = res.username
            document.querySelector("#password").value = res.password
            document.querySelector("#loading").style.visibility = "visible";
            document.querySelector("#username").disabled = true;
            document.querySelector("#password").disabled = true;
            document.querySelector("button").disabled = true;
            break;
    }   
})

login = function(){
    document.querySelector("button").disabled = true;
    let username = document.querySelector("#username").value;
    let password = document.querySelector("#password").value;
    let data = {
        username:username.trim(),
        password:password.trim()
    }
    if(username != "" && password != ""){
        socket.emit("LogIn" , data);
        document.querySelector("#loading").style.visibility = "visible";
        document.querySelector("#username").disabled = true;
        document.querySelector("#password").disabled = true;
    }else{
        alert("Enter Username and Password!");
    }
    
}

