@echo off
rem Abre o Lubian Gestao neste computador. Dois cliques para abrir; fechar esta janela encerra o sistema.
title Lubian Gestao
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js 22 LTS em https://nodejs.org e abra de novo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Primeira vez: instalando o sistema. Precisa de internet so agora...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run iniciar
pause
