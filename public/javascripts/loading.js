const socket = io('http://192.168.88.4:3000/',{
    'reconnection': true,
    'reconnectionDelay': 100,
    'reconnectionAttempts': 5
});
socket.on('connect', () => {
    console.log("Socket connection established");
    socket.emit("StartService");
});
socket.on('StartService-done', () => {
    window.location = "http://192.168.88.4:3000/"
});

