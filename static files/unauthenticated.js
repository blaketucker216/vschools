if (navigator.mediaDevices.getDisplayMedia == undefined){document.getElementById('controls').children[3].remove();};
var my_id;
const username = document.getElementById('main').dataset.username;
var notifications = document.getElementById('notifications');
var container = document.getElementById('container');
const APP_ID = '0eb3e08e01364927854ee79b9e513819';
var authorization = document.getElementById('controls').dataset.authorization;
var CHANNEL = document.getElementById('options').dataset.channel;
var connection_protocol;
var profile_picture = document.getElementById('controls').dataset.profile_picture;
var all_hands = document.getElementById('all_hands');
var chats = false;
var set_captions = false;
var connection;
var resource_id_value;
var sid;
var time_string;
var token;
var socket;
var video_track_playing = false;
var audio_track_playing = false;
var time_limit;
var room;
var user_token;
var whiteboard;
var all_users = 0;

var file_types = ['audio/mpeg','audio/wav','application/pdf','image/jpeg','image/png','video/mp4',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

var send_notification = (title, body, icon) => {
    var notification = new Notification(title,{body:body,icon:icon});
    if (Notification.permission === "granted") {
        return notification;
    }else if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                return notification;
            }
        })
    }
}

/*function post_message(str) {
    var text = document.createElement('p');
    text.innerHTML = str;
    notifications.prepend(text);
    notifications.scrollTop = notifications.scrollHeight;
    text.style.opacity = "1";
    setTimeout(() => {text.style.opacity = "0";}, 5000);
    setTimeout(() => {text.style.display = "none";}, 6000);
}*/

let getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== ''){
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')){
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

if (window.location.protocol == 'https:'){
    connection_protocol = 'wss';
}else {
    connection_protocol = 'ws';
}

let websocket_url = `${connection_protocol}://${window.location.host}/meet/${CHANNEL}/`;

var client = AgoraRTC.createClient({mode:'rtc',codec:'vp8'});

var videoInputDevices;
var audioInputDevices;

var videoTrack;
var audioTrack;

let createTracks = async () => {
    socket = new WebSocket(websocket_url);
    socket.addEventListener('message',getSocketMessages);
}

createTracks();

let joinAndDisplayLocalStream = async (token, UID) => {
    client.on('user-published',handleNewUser);

    await client.join(APP_ID, CHANNEL, token, UID);

    Array.from(document.getElementsByTagName('button')).forEach(item => {
        if (item.hasAttribute('disabled')){
            item.removeAttribute('disabled');
        }
    })

    var loader = container.firstElementChild;
 
    client.on('token-privilege-will-expire',renew_client_token);
    client.on('token-privilege-did-expire',rejoin_session);
    client.on('user-left',handleUserLeft);
    client.on('user-unpublished',UserUnpublishedEvent);
}

let UserUnpublishedEvent = async (user, mediaType) => {
    await client.unsubscribe(user, mediaType);
    var holder = document.getElementById(user.uid.toString());
    if (mediaType == 'video'){
        var profile_picture = document.getElementById(`profile_picture_${user.uid.toString()}`);
        profile_picture.style.display = "block";
    }else {
        var name = document.getElementById(`name_${user.uid.toString()}`);
        var microphone = name.firstElementChild;
        microphone.setAttribute('class','fas fa-microphone-slash');
        microphone.style.color = "red";
    }
}

let handleJoinedUser = (item) => {
    var name = document.createElement('p');
    name.setAttribute('id',`name_${item.uid.toString()}`);
    name.innerHTML = `<i class = 'fas fa-microphone-slash'></i> ${item.name} <span></span>`;

    var profile_picture = document.createElement('img');
    profile_picture.setAttribute('id',`profile_picture_${item.uid.toString()}`);
    profile_picture.setAttribute('src',item.profile_picture);

    var holder = document.createElement('div');
    holder.setAttribute('id',item.uid.toString());
    holder.setAttribute('class','holder');
    holder.setAttribute('ondblclick','full_screen(this)');
    document.getElementById('hosts').prepend(holder);

    all_users += 1
    document.getElementById('meeting_tools').firstElementChild.innerHTML = `classroom (${all_users})`;

    holder.appendChild(name);
    holder.appendChild(profile_picture);

    var loader = container.firstElementChild;

    var player = holder.lastElementChild;
    
    player.style.display = "flex";
    player.style.flexDirection = "column";
    player.style.alignItems = "center";
    player.style.justifyItems = "center";

    var loader = container.firstElementChild;

    if (loader.getAttribute('class') == "loader_holder"){
        loader.remove();
    }

    Array.from(document.getElementsByClassName('holder')).forEach((item) => {
        item.style.width = "260px";
        item.style.height = "260px";
    })

    /*var target_item = `
        <div id = 'participant_${item.uid}'>
            <img src = "${item.profile_picture}"/>
            <p>${item.name}</p>
        </div>
    `

    var parent = document.getElementById('meeting_info').firstElementChild.children[2];
    parent.innerHTML += target_item;*/
}

function view_users() {
    document.getElementById('meeting_tools').lastElementChild.click();
}

let handleNewUser = async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    var holder = document.getElementById(user.uid.toString());
    if (mediaType === 'video'){
        user.videoTrack.play(holder);
        var player = holder.lastElementChild;
        var video = holder.lastElementChild.firstElementChild;
        var image = document.getElementById(`profile_picture_${user.uid.toString()}`);
        image.style.display = "none";
        
        player.style.display = "flex";
        player.style.flexDirection = "column";
        player.style.alignItems = "center";
        player.style.justifyItems = "center";

        video.setAttribute('style','height: 100%; width: auto; max-width: 100%;'); 
    }

    if (mediaType === 'audio'){
        user.audioTrack.play();
        var name = document.getElementById(`name_${user.uid.toString()}`);
        var microphone = name.firstElementChild;
        microphone.setAttribute('class','fas fa-microphone');
        microphone.style.color = "blue";
    }

    Array.from(holder.children).forEach((item) => {
        item.style.backgroundColor = "rgba(198, 198, 198, 0.102";
    })
}

