@echo off
echo ======================================
echo HABILITAR FIREBASE STORAGE
echo ======================================
echo.
echo 1. Abre este link en tu navegador:
echo    https://console.firebase.google.com/project/cmn-registrosqr/storage
echo.
echo 2. Click en "Get Started"
echo 3. Selecciona "Production mode"
echo 4. Location: us-central1
echo 5. Click "Done"
echo.
echo Presiona cualquier tecla despues de habilitar Storage...
pause
echo.
echo Desplegando reglas de Storage a Firebase...
firebase deploy --only storage
echo.
echo LISTO!
pause
