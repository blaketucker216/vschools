const form = document.getElementById('form');
form.addEventListener('submit',() => {
    var button = form.lastElementChild;
    button.innerHTML = "SUBMITTING....";
    button.setAttribute('disabled','');
    button.style.color = 'rgba(255, 255, 255, 0.889)';
})

function submit(){
    document.getElementById('form').lastElementChild.click();
}