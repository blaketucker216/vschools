# Generated by Django 3.2.3 on 2022-10-26 04:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0020_alter_room_message_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='room_message',
            name='file_type',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
    ]
