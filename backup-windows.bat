@echo off
setlocal
if not exist .env (
  echo .env fayli topilmadi.
  exit /b 1
)
if not exist backups mkdir backups
for /f "delims=" %%i in ('docker compose exec -T db printenv POSTGRES_USER') do set "DB_USER=%%i"
for /f "delims=" %%i in ('docker compose exec -T db printenv POSTGRES_DB') do set "DB_NAME=%%i"
if not defined DB_USER (
  echo PostgreSQL foydalanuvchisini aniqlab bo'lmadi. Ilova ishlayotganini tekshiring.
  exit /b 1
)
if not defined DB_NAME (
  echo PostgreSQL bazasini aniqlab bo'lmadi. Ilova ishlayotganini tekshiring.
  exit /b 1
)
docker compose exec -T db pg_dump -U "%DB_USER%" -d "%DB_NAME%" > backups\clinika-backup.sql
if errorlevel 1 (
  echo Backup yaratilmadi.
  exit /b 1
)
echo Backup saqlandi: backups\clinika-backup.sql
pause
