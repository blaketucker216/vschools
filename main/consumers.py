import json
import asyncio
import time
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from main.models import Room, Room_member, account_info, Room_message
from django.utils import timezone
from background_task import background
from agora_token_builder import RtcTokenBuilder

appId = '0eb3e08e01364927854ee79b9e513819'
appCertificate = 'f2fdb8604d8b47a9bc71dcd5606f1d7e'

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.role = self.scope['url_route']['kwargs'].get('role','participant')
        self.uid = None
        async_to_sync(self.channel_layer.group_add)(self.room_name, self.channel_name)

        if self.scope['user'].is_authenticated:
            room_member = Room_member(room=Room.objects.get(room_name=self.room_name),user=self.scope['user'],role='participant',
                        time_joined=timezone.now())
            room_member.save()
            self.uid = room_member.id
        else:
            room_member = Room_member(room=Room.objects.get(room_name=self.room_name),role='participant',
                    time_joined=timezone.now())
            room_member.save()
            self.uid = room_member.id

        self.accept()

        room_participants = []

        channelName = self.room_name
        expirationTimeInSeconds = 3600 * 24
        currentTimeStamp = time.time()
        privilegeExpiredTs = currentTimeStamp + expirationTimeInSeconds
        role = 1

        token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, self.uid, role, privilegeExpiredTs)

        for item in Room_member.objects.filter(room=Room.objects.get(room_name=self.room_name)):
            obj = {'role':item.role,'user_joined':True,'uid':item.id}
            print(account_info.objects.get(user=item.user).profile_picture.url)
            try:
                obj['name'] = account_info.objects.get(user=item.user).username
                obj['profile_picture'] = account_info.objects.get(user=item.user).profile_picture.url
                obj['user_token'] = account_info.objects.get(user=item.user).user_token
            except:
                pass
                print(obj)

            room_participants.append(obj)
        
        for item in room_participants:
            async_to_sync(self.channel_layer.group_send)(
                self.room_name,
                {
                    'type':'user_info',
                    'text': json.dumps(item)
                }
        )

        item = {'auth':True, 'token':token, 'id':self.uid}
        self.send(json.dumps(item))

    def disconnect(self, close_code):
        room = Room.objects.get(room_name=self.room_name)
        Room_member.objects.get(room=room,id=self.uid).delete()
        async_to_sync(self.channel_layer.group_discard)(self.room_name, self.channel_name)

    def receive(self, text_data):
        async_to_sync(self.channel_layer.group_send)(
            self.room_name,
            {
                'type':'chat_message',
                'text': text_data
            }
        )

    def chat_message(self, event):
        data = json.loads(event['text'])
        self.send(text_data=json.dumps(data))
        
        if 'message' in data:
            room = Room.objects.get(room_name=self.room_name)
            room_member = Room_member.objects.get(id=data['id'])
            Room_message(room=room,room_member=room_member,message=data['message'],
                time=timezone.now()).save()


    def user_info(self, event):
        data = json.loads(event['text'])
        self.send(text_data=json.dumps(data))

    