const origin = window.location.origin;
const socket = io(origin);
socket.on('connect', () => {
    console.log("Socket connection established");
    socket.emit("LogIn");
    setInterval(function(){
        socket.emit("alive");
    }, 60000);
});

socket.on("LogIn-success" ,()=>{
    window.location = origin;
})
socket.on("LogIn-fail" ,()=>{
    document.querySelector("#loading").style.visibility = "hidden";
    document.querySelector("#username").disabled = false;
    document.querySelector("#password").disabled = false;
    alert("Username or Password is wrong!");
})

login = function(){
    let username = document.querySelector("#username").value;
    let password = document.querySelector("#password").value;
    let data = {
        username:username,
        password:password
    }
    if(username.trim() != "" && password.trim() != ""){
        socket.emit("LogIn" , data);
        document.querySelector("#loading").style.visibility = "visible";
        document.querySelector("#username").disabled = true;
        document.querySelector("#password").disabled = true;
    }else{
        alert("Enter Username and Password!");
    }
    
}

