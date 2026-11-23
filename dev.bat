@echo off
rem ============================================================
rem  Sputnik Academy - local development (Windows)
rem
rem  Usage:
rem    dev.bat                     start runserver
rem    dev.bat migrate             apply migrations
rem    dev.bat check               check settings
rem    dev.bat createsuperuser     create admin user
rem    dev.bat shell               django shell
rem    dev.bat collectstatic       collect static files
rem
rem  NOTE: never use plain "python". It is the system Python
rem  and it has no project packages. Always use muhit\Scripts.
rem ============================================================
cd /d "%~dp0"

if not exist "muhit\Scripts\python.exe" (
    echo [ERROR] virtual env not found: muhit\Scripts\python.exe
    echo         create it with: python -m venv muhit
    exit /b 1
)

if "%~1"=="" (
    echo [INFO] server starting at http://127.0.0.1:8000
    echo [INFO] press Ctrl+C to stop
    echo.
    "muhit\Scripts\python.exe" manage.py runserver
) else (
    "muhit\Scripts\python.exe" manage.py %*
)
exit /b %ERRORLEVEL%
