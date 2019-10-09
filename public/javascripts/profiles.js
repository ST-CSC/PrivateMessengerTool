const socket = io('http://localhost:3000');
socket.on('connect', () => {
    console.log("Socket connection established");
    socket.emit("ProfileSelect");
    setInterval(function(){
        socket.emit("alive");
    }, 6000);
});
socket.on("ProfileSelect" ,(data) =>{
    console.log(data);
    let select = [
        document.querySelector("#profile1"),
        document.querySelector("#profile2"),
        document.querySelector("#profile3"),
        document.querySelector("#profile4")
    ];
    select.forEach((e,i) => {
        e.innerHTML = "";
        if(typeof(data.sprofiles[i]) == "undefined" ){
            e.disabled = false;
            document.querySelector(`#button-p${i+1}`).disabled = false;
            document.querySelector(`#button-p${i+1} i`).className = "fas fa-plus-circle text-success";
            let option = document.createElement("option");
            option.text = `Select Profile No.${i+1}`;
            option.value = "0";
            e.appendChild(option);
            data.aprofiles.forEach((p)=>{
                let option = document.createElement("option");
                option.text = p;
                option.value = p;
                e.appendChild(option);
            });
        }else{
            document.querySelector(`#button-p${i+1}`).disabled = false;
            document.querySelector(`#button-p${i+1} i`).className = "fas fa-minus-circle text-danger";
            let option = document.createElement("option");
            option.text = data.sprofiles[i];
            option.value = data.sprofiles[i];
            option.selected = true;
            e.appendChild(option);

            data.aprofiles.forEach((p)=>{
                
            });
        }
        
    });
});




//fas fa-minus-circle text-danger
//fas fa-plus-circle text-success
//fas fa-spinner fa-spin