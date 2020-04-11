@echo off

FOR /d %%f IN (.\*) DO (
    echo Cleaning %%f
    del /f "%%f\script.min.js"
    @echo off
)