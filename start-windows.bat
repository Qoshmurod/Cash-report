@echo off
setlocal
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker topilmadi. Docker Desktop o'rnating.
  pause
  exit /b 1
)
if not exist .env (
  echo .env fayli topilmadi. Avval .env.example faylidan .env nusxa oling va sirlarni toldiring.
  pause
  exit /b 1
)
echo Clinika ishga tushmoqda...
docker compose up --build -d
if errorlevel 1 (
  echo Ishga tushirishda xatolik yuz berdi.
  pause
  exit /b 1
)
echo.
echo Tayyor: http://localhost:8080
echo Kirish uchun .env faylida belgilangan OWNER_LOGIN va OWNER_PASSWORD dan foydalaning.
pause
