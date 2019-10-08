const socket = io('http://localhost:3000');
socket.on('connect', () => {
    console.log("Socket connection established");
    socket.emit("ProfileSelect");
    setInterval(function(){
        socket.emit(alive);
    }, 6000);
});
socket.on("ProfileSelect" ,(data) =>{
    console.log(data);

});





//fas fa-minus-circle text-danger
//fas fa-plus-circle text-success
//fas fa-spinner fa-spin