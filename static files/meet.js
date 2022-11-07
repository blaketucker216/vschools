if (navigator.mediaDevices.getDisplayMedia == undefined){controls.children[3].remove();};
var my_id;
const username = document.getElementById('main').dataset.username;
var notifications = document.getElementById('notifications');
var container = document.getElementById('container');
const APP_ID = '0eb3e08e01364927854ee79b9e513819';
var authorization = document.getElementById('controls').dataset.authorization;
var CHANNEL = document.getElementById('container').dataset.token;
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

var file_types = ['audio/mpeg','audio/wav','application/pdf','image/jpeg','image/png','video/mp4',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

var comment_holder = document.getElementById('comments').children[2];
comment_holder.scrollTop = comment_holder.scrollHeight;

function post_message(str) {
    var text = document.createElement('p');
    text.innerHTML = str;
    notifications.appendChild(text);
    notifications.scrollTop = notifications.scrollHeight;
    setTimeout(() => {text.style.opacity = "0"}, 5000);
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

if (window.location.protocol == 'http:'){
    connection_protocol = 'ws';
}else {
    connection_protocol = 'wss';
}

let websocket_url = `${connection_protocol}://${window.location.host}/meet/${CHANNEL}/`;

var client = AgoraRTC.createClient({mode:'rtc',codec:'vp8'});

AgoraRTC.getCameras().then((devices) => {
    videoInputDevices = devices;
    if (videoInputDevices.length == 0) {
        var button = document.getElementById('controls').firstElementChild;
        button.innerHTML = '<i class = "fas fa-video-slash"></i>';
        button.setAttribute('class','inactive');
        button.setAttribute('data-description','enable');
    }
})

AgoraRTC.getMicrophones().then((devices) => {
    audioInputDevices = devices;
    if (audioInputDevices.length == 0) {
        var button = document.getElementById('controls').children[1];
        button.innerHTML = '<i class = "fas fa-microphone-slash"></i>';
        button.setAttribute('class','inactive');
        button.setAttribute('data-description','unmute');
    }
})

var videoInputDevices;
var audioInputDevices;

var videoTrack;
var audioTrack;

let createTracks = async () => {
    try {
        var tracks = await AgoraRTC.createMicrophoneAndCameraTracks();

        audioTrack = tracks[0];
        videoTrack = tracks[1];

        socket = new WebSocket(websocket_url);
        socket.addEventListener('message',getSocketMessages);
    } catch (error) {
        console.log(error.message.toString())
        if (error.message.toString() == 'AgoraRTCError NOT_READABLE: NotReadableError: Could not start video source') {
            console.log('this is an error message by Victor man');
            var target_element = document.getElementById('container').firstElementChild;
            target_element.firstElementChild.remove();

            var child_one = document.createElement('i');
            child_one.setAttribute('class','fas fa-exclamation-triangle');
            target_element.prepend(child_one);

            target_element.lastElementChild.innerHTML = "Failed to start Camera and Microphone";
        }else if (error.message.toString() == 'AgoraRTCError PERMISSION_DENIED: NotAllowedError: Permission denied') {
            var target_element = document.getElementById('container').firstElementChild;
            target_element.firstElementChild.remove();

            var child_one = document.createElement('i');
            child_one.setAttribute('class','fas fa-exclamation-triangle');
            target_element.prepend(child_one);

            target_element.lastElementChild.innerHTML = "Camera and Microphone permission denied";
        }
    }
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

    var holder = document.getElementById(my_id.toString());

    var profile_picture = document.getElementById(`profile_picture_${my_id.toString()}`);
    var microphone = document.getElementById(`name_${my_id.toString()}`).firstElementChild;

    videoTrack.play(holder);

    var player = holder.lastElementChild;
    player.style.display = "flex";
    player.style.flexDirection = "column";
    player.style.alignItems = "center";
    player.style.justifyItems = "center";

    profile_picture.style.display = "none";

    var video = holder.lastElementChild.firstElementChild;
    console.log(video);
    video.setAttribute('style','height: 100%; width: auto; max-width: 100%;');

    microphone.style.color = 'blue';
    microphone.setAttribute('class','fas fa-microphone');
 

    client.on('token-privilege-will-expire',renew_client_token);
    client.on('token-privilege-did-expire',rejoin_session);
    client.on('user-left',handleUserLeft);
    client.on('user-unpublished',UserUnpublishedEvent);

    if (videoInputDevices.length > 0) {
        await client.publish(videoTrack);
    }

    if (audioInputDevices.length > 0) {
        await client.publish(audioTrack);
    }

    /*if (CHANNEL == user_token) {
        var time_values = {};
        var seconds = 0;
        var minutes = 0;
        var hours = 0;
    
        var date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(seconds);
    
        setInterval(() => {
            seconds += 1;
            minutes = Math.trunc(seconds / 60);
            hours = Math.trunc(seconds / 3600);
            date.setSeconds(seconds)
            date.setMinutes(minutes);
            date.setHours(hours);
            time_values.seconds = date.getSeconds().toString();
            time_values.minutes = date.getMinutes().toString();
            time_values.hours = date.getHours().toString();
    
            if (time_values.seconds.length == 1) {
                time_values.seconds = '0'.concat(time_values.seconds);
            }
    
            if (time_values.minutes.length == 1) {
                time_values.minutes = '0'.concat(time_values.minutes);
            }
    
            if (time_values.hours.length == 1) {
                time_values.hours = '0'.concat(time_values.hours);
            }
            
            time_string = `${time_values.hours}:${time_values.minutes}:${time_values.seconds}`;
            socket.send(JSON.stringify({'duration':time_string}));
        },1000)
    }*/
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

        xhr.upload.onloadstart = () => {
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

        }

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
            post_message('<i class = "fas fa-exclamation-triangle"></i> Failed to send file')
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
            if (response.user_token != CHANNEL) {
                document.getElementById('options').children[3].remove();
            }

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
            post_message(`<span>${response.name}</span> shared a file`);
        }
    }else if (response.auth) {
        joinAndDisplayLocalStream(response.token, response.id);
        my_id = response.id;
        token = response.token;
    }
}

