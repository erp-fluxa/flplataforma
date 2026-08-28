@echo off
title Fluxa ERP Industrial
echo Iniciando Fluxa ERP no servidor HTTP local...
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
