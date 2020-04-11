@echo off

set RESERVED_NAME="^onCancel"

FOR /d %%f IN (.\*) DO (
    echo Obfuscating %%f
    javascript-obfuscator "%%f\script.js" --compact true --string-array true --self-defending true --unicode-escape-sequence true --reserved-names %RESERVED_NAME% -o "%%f\script.min.js"
    @echo off
)