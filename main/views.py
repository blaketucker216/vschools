from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.http import JsonResponse
from main.models import account_info, Room, Room_member, Room_message, whiteboard_files, MeetingWhiteboard, RecordedFiles
from datetime import date, timedelta, datetime
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from django.contrib.sites.shortcuts import get_current_site
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str, force_text, DjangoUnicodeDecodeError
from .utils import *
from django.core.mail import EmailMessage
import json
import random
import re
import secrets
import time
import uuid
from agora_token_builder import RtcTokenBuilder
import base64
import http.client
from background_task import background
import boto3
import os


def getToken(request):
    appId = '0eb3e08e01364927854ee79b9e513819'
    appCertificate = 'f2fdb8604d8b47a9bc71dcd5606f1d7e'
    channelName = request.GET.get('channel')
    uid = request.user.id
    expirationTimeInSeconds = 3600 * 24
    currentTimeStamp = time.time()
    privilegeExpiredTs = currentTimeStamp + expirationTimeInSeconds
    role = 1

    token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs)
    return JsonResponse({'token':token}, safe=False)

def join_session(request):
    data = request.GET
    passcode = data['passcode']
    if any(Room.objects.filter(passcode=passcode)):
        return JsonResponse({'meeting_id':Room.objects.get(passcode=passcode).room_name}, safe=False)
    else:
        return JsonResponse({'not_found':True}, safe=False)

def login_page(request):
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == 'POST':
        user = authenticate(username=request.POST['username'],password=request.POST['password'])
        if user is not None:
            login(request, user)
            return redirect('home')
        else:
            messages.info(request, """Dear user your details are incorrect please check them and try again
                        or follow the forgot password link if you have forgoten your password.""")

    return render(request, "login.html")

def update_username(request):
    data = json.loads(request.body)
    first_name = data['first_name']
    last_name = data['last_name']
    username = first_name + ' ' + last_name
    user = User.objects.get(id=request.user.id)
    user.first_name = first_name
    user.last_name = last_name
    user.username = username
    user.save()
    return JsonResponse({'first_name':first_name,'last_name':last_name,'username':username}, safe=False)

def update_password(request):
    data = json.loads(request.body)
    current_password = data['current_password']
    password_one = data['password_one']
    password_two = data['password_two']
    user = User.objects.get(id=request.user.id)
    
    if password_one == password_two:
        user.set_password('password_two')
        user.save()
    
    return JsonResponse({'password_changed':True})

@login_required(login_url='login')
def whiteboard_page(request, meeting_id):
    if request.method == "POST":
        if request.FILES:
            item = whiteboard_files(room_name=meeting_id,file=request.FILES['image'])
            item.save()
            return JsonResponse({'imageUrl':item.file.url,'uuid':secrets.token_urlsafe(4)}, safe=False)
        
    if request.is_ajax:
        if request.body:
            data = json.loads(request.body)
            room_token = data['room_token']
            room_uuid = data['room_uuid']

            room = Room.objects.get(room_name=meeting_id)

            item = MeetingWhiteboard.objects.get(room=room)
            item.room_token=room_token
            item.room_uuid = room_uuid
            item.save()

    user_token = account_info.objects.get(user=request.user).user_token
    request.user.user_token = user_token
    request.meeting_token = meeting_id

    return render(request, 'whiteboard.html')

def whiteboardDetails(request):
    data = request.GET
    room_name = data['room_name']
    room = Room.objects.get(room_name=room_name)
    item = MeetingWhiteboard.objects.get(room=room)

    response = {'room_token':item.room_token,'room_uuid':item.room_uuid}

    return JsonResponse(response, safe=False)

def UpdateWhiteboardDetails(request):
    return JsonResponse({'updated':True}, safe=False)

@login_required(login_url='login')
def ask_delete_page(request):
    return render(request, "ask_delete.html")

@login_required(login_url='login')
def studio_page(request):
    return render(request,"studio.html")

