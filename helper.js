function makeid(length){
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}



function Session(username , userid){
    this.user = {
        username : username,
        userid : userid
    };

    this.socketID = null;
    this.prepared = false;
    this.lastseen = new Date().getTime();


    this.selectedpin = {
        pin : null,
        pinid : null,
        pinpass: null
    }
    this.profiles = []
    this.queue = [
        {
            type:"PinSelect",
        },
        {
            type:"ProfileSelect",
            runing:false,
        }
    ];

}
exports.makeid = makeid ;
exports.Session = Session ; 