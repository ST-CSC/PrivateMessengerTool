const origin = window.location.origin;
const socket = io(origin);
socket.on('connect', () => {
    console.log("Socket connection established");
    setInterval(function(){
        socket.emit("alive");
    }, 60000);
    socket.emit("PinSelect");
});
socket.on("PinSelect" ,(data)=>{
    if(data != "success"){
        if(!data.runing){
            data.pins.forEach((pin,i)=>{
                let option = document.createElement("option");
                option.text = pin.pin;
                option.value = pin.id;
                document.getElementById("pins").appendChild(option);
            });
            document.getElementById("pins").disabled = false;
            document.getElementsByTagName("button")[0].disabled = false;
            document.getElementById("loading").style.visibility = "hidden";
        }else{
            let option = document.createElement("option");
            option.text = data.pin;
            option.value = data.id;
            document.getElementById("pins").appendChild(option);
        }
    }else{
        window.location.reload();
    }
})

function submitF() {
    document.getElementById("pins").disabled = true;
    document.getElementsByTagName("button")[0].disabled = true;
    document.getElementById("loading").style.visibility = "visible";
    socket.emit("PinSelect" , document.getElementById("pins").value)
}

