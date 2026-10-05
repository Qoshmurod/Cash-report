@echo off
if not exist backups mkdir backups
docker compose exec -T db pg_dump -U clinika -d clinika > backups\clinika-backup.sql
echo Backup saqlandi: backups\clinika-backup.sql
pause
