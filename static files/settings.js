var image_cropper;

function get_photo(){
    var file_button = document.getElementById('photo');
    file_button.click();
}

function crop_photo(self){
    if (self.files){
        var file_reader = new FileReader();
        file_reader.onloadend = function(response){
            const image = document.getElementById('picture');
            image.setAttribute('src',response.currentTarget.result);
            const cropper = new Cropper(image, {
                aspectRatio: 9 / 9,
                crop(event) {},
                })
                image_cropper = cropper;
                document.getElementById('cropper_holder').style.display = "flex";
        }
        file_reader.readAsDataURL(self.files[0]);
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function crop(){
    image_cropper.getCroppedCanvas().toBlob((blob) => {
        var form = new FormData();
        form.append("image",blob);
        fetch(window.location,{
            method: "POST",
            headers: { 'Accept': 'application/json',
                    "X-CSRFToken": getCookie('csrftoken'),
                    'X-Requested-With':'XMLHttpRequest'},
            body: form
        })
        var image = document.createElement('img');
        image.setAttribute('src',URL.createObjectURL(blob));
        var parent = Array.from(document.getElementsByClassName('info_holder'))[0].firstElementChild;
        var child = Array.from(document.getElementsByClassName('info_holder'))[0].firstElementChild.firstElementChild;
        parent.replaceChild(image,child);
    })
    document.getElementById('cropper_holder').style.display = "none";
}

let change_password = (ev) => {
    ev.preventDefault();
    var current_password = document.getElementById('password_form').children[1].value;
    var password_one = document.getElementById('password_form').children[2].value;
    var password_two = document.getElementById('password_form').children[3].value;
    var button = document.getElementById('password_form').lastElementChild;
    button.innerHTML = "Updating...";
    fetch('/update_password/',{
        method: 'POST',
        headers: { 'Accept': 'application/json',
                'X-Requested-With':'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')},
        body: JSON.stringify({'current_password':current_password,'password_one':password_one,'password_two':password_two})
    }).then(response => {
        return response.json().then(data => {
            setTimeout(() => {
                button.innerHTML = "Save changes";
            }, 3000)
        })
    })
}

let change_username = (ev) => {
    ev.preventDefault();
    var first_name = document.getElementById('info_form').children[1].value;
    var last_name = document.getElementById('info_form').children[2].value;
    var button = document.getElementById('info_form').lastElementChild;
    button.innerHTML = "Updating...";
    fetch('/update_username/',{
        method: 'POST',
        headers: { 'Accept': 'application/json',
                'X-Requested-With':'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')},
        body: JSON.stringify({'first_name':first_name,'last_name':last_name})
    }).then(response => {
        return response.json().then(data => {
            setTimeout(() => {
                document.getElementById('username').innerHTML = data.username;
                button.innerHTML = "Save changes";
            }, 3000)
        })
    })
}