let handle_camera = async (self) => {
    var profile_picture = document.getElementById(`profile_picture_${my_id.toString()}`);
    if (videoInputDevices.length > 0) {
        if (videoTrack.muted){
            profile_picture.style.display = "none";
            await videoTrack.setMuted(false);
            self.innerHTML = '<i class = "fas fa-video"></i>';
            self.setAttribute('class','control_buttons');
            self.setAttribute('data-description','disable');
            post_message('<i class = "fas fa-video"></i> Your camera is enabled')
        }else {
            await videoTrack.setMuted(true);
            self.innerHTML = '<i class = "fas fa-video-slash"></i>';
            self.setAttribute('class','inactive');
            self.setAttribute('data-description','enable');
            profile_picture.style.display = "block";
        }
    }else {
        post_message('You have no webcam attached to your device');
    }
}

let handle_audio = async (self) => {
    var holder = document.getElementById(my_id.toString());
    var microphone = document.getElementById(`name_${my_id.toString()}`).firstElementChild;
    
    if (audioInputDevices.length > 0) {
        if (audioTrack.muted){
            await audioTrack.setMuted(false);
            self.innerHTML = '<i class = "fas fa-microphone"></i>';
            self.setAttribute('class','control_buttons');
            self.setAttribute('data-description','mute');
            microphone.style.color = 'blue';
            microphone.setAttribute('class','fas fa-microphone');
            post_message('<i class = "fas fa-microphone"></i> Your microphone is unmuted');
        }else {
            await audioTrack.setMuted(true);
            self.innerHTML = '<i class = "fas fa-microphone-slash"></i>';
            self.setAttribute('class','inactive');
            self.setAttribute('data-description','unmute');
            microphone.style.color = 'red';
            microphone.setAttribute('class','fas fa-microphone-slash');
        }
    }else {
        post_message('You have no audio input device attached');
    }
}

let screen_sharing = (self) => {
    AgoraRTC.createScreenVideoTrack({
        encoderConfig: '1080p_1',
        optimizationMode: 'details',
        screenSourceType: 'screen',
    }).then(localScreenTrack => {
        self.setAttribute('class','inactive');
        self.setAttribute('data-description','end');
        client.unpublish(videoTrack);
        client.publish(localScreenTrack);
        socket.send(JSON.stringify({'screen_sharing':true,'username':username}));
        localScreenTrack.on('track-ended', () => {
            client.unpublish(localScreenTrack);
            client.publish(videoTrack);
            self.setAttribute('class','control_buttons');
            self.setAttribute('data-description','screen');
        })
    })
}

let start_recording = (resource_id) => {
    fetch(`https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resource_id}/mode/web/start`,{
        method: 'POST',
        headers:{
            'Content-Type': 'application/json;charset=utf-8',
            'Authorization':'Basic ' + authorization
        },
        body: JSON.stringify({
            "cname": CHANNEL,
            "uid": my_id.toString(),
            "clientRequest": {
                "token": token,
                "extensionServiceConfig": {
                    "errorHandlePolicy": "error_abort",
                    "extensionServices": [
                        {
                            "serviceName": "web_recorder_service",
                            "errorHandlePolicy": "error_abort",
                            "serviceParam": {
                                "url": document.getElementById('meeting_link').firstElementChild.children[2].value,
                                "audioProfile": 0,
                                "videoWidth": 1280,
                                "videoHeight": 720,
                                "maxRecordingHour": 1,
                                "maxVideoDuration": 200
                            }
                        }
                    ]
                },
                "recordingFileConfig": {
                    "avFileType": [
                        "hls",
                        "mp4"
                    ]
                },
                "storageConfig": {
                    "vendor": 1,
                    "region": 0,
                    "bucket": "vschools-file-bucket",
                    "accessKey": "AKIARLTR4RWUQPIM3AEB",
                    "secretKey": "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",
                    "fileNamePrefix": [
                        "media",
                    ]
                }
            }
        })
        }).then(response => {
        return response.json().then(data => {
            sid = data.sid;
        })
        })
}

