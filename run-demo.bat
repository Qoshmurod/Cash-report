@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Klinika Kassasi demo ===
docker info >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop ishlamayapti. Uni oching, 1 daqiqa kuting va qayta ishga tushiring.
  pause
  exit /b 1
)
if not exist .env copy .env.demo .env >nul
echo Dastur yig'ilmoqda va ishga tushmoqda (birinchi marta 3-8 daqiqa)...
docker compose up -d --build
if errorlevel 1 (
  echo Xatolik yuz berdi. Yuqoridagi xabarni nusxalab yuboring.
  pause
  exit /b 1
)
echo Dastur javob berishi kutilmoqda...
for /l %%i in (1,1,60) do (
  curl -s -o nul http://localhost:3000/ && goto ready
  timeout /t 3 /nobreak >nul
)
echo Dastur 3 daqiqada javob bermadi. Logni ko'rish: docker compose logs app
pause
exit /b 1
:ready
start "" http://localhost:3000
echo.
echo TAYYOR: http://localhost:3000
echo Login: admin01   Parol: admin01
echo To'xtatish: docker compose down
pause
