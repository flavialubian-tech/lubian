@echo off
rem Baixa a versao mais nova do sistema (precisa de internet). Os dados (.data) nao sao mexidos.
title Atualizar Lubian Gestao
cd /d "%~dp0"
echo Feche a janela "Lubian Gestao" antes de continuar.
pause
git pull
if errorlevel 1 (
  echo Nao foi possivel baixar a atualizacao.
  pause
  exit /b 1
)
call npm install
echo.
echo Pronto. Abra o sistema pelo atalho iniciar-lubian.
pause