let get_resource_id = () => {
    fetch(`https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/acquire`,{
        method: 'POST',
        headers:{
            'Content-Type': 'application/json;charset=utf-8',
            'Authorization':'Basic ' + authorization
        },
        body: JSON.stringify({
            'cname':CHANNEL,
            'uid': my_id.toString(),
            "clientRequest": {
                "region": "CN",
                "resourceExpiredHour": 24,
                "scene": 1
                }
        })
        }).then(response => {
        return response.json().then(data => {
            resource_id_value = data.resourceId;
            start_recording(data.resourceId);
        })
        })
}

let stop_recording = () => {
    fetch(`https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resource_id_value}/sid/${sid}/mode/web/stop`,{
        method: 'POST',
        headers:{
            'Content-Type': 'application/json;charset=utf-8',
            'Authorization':'Basic ' + authorization
        },
        body: JSON.stringify({
          "cname": CHANNEL,
          "uid": my_id.toString(),
          "clientRequest": {}
        })
        }).then(response => {
        return response.json().then(data => {
            var mp4_file = `https://vschools-file-bucket.s3.amazonaws.com/media/${data.sid}_${CHANNEL}_0.mp4`;

            var form = new FormData();
            form.append("video_file_name",mp4_file);
    
            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = () => {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                    console.log('meeting recorded successfully');
                }
            }

            xhr.open('POST',window.location);
            xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
            xhr.setRequestHeader('X-Requested-With','XMLHttpRequest');
            xhr.send(form);
        })
      })
  }

let query_record_status = () => {
    fetch(`https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resource_id_value}/sid/${sid}/mode/web/query`,{
        method: 'GET',
        headers:{
            'Content-Type': 'application/json;charset=utf-8',
            'Authorization':'Basic ' + authorization
        }
        }).then(response => {
        return response.json().then(data => {
            console.log(data);
        })
      })
}

let record_meeting = (self) => {
    get_resource_id();
    post_message('Preparing to record meeting');
    self.innerHTML = '<i class = "fas fa-stop"></i> End recording';
    self.setAttribute('onclick','end_recording(this)');
  }

let end_recording = (self) => {
    stop_recording();
    self.innerHTML = '<i class = "fas fa-record-vinyl"></i> Record meeting';
    self.setAttribute('onclick','record_meeting(this)');
  }

let open_whiteboard = (self) => {
    window.open(`/whiteboard/${CHANNEL}`,'_blank','');
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

let captions = async (self) => {
    self.innerHTML = '<i class = "fas fa-closed-captioning"></i>';
    self.setAttribute('onclick','mute_captions(this)');
    post_message('Subtitles have been turned on');
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

let show_qrcode = () => {
    document.getElementById('options').style.display = "none";
    document.getElementById('qrcode').style.display = "flex";
}

let raise_hand = (self) => {
    self.innerHTML = "<i class = 'fas fa-hand-paper'></i>";
    self.setAttribute('onclick','lower_hand(this)');
    socket.send(JSON.stringify({'raise_hand':true,'username':username,'id':my_id}));
}

let lower_hand = (self) => {
    self.innerHTML = "<i class = 'far fa-hand-paper'></i>";
    self.setAttribute('onclick','raise_hand(this)');
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

function close_comments(self){
    self.parentElement.parentElement.style.display = 'none';
    var main = document.getElementById('main');
    main.style.gridTemplateColumns = "auto";
    chats = false;
}

function add_comment(self){
    var input_box = self.parentElement.children[2];
    if (input_box.value.length > 0){
        var item = {'name':username,'message':input_box.value,
            'profile_picture':profile_picture,'id':my_id};
        socket.send(JSON.stringify(item));
        input_box.value = "";
    }
}

function add_comment_by_enter(keyboard_event){
    if (keyboard_event.keyCode == 13){
        var self = document.getElementById('comments').lastElementChild.lastElementChild;
        add_comment(self);
    }
}

function UploadedFiles(){
    window.open(`/files/${CHANNEL}`,'_blank');
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

function copy_link(self){
    var parent = self.parentElement.parentElement;
    var link = self.parentElement.children[2].value;
    navigator.clipboard.writeText(link);
    self.innerHTML = "<i class = 'fas fa-copy'></i> link copied";
    setTimeout(() => {
        parent.style.display = "none";
        self.innerHTML = "<i class = 'far fa-copy'></i> Copy link";
    },800)
}

window.addEventListener('beforeunload',() => {
    socket.close();
    client.leave();
});