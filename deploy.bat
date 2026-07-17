@echo off
title Automação de Deploy
echo ===================================================
echo             SISTEMA DE DEPLOY RAPIDO
echo ===================================================
echo.

:: Pede para o usuario digitar a mensagem do commit
set /p mensagem="Digite o que voce alterou (mensagem do commit): "

echo.
echo [1/3] Adicionando arquivos...
git add .

echo.
echo [2/3] Criando o pacote (commit)...
git commit -m "%mensagem%"

echo.
echo [3/3] Enviando para o GitHub...
git push

echo.
echo ===================================================
echo        Tudo pronto! Deploy enviado com sucesso.
echo ===================================================
echo.
pause