# Generated by Django 3.2.3 on 2022-05-11 08:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0002_alter_room_room_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='start_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
