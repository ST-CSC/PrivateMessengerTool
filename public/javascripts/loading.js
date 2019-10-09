const origin = window.location.origin;
const socket = io(origin,{
    'reconnection': true,
    'reconnectionDelay': 100,
    'reconnectionAttempts': 5
});
socket.on('connect', () => {
    console.log("Socket connection established");
    socket.emit("StartService");
});
socket.on('StartService', () => {
    window.location = origin ;
});

