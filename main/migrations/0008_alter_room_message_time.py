# Generated by Django 3.2.3 on 2022-08-12 06:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0007_meeting_schedule'),
    ]

    operations = [
        migrations.AlterField(
            model_name='room_message',
            name='time',
            field=models.DateTimeField(),
        ),
    ]
