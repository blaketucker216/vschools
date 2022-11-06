let form = document.getElementById('form');

let FormHandler = async (e) => {
    e.preventDefault();
    fetch('/get_token/',{
        method: 'GET'
    }).then(response => {
        return response.json().then(data => {
            let uid = data.uid;
            let token = data.token;
            let room = data.room;
            sessionStorage.setItem('uid',uid);
            sessionStorage.setItem('token',token);
            sessionStorage.setItem('room',room);
            sessionStorage.setItem('role','host');
            window.open('/meet/','_self');
        })
    })
}


form.addEventListener('submit',FormHandler)