let handleUserLeft = async (user) => {
    document.getElementById(user.uid.toString()).remove();
    document.getElementById(`participant_${user.uid.toString()}`).remove();

    all_users -= 1
    document.getElementById('meeting_tools').firstElementChild.innerHTML = `classroom (${all_users})`;
}

let leaveAndRemoveLocalStream = async () => {
    socket.close();
    videoTrack.stop();
    videoTrack.close();
    client.leave();
    window.open('/','_self');
}

function countWords(str) {
    const arr = str.split(' ');
    return arr.filter(word => word !== '').length;
  }

function getImage() {
    document.getElementById('photo').click();
}

function sendFile(self) {
    if (self.files) {
        var form = new FormData();
        form.append("image",self.files[0]);
        form.append("uid",my_id);
        form.append("fileType",self.files[0].type);
        form.append("fileName", self.files[0].name);

        var xhr = new XMLHttpRequest();

        /*xhr.upload.onloadstart = () => {
            document.getElementById('uploadProgress').style.display = "flex";
        }

        xhr.upload.onloadend = () => {
            document.getElementById('uploadProgress').style.display = "none";
        }

        var button = document.getElementById('progressContainer').lastElementChild;

        button.addEventListener('click', () => {
            xhr.abort();
            button.innerHTML = "Upload cancelled";
            setTimeout(() => {
                document.getElementById('uploadProgress').style.display = "none";
                button.innerHTML = "Cancel";
            },10000)
        })

        xhr.upload.onprogress = (event) => {
            var total = event.total;
            var loaded = event.loaded;

            var progressValue = (loaded / total) * 100;
            var progressElement = document.getElementById('progressElement').firstElementChild;
            progressElement.style.width = `${progressValue}%`;

            var percentage = document.getElementById('progressContainer').children[2];
            percentage.innerHTML = `${Math.trunc(progressValue)}%`;

        }*/

        xhr.onreadystatechange = () => {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                var data = JSON.parse(xhr.responseText);
                var fileUrl = data.fileUrl;
                var item = {'fileUrl':fileUrl,'profile_picture':profile_picture,
                    'id':my_id,'name':username,'fileType':self.files[0].type,'fileName':self.files[0].name};
                socket.send(JSON.stringify(item));
            }
        }

        if (file_types.includes(self.files[0].type)) {
            xhr.open('POST',window.location);
            xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
            xhr.setRequestHeader('X-Requested-With','XMLHttpRequest');
            xhr.send(form);
        }else {
            post_message('<i class = "fas fa-exclamation-triangle"></i> Failed to send file');
        }
    }
}

let getCurrentTime = () => {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    if (minutes < 10){
        minutes = '0'+minutes;
    }
    if (hours < 10){
        hours = '0'+hours;
    }

    var time = `${hours}:${minutes}`;

    return time;
}

