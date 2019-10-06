var selected_profiles = 0;
const socket = io('http://localhost:3000');
socket.on('connect', () => {
    console.log("Socket connection established");
    socket.emit("ProfileSelect");
    setInterval(function(){
        socket.emit(alive);
    }, 6000);
});
socket.on("all-profiless-success" ,(data) =>{
    console.log(data);
    data.forEach(profile => {
        var node = document.createElement("option");  
        node.value = profile;
        node.innerText = profile;
        document.querySelector(`#profile${selected_profiles+1}`).append(node);
        
    });
    document.querySelector(`#profile${selected_profiles+1}`).disabled = false;
    document.querySelector(`#button-p${selected_profiles+1}`).disabled = false;
    document.querySelector(`#button-p${selected_profiles+1}`).setAttribute("status" , "add");
    document.querySelector(`#button-p${selected_profiles+1} i`).className="fas fa-plus-circle text-success";
});
socket.on("get-profile-success", ()=>{
    document.querySelector(`#profile${selected_profiles+1}`).disabled = true;
    document.querySelector(`#button-p${selected_profiles+1}`).disabled = true;
    document.querySelector(`#button-p${selected_profiles+1} i`).className="fas fa-minus-circle text-danger";
    selected_profiles += 1;
    if(selected_profiles < 4)
        socket.emit("get-all-profiles");

})
var buttons = document.querySelectorAll("button[status]");
for (let i = 0; i < buttons.length; i++) {
    const e = buttons[i];
    e.onclick = () => {
        console.log("you selected " + document.querySelector(`#profile${selected_profiles+1}`).value);
        document.querySelector(`#profile${selected_profiles+1}`).disabled = false;
        document.querySelector(`#button-p${selected_profiles+1} i`).className="fas fa-spinner fa-spin";
        document.querySelector(`#button-p${selected_profiles+1}`).setAttribute("status" , "rem");
        document.querySelector(`#button-p${selected_profiles+1}`).disabled = true;
        socket.emit("get-profile" , document.querySelector(`#profile${selected_profiles+1}`).value);
    };
}

var gonext = ()=>{
    var err = [];
    var text = "The text off profiles : ";
    for (let i = 1; i <= selected_profiles; i++) {
        if(document.querySelector(`#text-p${i}`).value.trim().length < 35)
            err.push(i);
    }
    for (let i = 0; i < err.length; i++) {
        const e = err[i];
        text += "-" + e + "-";
    }
    text += "  is shorter than 70 characters!"
    if(selected_profiles != 0){
        if(err.length){
            alert(text);
        }else{
            document.querySelector("#go").disabled = true;
            for (let i = 1; i <=4; i++) {
                document.querySelector(`#text-p${i}`).disabled = true;
                document.querySelector(`#profile${selected_profiles+1}`).disabled = true;   
                document.querySelector(`#button-p${selected_profiles+1}`).disabled = true;  
            }
            document.querySelector("#loading").style.visibility = "visible";
            var data = [];
            for (let i = 1; i <= selected_profiles; i++) {
                var e = {
                    profile_name : document.querySelector(`#profile${i}`).value ,
                    profile_text : document.querySelector(`#text-p${i}`).value.trim() 
                };
                data.push(e);                
            }
            socket.emit("start-service" , data , function(res){
                if(res == "ok"){
                    window.location.replace("http://localhost:3000/service");
                }
            });
        }
    }else{
        alert("Select one or more profiles!");
    }
    
}

//fas fa-minus-circle text-danger
//fas fa-plus-circle text-success
//fas fa-spinner fa-spin