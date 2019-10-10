const origin = window.location.origin;
const socket = io(origin);
socket.on('connect', () => {
    console.log("Socket connection established");
    socket.emit("ProfileSelect");
    setInterval(function(){
        socket.emit("alive");
    }, 6000);
});
let select = [
    document.querySelector("#profile1"),
    document.querySelector("#profile2"),
    document.querySelector("#profile3"),
    document.querySelector("#profile4")
];
let buttons = [
    document.querySelector(`#button-p1`),
    document.querySelector(`#button-p2`),
    document.querySelector(`#button-p3`),
    document.querySelector(`#button-p4`)
];
socket.on("ProfileSelect" ,(data) =>{
    console.log(data);
    select.forEach((e,i) => {
        e.innerHTML = "";
        if(typeof(data.sprofiles[i]) == "undefined" ){
            e.disabled = false;
            buttons[i].disabled = false;
            buttons[i].setAttribute("action" , "grab");
            buttons[i].querySelector(`i`).className = "fas fa-plus-circle text-success";
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
            buttons[i].disabled = false;
            buttons[i].setAttribute("action" , "release");
            buttons[i].querySelector(`i`).className = "fas fa-minus-circle text-danger";
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
let buttonaction = (e)=>{
    switch (e.getAttribute("action")) {
        case "grab":
            socket.emit("ProfileSelect" , {action:"grab",name:e.parentElement.parentElement.querySelector("select").value});
            console.log({action:"grab",name:e.parentElement.parentElement.querySelector("select").value})
            break;
        case "release":
            socket.emit("ProfileSelect" , {action:"release",name:e.parentElement.parentElement.querySelector("select").value});
            break;
    
        default:
            break;
    }
    for (let i = 0; i < 4; i++) {
        buttons[i].setAttribute("action" , "waiting");
        buttons[i].disabled = true;
        buttons[i].querySelector(`i`).className = "fas fa-spinner fa-spin";
        select[i].disabled = true;              
    }
}




//fas fa-minus-circle text-danger
//fas fa-plus-circle text-success
//fas fa-spinner fa-spin