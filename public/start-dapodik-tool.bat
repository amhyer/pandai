@echo off
title PANDAI - Tarik Data Dapodik Lokal
color 0A
echo.
echo  ================================================================
echo     PANDAI - Alat Tarik Data Dapodik Lokal v2.1
echo     by NALAR
echo  ================================================================
echo.

:: Check Python installation
where python >nul 2>&1
if %errorlevel% neq 0 (
    where python3 >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [ERROR] Python tidak ditemukan!
        echo.
        echo  Python dibutuhkan untuk menjalankan alat ini.
        echo  Silakan download dan install Python terlebih dahulu:
        echo  https://www.python.org/downloads/
        echo.
        echo  Saat install, CENTANG "Add Python to PATH"
        echo.
        pause
        exit /b 1
    ) else (
        set PYTHON=python3
    )
) else (
    set PYTHON=python
)

echo  [OK] Python ditemukan: %PYTHON%
echo.

:: Get the directory where this .bat file is located
set SCRIPT_DIR=%~dp0

:: Run the Python script from the same directory
cd /d "%SCRIPT_DIR%"
"%PYTHON%" "%SCRIPT_DIR%dapodik.py"

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Gagal menjalankan alat. Error code: %errorlevel%
    echo.
    pause
)
