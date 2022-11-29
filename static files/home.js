function create_meeting(self){
    window.open(`/meet/${self.dataset.user_token}`,'_self');

}

let join_meeting = (self) => {
    self.preventDefault();
    self.innerHTML = "Checking meeting..."
    var passcode = self.target.firstElementChild.value;
    var button = self.target.lastElementChild;
    button.style.color = 'rgba(245, 245, 245, 0.44)';

    fetch(`/join_session/?passcode=${passcode}`,{
        method: 'GET'
    }).then(response => {
        return response.json().then(data => {
            if (data.meeting_id){
                button.innerHTML = "joining session....";
                window.open(`/meet/${data.meeting_id}`,'_self');
            }else {
                button.innerHTML = "Meeting not found";
                setTimeout(() => {button.innerHTML = "Join meeting"; self.target.firstElementChild.value = ""},4000)
            }
        })
    })
}