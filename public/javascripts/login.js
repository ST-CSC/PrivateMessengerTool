const socket = io('http://192.168.88.4:3000');
socket.on('connect', () => {
    console.log("Socket connection established");
});

socket.on("success-login" ,()=>{
    window.location.replace("http://192.168.88.4:3000");
})
socket.on("fail-login" ,()=>{
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
        socket.emit("try-login" , data);
        document.querySelector("#loading").style.visibility = "visible";
        document.querySelector("#username").disabled = true;
        document.querySelector("#password").disabled = true;
    }else{
        alert("Enter Username and Password!");
    }
    
}