@login_required(login_url='login')
def settings_page(request):
    user = request.user
    context = {'user':user}
    user.token = account_info.objects.get(user=user).user_token

    if account_info.objects.get(user=request.user).profile_picture:
        user.profile_picture = account_info.objects.get(user=request.user).profile_picture

    if request.method == "POST":
        if request.FILES: 
            item = account_info.objects.get(user=request.user)
            item.profile_picture = request.FILES['image']
            item.save()
    
    return render(request,"settings_page.html",context)

def password_changed(request):
    return render(request,"password_changed.html")

def email_verification_page(request):
    return render(request, "email_verification.html")

def verify_email_page(request):
    return render(request, 'verify_email_page.html')

def verify_email(request, token):
    try:
        obj = account_info.objects.get(email_token=token)
        obj.email_verified = True
        obj.save()
        return redirect('get_started')
    except Exception as e:
        print('invalid token')    

def sign_up_page(request):
    if request.user.is_authenticated:
        return redirect('home')
        
    if request.method == "POST":
        first_name = request.POST['first_name']
        last_name = request.POST['last_name']
        password_one = request.POST['password_one']
        password_two = request.POST['password_two']
        email = request.POST['email']
        username = first_name + " " + last_name

        if not any([email == item.email for item in User.objects.all()]):
            if password_one == password_two:
                user = User.objects.create_user(username,email,password_two)
                user.first_name = first_name
                user.last_name = last_name
                email_token = str(uuid.uuid4())
                user.save()
                account_info(user=user,datejoined=timezone.now(),
                        user_token=secrets.token_urlsafe(), email_token=email_token).save()
                room = Room(room_name=account_info.objects.get(user=user).user_token)
                room.save()
                MeetingWhiteboard(room=room).save()

                verification_link = 'https://' + str(get_current_site(request))+'/verify/'+email_token

                message = 'Please click this link to verify your email ' + verification_link
                
                send_email_token(email, email_token, message)
                
                return redirect('verify_email_page')

    return render(request,"sign_up.html")

def new_password_page(request):
    if request.method == "POST":
        if request.POST["password1"] == request.POST["password2"]:
            username = request.session['vschools_first_name'] + " " + request.session["vschools_last_name"]
            first_name = request.session['vschools_first_name'] 
            last_name = request.session["vschools_last_name"]
            #new_user=User.objects.create_user(username=username,email=request.session['vschools_email'],
                                        #password=request.POST['password2'])

            new_user=User.objects.create_user(username=username,first_name=first_name,last_name=last_name,email=request.session['vschools_email'],
                                        password=request.POST['password2'])
            new_user.save()

            account_info(user=new_user,datejoined=date.today()).save()

            user = authenticate(username=username,password=request.POST["password2"])

            if user is not None:
                login(request, user)
                del request.session["vschools_first_name"]
                del request.session["vschools_last_name"]
                del request.session["vschools_email"]
                return redirect("get_started") 
    return render(request,"new_password.html")

@login_required(login_url='login')
def person_info_page(request,user_token):
    user_id = account_info.objects.get(user_token=user_token).user.id
    person = account_info.objects.get(user=User.objects.get(id=user_id))

    context = {'person':person}

    return render(request,"person.html",context)

def guest_page(request):
    return render(request, "guest.html")

@login_required(login_url='login')
def meeting_auth(request, meeting_id):
    return render(request, 'meeting_auth.html')

@login_required(login_url='login')
def schedule_meeting(request):
    request.profile_picture = account_info.objects.get(user=request.user).profile_picture
    return render(request, 'schedule_meeting.html')

@login_required(login_url='login')
def recorded_files(request, meeting_id):
    files = RecordedFiles.objects.filter(user=request.user)
    context = {'files':files}

    return render(request, 'recorded_files.html', context)

@login_required(login_url='login')
def uploaded_files(request, meeting_id):
    room = Room.objects.get(room_name=meeting_id)
    objects = Room_message.objects.filter(room=room)

    context = {'files':objects}

    return render(request, 'uploaded_files.html', context)