let getSocketMessages = function(self){
    var response = JSON.parse(self.data);
    var comment_holder = document.getElementById('livechat').children[1];

    if(response.message){
        var container = document.createElement('div');
        
        var time = getCurrentTime();
        var container = `
            <div class = "message_container">
                <img class = 'profile_picture' src = "${response.profile_picture}"/>
                <p class = "user_name">${response.name} <span>${time}</span></p>
                <p class = "message">${response.message}</p>
            </div>
        `
        comment_holder.innerHTML += container;
        comment_holder.scrollTop = comment_holder.scrollHeight;

        if (chats === false) {
            send_notification(response.name, response.message, response.profile_picture);
        }
    }else if (response.raise_hand) {
        send_notification(response.username,`${response.username} is raising a hand`,response.profile_picture);

        var item = document.createElement('i');
        item.setAttribute('class','fas fa-hand')
    }else if (response.caption) {
        
    }else if (response.lower_hand) {
        
    }else if (response.screen_sharing) {
        send_notification(response.username, `${response.username} is sharing screen`, response.profile_picture);
    }else if (response.user_joined) {
        if (response.name) {
            profile_picture = response.profile_picture;
            
            if (document.getElementById(response.uid.toString()) == null) {
                handleJoinedUser(response);
            }
        }
    }else if (response.fileType) {
        var container = document.createElement('div');
        var time = getCurrentTime();
        var container;

        if (response.fileType == 'image/jpeg' || response.fileType == 'image/png') {
            var container = `
                <div class = "message_container">
                    <img class = 'profile_picture' src = "${response.profile_picture}"/>
                    <p class = "user_name">${response.name} <span>${time}</span></p>
                    <div class = "file_container">
                        <i class = "fas fa-file-image"></i>
                        <div>
                            <a target = "_blank" href = "${response.fileUrl}">${response.fileName}</a>
                        </div>
                    </div>
                </div>
            `
        }else if (response.fileType == 'video/mp4') {
            container = `
                <div class = "message_container">
                    <img class = 'profile_picture' src = "${response.profile_picture}"/>
                    <p class = "user_name">${response.name} <span>${time}</span></p>
                    <div class = "file_container">
                        <i class = "fas fa-file-video"></i>
                        <div>
                            <a target = "_blank" href = "${response.fileUrl}">${response.fileName}</a>
                        </div>
                    </div>
                </div>
            `
        }else if (response.fileType == 'audio/wav' || response.fileType == 'audio/mpeg') {
            container = `
                <div class = "message_container">
                    <img class = 'profile_picture' src = "${response.profile_picture}"/>
                    <p class = "user_name">${response.name} <span>${time}</span></p>
                    <div class = "file_container">
                        <i class = "fas fa-file-audio"></i>
                        <div>
                            <a target = "_blank" href = "${response.fileUrl}">${response.fileName}</a>
                        </div>
                    </div>
                </div>
            `
        }else if (response.fileType == 'application/pdf') {
            container = `
                <div class = "message_container">
                    <img class = 'profile_picture' src = "${response.profile_picture}"/>
                    <p class = "user_name">${response.name} <span>${time}</span></p>
                    <div class = "file_container">
                        <i class = "fas fa-file-pdf"></i>
                        <div>
                            <a target = "_blank" href = "${response.fileUrl}">${response.fileName}</a>
                        </div>
                    </div>
                </div>
            `
        }else if (response.fileType == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            container = `
                <div class = "message_container">
                    <img class = 'profile_picture' src = "${response.profile_picture}"/>
                    <p class = "user_name">${response.name} <span>${time}</span></p>
                    <div class = "file_container">
                        <i class = "fas fa-file-word"></i>
                        <div>
                            <a target = "_blank" href = "${response.fileUrl}">${response.fileName}</a>
                        </div>
                    </div>
                </div>
            `
        }else if (response.fileType == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            container = `
                <div class = "message_container">
                    <img class = 'profile_picture' src = "${response.profile_picture}"/>
                    <p class = "user_name">${response.name} <span>${time}</span></p>
                    <div class = "file_container">
                        <i class = "fas fa-file-excel"></i>
                        <div>
                            <a target = "_blank" href = "${response.fileUrl}">${response.fileName}</a>
                        </div>
                    </div>
                </div>
            `
        }

        comment_holder.innerHTML += container;
        comment_holder.scrollTop = comment_holder.scrollHeight;

        if (chats === false) {
            send_notification(response.name, `${response.name} shared a file`, response.profile_picture);
        }
    }else if (response.auth) {
        joinAndDisplayLocalStream(response.token, response.id);
        my_id = response.id; 
        token = response.token;

        getCredentials();
    }
}

let open_classroom = (self) => {
    document.getElementById('meeting_info').style.display = "none";
    document.getElementById('whiteboard_container').style.display = "none";
    var tools = document.getElementById('meeting_tools');
    Array.from(tools.children).forEach((item) => {
        item.style.borderBottom = "none";
    })
    self.style.borderBottom = "2px solid rgba(0,0,200,0.6)";
}

function copy_link(self){
    self.innerHTML = '<i class = "fas fa-copy"></i>';
    var link = self.parentElement.firstElementChild.value;
    navigator.clipboard.writeText(link);
    setTimeout(() => {
        self.innerHTML = '<i class = "far fa-copy"></i>';
    }, 2000)
}

