if (navigator.mediaDevices.getDisplayMedia == undefined){controls.children[3].remove();};
var notifications = document.getElementById('notifications');
var container = document.getElementById('container');
const APP_ID = '0eb3e08e01364927854ee79b9e513819';
var CHANNEL = document.getElementById('container').dataset.token;
var token = document.getElementById('meeting_link').dataset.token;
var UID = Number(document.getElementById('controls').dataset.id);
var connection_protocol;
var profile_picture = '/media/no_profile_Pic.jpeg';
let role = 'participant';
var all_hands = document.getElementById('all_hands');
var chats = false;
var token;

function post_message(str) {
    var text = document.createElement('p');
    text.innerHTML = str;
    notifications.appendChild(text);
    notifications.scrollTop = notifications.scrollHeight;
    setTimeout(() => {text.style.opacity = "0"}, 5000);
}

var qr_code_holder = document.getElementById('qrcode');
qr_code_holder.firstElementChild.setAttribute('autofocus','');
var qr_code = new QRCode(document.getElementById('qrcode').firstElementChild,{
    text: document.getElementById('meeting_link').firstElementChild.children[2].value,
    width: 128,
    height: 128
});

qr_code_holder.addEventListener('mousedown',() => {
    qr_code_holder.style.display = "none";
})

document.getElementById('options').addEventListener('mouseup',() => {
    document.getElementById('options').style.display = "none";
})

var element = Array.from(document.getElementsByClassName('hands_button'))[0];
element.style.setProperty('--raised_hands','none');

if (window.location.protocol == 'https:'){
    connection_protocol = 'wss';
}else {
    connection_protocol = 'ws';
}

let websocket_url = `${connection_protocol}://${window.location.host}/meet/${CHANNEL}/`;
var socket = new WebSocket(websocket_url);
var client = AgoraRTC.createClient({mode:'rtc',codec:'vp8'});

let joinAndDisplayLocalStream = async (token, UID) => {
    client.on('user-published',handleNewUser);

    await client.join(APP_ID, CHANNEL, token, UID);

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
    container.appendChild(holder);

    if (Array.from(document.getElementsByClassName('holder')).length > 1) {
        container.style.gridTemplateColumns = "repeat(auto-fit, minmax(300px, 1fr))";
        container.style.gridAutoRows = "300px";
    }

    holder.appendChild(name);
    holder.appendChild(profile_picture);

    var loader = container.firstElementChild;

    if (loader.getAttribute('class') == "loader_holder"){
        loader.remove();
    }

    var player = holder.lastElementChild;
    
    player.style.display = "flex";
    player.style.flexDirection = "column";
    player.style.alignItems = "center";
    player.style.justifyItems = "center";
    
    var parent = Array.from(document.getElementsByClassName('user_holder'))[0];

    var new_user = document.createElement('p');
    new_user.setAttribute('id',`participant_${item.uid.toString()}`);
    new_user.innerHTML = `<img src = '${item.profile_picture}'/>${item.name}`;
    parent.appendChild(new_user);

    var button  = document.getElementById('controls').children[2];
    button.setAttribute('data-description',parent.children.length - 1);
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
}

let handleUserLeft = async (user) => {
    document.getElementById(user.uid.toString()).remove();

    if (Array.from(document.getElementsByClassName('holder')).length == 1){
        container.style.gridTemplateColumns = "auto";
        container.style.gridAutoRows = "auto";
    }

    document.getElementById(`participant_${user.uid.toString()}`).remove();

    var parent = Array.from(document.getElementsByClassName('user_holder'))[0];

    var target_button = document.getElementById('controls').children[2];
    target_button.setAttribute('data-description',parent.children.length - 1);
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
    var comment_holder = document.getElementById('comments').children[2];

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
            post_message(`<span>${response.name}</span> ${response.message}`)
        }
    }else if (response.raise_hand) {
        var element = Array.from(document.getElementsByClassName('hands_button'))[0];
        element.style.setProperty('--raised_hands','block');

        post_message(`<i class = "fas fa-hand-paper"></i> ${response.username}`)

        var parent = Array.from(document.getElementsByClassName('raised_hands'))[0];
        var name = document.createElement('p');
        name.setAttribute('id',`hand_${response.id}`)
        name.innerHTML = `<i class = "fas fa-hand-paper"></i> ${response.username}`;
        parent.appendChild(name);
        var hands = document.getElementById('hands').firstElementChild.children[2].children.length - 1;
        all_hands.innerHTML = hands;
    }else if (response.caption) {
        var parent = document.getElementById('captions');
        var text = document.createElement('p');
        text.innerHTML = response.caption;
        parent.appendChild(text);
    }else if (response.lower_hand) {
        var parent = Array.from(document.getElementsByClassName('raised_hands'))[0];
        var item = document.getElementById(`hand_${response.id}`);
        item.remove();
        if (parent.children.length == 1) {
            var element = Array.from(document.getElementsByClassName('hands_button'))[0];
            element.style.setProperty('--raised_hands','none');
        }
        var hands = document.getElementById('hands').firstElementChild.children[2].children.length - 1;
        all_hands.innerHTML = hands;
    }else if (response.screen_sharing) {
        post_message(`<i class = "fas fa-laptop"></i> ${response.username} is sharing screen`)
    }else if (response.user_joined) {
        if (response.name) {
            if (document.getElementById(response.uid.toString()) == null) {
                handleJoinedUser(response);
            }
        }
    }else if (response.fileType) {
        var container = document.createElement('div');
        var time = getCurrentTime();
        var container;

        var file_types = ['audio/mpeg','audio/wav','application/pdf','image/jpeg','image/png','video/mp4']

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
            post_message(`<span>${response.name}</span> shared a file`);
        }
    }else if (response.auth) {
        joinAndDisplayLocalStream(response.token, response.id);
        my_id = response.id;
        token = response.token;
    }
}

socket.addEventListener('message',getSocketMessages);

let rejoin_session = () => {
    fetch(`/get_token/?channel=${CHANNEL}`,{
        method: 'GET'
    }).then(response => {
        return response.json().then(data => {
            client.join(APP_ID, CHANNEL, data.token);
        })
    })
}

function open_chats(){
    var options = document.getElementById('options');
    var main = document.getElementById('main');
    var comments = document.getElementById('comments').parentElement;
    var grid_value = window.getComputedStyle(main).getPropertyValue('grid-template-columns');
    var display_value = window.getComputedStyle(comments).getPropertyValue('display');

    options.style.display = "none";

    if (display_value == 'flex'){
        comments.style.display = 'none';
        self.innerHTML = "<i class = 'far fa-comments'></i>";
        if (grid_value != 'auto'){
            main.style.gridTemplateColumns = 'auto';
        }
        chats = false
    }else {
        var button = document.getElementById('comments').firstElementChild;
        var button_display = window.getComputedStyle(button).getPropertyValue('visibility');
        
            main.style.gridTemplateColumns = 'auto 340px';
        
        comments.style.display = 'flex';
        chats = true;
    }
}

function options(){
    document.getElementById('options').style.display = "flex";
}

function close_options(){
    document.getElementById('options').style.display = "none";
}

function close_comments(self){
    self.parentElement.parentElement.style.display = 'none';
    var main = document.getElementById('main');
    main.style.gridTemplateColumns = "auto";
    chats = false;
}

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

window.addEventListener('beforeunload',() => {
    socket.close();
    videoTrack.stop();
    videoTrack.close();
    client.leave();
});

joinAndDisplayLocalStream();