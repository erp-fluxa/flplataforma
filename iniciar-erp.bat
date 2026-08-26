@echo off
title JP3D ERP Industrial (Gescomp)
echo Iniciando JP3D ERP no servidor HTTP local...
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
