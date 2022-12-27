var room;

var user_token = document.getElementById('navbar').dataset.user_token;
var meeting_token = document.getElementById('whiteboard').dataset.meeting_token;

let open_whiteboard = (room_token, room_uid) => {
    console.log('opened board')
    var whiteWebSdk = new WhiteWebSdk({
        appIdentifier: "kxGEgDNcEe2cCXezkLqgEg/Gf-OOdcaZPZ-pg",
        region: "us-sv",
      })
      
      var joinRoomParams = {
        uuid: room_uid,
        uid: my_id,
        roomToken: room_token, 
      };
      
      whiteWebSdk.joinRoom(joinRoomParams).then(function(whiteboard_room) {
        whiteboard_room.bindHtmlElement(document.getElementById("whiteboard"));
        room = whiteboard_room;
        room.setWritable(true);

        setTimeout(() => {
            document.getElementById('preloader_container').style.opacity = "0";
            document.getElementById('preloader_container').style.display = "none";
        }, 2000);
      }).catch(function(err) {
          console.error(err);
      });
 }
 
 let generate_room_token = (room_uid) => {
    fetch(`https://api.netless.link/v5/tokens/rooms/${room_uid}`,{
        method: 'POST',
        headers:{
            'Content-Type': 'application/json',
            'region':'us-sv',
            'token':'NETLESSSDK_YWs9UHI2SjR2T3RHUlBCai1fMSZub25jZT0yNTYwMTIzMC0zYjdjLTExZWQtODE5MC02ZDgwYzBkMGU1YmEmcm9sZT0wJnNpZz04NzdhZmY1YWE0YTUxYjczNjEzYTVlMjgzYmY3NDFhNTQyYTJiZTU5MjkyZGM2NTY4Yjg5NDJiMzYxNzBlMWY0'
        },
        body: JSON.stringify({'lifespan':3600000,"role":"admin"})
        }).then(response => {
        return response.json().then(data => {
            open_whiteboard(data, room_uid);

            fetch(window.location,{
                method: 'POST',
                headers:{
                    'Content-Type': 'application/json',
                    "X-CSRFToken": getCookie('csrftoken'),
                    'X-Requested-With':'XMLHttpRequest'
                },
                body: JSON.stringify({'room_token':data,'room_uuid':room_uid})
                })
            })
      })
  }

  let create_whiteboard_room = () => {
    fetch('https://api.netless.link/v5/rooms',{
        method: 'POST',
        headers:{
            'Content-Type': 'application/json',
            'region':'us-sv',
            'token':'NETLESSSDK_YWs9UHI2SjR2T3RHUlBCai1fMSZub25jZT0yNTYwMTIzMC0zYjdjLTExZWQtODE5MC02ZDgwYzBkMGU1YmEmcm9sZT0wJnNpZz04NzdhZmY1YWE0YTUxYjczNjEzYTVlMjgzYmY3NDFhNTQyYTJiZTU5MjkyZGM2NTY4Yjg5NDJiMzYxNzBlMWY0'
        },
        body: JSON.stringify({
          'isRecord': false
        })
        }).then(response => {
        return response.json().then(data => {
            generate_room_token(data.uuid);
        })
      })
  }

if (meeting_token != user_token) {
    fetch(`/whiteboardDetails/?room_name=${meeting_token}`,{
        method: 'GET'
    }).then((response) => {
        return response.json().then((data) => {
            console.log(data);
            open_whiteboard(data.room_token, data.room_uuid);
        })
    })
}else {
    create_whiteboard_room();
}


let clicker = () => {
    room.setMemberState(
        {currentApplianceName: 'clicker',
         shapeType: 'pentagram',
         strokeColor: [255,182,200],
         strokeWidth: 12,
         textSize: 40,});
}

let eraser = () => {
  room.setMemberState(
      {currentApplianceName: 'eraser',
       shapeType: 'pentagram',
       strokeColor: [255,182,200],
       strokeWidth: 12,
       textSize: 40,});
}

let text = () => {
  room.setMemberState(
    {currentApplianceName: 'text',
     shapeType: 'pentagram',
     strokeColor: [255,182,200],
     strokeWidth: 12,
     textSize: 40,});
}

let pen = () => {
  room.setMemberState(
      {currentApplianceName: 'pencil',
       shapeType: 'pentagram',
       strokeColor: [0,0,0],
       strokeWidth: 6,
       textSize: 40,});
}

let hand = () => {
  room.setMemberState(
      {currentApplianceName: 'hand',
       shapeType: 'pentagram',
       strokeColor: [255,182,200],
       strokeWidth: 12,
       textSize: 40,});
}

let redo = () => {
  room.redo();
}

let undo = () => {
    room.undo()
}

let clearBoard = () => {
    room.cleanCurrentScene();
}


let upload_image = () => {
    document.getElementById('photo').click();
}

let uploadFile = (self) => {
    if (self.files) {
        document.getElementById('uploadProgress').style.display = "flex";
        var form = new FormData();
        form.append("image",self.files[0]);

        var xhr = new XMLHttpRequest();

        xhr.upload.onloadstart = () => {
            document.getElementById('uploadProgress').style.display = "flex";
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
                var imageUrl = data.imageUrl;
                var image_information = {centerX:5,centerY:5,height:300,locked:false, uuid:data.uuid,width:300};
                room.insertImage(image_information);
                room.completeImageUpload(data.uuid,data.imageUrl);
                document.getElementById('uploadProgress').style.display = "none";
            }
        }

        xhr.open('POST',window.location);
        xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
        xhr.setRequestHeader('X-Requested-With','XMLHttpRequest');
        xhr.send(form);
    }
}