def meet_page(request, meeting_id):
    user_details = {}

    try:
        if request.user.is_authenticated:
            user_details['profile_picture'] = account_info.objects.get(user=request.user).profile_picture
    except:
        pass

    if request.method == 'POST':
        if request.FILES:
            if request.user.is_authenticated:
                room = Room.objects.get(room_name=meeting_id)
                room_member = Room_member.objects.get(id=int(request.POST['uid']))
                item = Room_message(room=room,room_member=room_member,
                    file=request.FILES['image'],file_type=request.POST['fileType'],
                    file_name=request.POST['fileName'],time=timezone.now())
                item.save()
                return JsonResponse({'fileUrl':item.file.url}, safe=False)
        else:
            video_file_name = request.POST['video_file_name']

            RecordedFiles(User=request.user, fileUrl=video_file_name).save()

    customer_key = "a0a3bcfe4bf24cb48e5ace72855058cc"
    customer_secret = "35c8f03349184c40932e03d531c06de5"
    credentials = customer_key + ":" + customer_secret
    base64_credentials = base64.b64encode(credentials.encode("utf8"))
    credential = base64_credentials.decode("utf8")

    room_chats = Room_message.objects.filter(room=Room.objects.get(room_name=meeting_id))

    for item in room_chats:
        item.profile_picture = account_info.objects.get(user=item.room_member.user).profile_picture

    context = {'profile_picture':user_details.get('profile_picture','/media/no_profile_Pic.jpeg'),
                'host_profile_pic':account_info.objects.get(user_token=meeting_id).profile_picture,
                'meeting_link':'https://'+str(get_current_site(request))+'/meet/'+meeting_id,
                'host_username':account_info.objects.get(user_token=meeting_id).user.username,
                'authorization': credential,'room_chats':room_chats}
    request.user.user_token = meeting_id
    request.meeting_description = Room.objects.get(room_name=meeting_id).description
    request.meeting_passcode = Room.objects.get(room_name=meeting_id).passcode

    return render(request, "meet.html",context)

@background(schedule=10)
def notify_user():
    print('hello this is your scheduled message')

@login_required(login_url='login')
def home_page(request):
    notify_user()
    if request.method == "POST":
        meeting_title = request.POST['meeting_title']
        room = Room.objects.get(room_name=account_info.objects.get(user=request.user).user_token)
        room.description = meeting_title.capitalize()
        room.passcode = secrets.token_urlsafe(4)
        room.start_date = timezone.now()
        room.save()
        return redirect('meet',account_info.objects.get(user=request.user).user_token)

    context = {'profile_picture':account_info.objects.get(user=request.user).profile_picture,
                'user_token':account_info.objects.get(user=request.user).user_token,'current_time':timezone.now()}
    return render(request, "home.html", context)

@login_required(login_url='login')
def get_started_page(request):
    return render(request, "get_started.html")

def logout_user(request):
    logout(request)
    return redirect('login')

def test_page(request):
    customer_key = "a0a3bcfe4bf24cb48e5ace72855058cc"
    customer_secret = "35c8f03349184c40932e03d531c06de5"
    credentials = customer_key + ":" + customer_secret
    base64_credentials = base64.b64encode(credentials.encode("utf8"))
    credential = base64_credentials.decode("utf8")

    appId = '0eb3e08e01364927854ee79b9e513819'
    appCertificate = 'f2fdb8604d8b47a9bc71dcd5606f1d7e'
    channelName = 'uiuiubui'
    uid = 57687
    expirationTimeInSeconds = 3600 * 24
    currentTimeStamp = time.time()
    privilegeExpiredTs = currentTimeStamp + expirationTimeInSeconds
    role = 1

    token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs)

    context = {'authorization':credential,'token':token}

    return render(request, "test.html",context)

def meeting_ended(request):
    return render(request, "meeting_ended.html")

def live_stream_ended(request):
    return render(request, "live_stream_ended.html")