let open_whiteboard = (self) => {
    var tools = document.getElementById('meeting_tools');
    Array.from(tools.children).forEach((item) => {
        item.style.borderBottom = "none";
    })

    document.getElementById('meeting_info').style.display = "none";
    document.getElementById('whiteboard_container').style.display = "block";
    self.style.borderBottom = "2px solid rgba(0,0,200,0.6)";
}

let open_meet_info = (self) => {
    document.getElementById('whiteboard_container').style.display = "none";
    document.getElementById('meeting_info').style.display = "flex";
    var tools = document.getElementById('meeting_tools');
    Array.from(tools.children).forEach((item) => {
        item.style.borderBottom = "none";
    })
    self.style.borderBottom = "2px solid rgba(0,0,200,0.6)";
}

let renew_client_token = () => {
    fetch(`/get_token/?channel=${CHANNEL}`,{
        method: 'GET'
    }).then(response => {
        return response.json().then(data => {
            client.renewToken(data.token);
        })
    })
}

let rejoin_session = () => {
    fetch(`/get_token/?channel=${CHANNEL}`,{
        method: 'GET'
    }).then(response => {
        return response.json().then(data => {
            client.join(APP_ID, CHANNEL, data.token);
        })
    })
}

let full_screen = (self) => {
    self.requestFullscreen()
}

let search_user = (self) => {
    var input_value = self.value.toUpperCase();
    var parent = Array.from(document.getElementsByClassName('user_holder'))[0];
    Array.from(parent.children).forEach((item) => {
        if (!item.hasAttribute('class')) {
            if (!item.innerHTML.includes(input_value)) {
                item.style.visibility = "hidden";
            }else {
                item.style.visibility = "unset";
            }
        }
    })
}

function open_chats(){
    chats = true;
    document.getElementById('options').style.display = "none";
    document.getElementById('livechat').style.display = "block";
}

let captions = async (self) => {
    self.innerHTML = '<i class = "fas fa-closed-captioning"></i>';
    self.setAttribute('onclick','mute_captions(this)');
    post_message('<i class = "far fa-closed-captioning"></i> Auto generated subtitles have been turned on');
}

let mute_captions = async (self) => {
    self.innerHTML = '<i class = "far fa-closed-captioning"></i>';
    self.setAttribute('onclick','captions(this)');
    await connection.stopProcessing();
}

let show_hands = () => {
    document.getElementById('options').style.display = "none";
    document.getElementById('hands').style.display = "flex";
}

let raise_hand = (self) => {
    self.innerHTML = "<i class = 'fas fa-hand-paper'></i>";
    self.setAttribute('onclick','lower_hand(this)');
    self.setAttribute('data-name','unraise');
    socket.send(JSON.stringify({'raise_hand':true,'username':username,'id':my_id,'profile_picture':profile_picture}));
}

let lower_hand = (self) => {
    self.innerHTML = "<i class = 'far fa-hand-paper'></i>";
    self.setAttribute('onclick','raise_hand(this)');
    self.setAttribute('data-name','raise');
    socket.send(JSON.stringify({'lower_hand':true,'username':username,'id':my_id}));
}

function options(){
    document.getElementById('options').style.display = "flex";
}

function close_options(){
    document.getElementById('options').style.display = "none";
}

function get_link(self){
    document.getElementById('options').style.display = "none";
    document.getElementById('meeting_link').style.display = "flex";
}

function Cancel(self) {
    self.parentElement.parentElement.style.display = "none";
}

function close_comments(){
    document.getElementById('livechat').style.display = "none";
    chats = false;
}

let start_meeting = (self) => {
    self.style.display = "none";
    joinAndDisplayLocalStream();
}

function close_items(self){
    self.parentElement.parentElement.style.display = "none";
}

function get_views(){
    document.getElementById('viewers').style.display = "flex";
}

window.addEventListener('beforeunload',() => {
    socket.close();
    client.leave();
});

let start_whiteboard = (room_token, room_uid) => {
    var whiteWebSdk = new WhiteWebSdk({
        appIdentifier: "kxGEgDNcEe2cCXezkLqgEg/Gf-OOdcaZPZ-pg",
        region: "us-sv",
      })
      
      var joinRoomParams = {
        uuid: room_uid,
        uid: my_id.toString(),
        roomToken: room_token, 
      };
      
      whiteWebSdk.joinRoom(joinRoomParams).then(function(whiteboard_room) {
        whiteboard_room.bindHtmlElement(document.getElementById("whiteboard"));
        room = whiteboard_room;
        room.setWritable(true);

      }).catch(function(err) {
          console.error(err);
      });
 }