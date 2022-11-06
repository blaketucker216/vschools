from django.conf import settings
from django.core.mail import send_mail
    

def send_email_token(email, token, message):
    try:
        subject = 'You should verify your email first'
        message = message
        email_from = settings.EMAIL_HOST_USER
        recipient_list = [email]
        send_mail(subject, message, email_from, recipient_list)

    except Exception as e:
        return False