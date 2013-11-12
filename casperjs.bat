@ECHO OFF
set CASPER_PATH=%~dp0CasperJs
set CASPER_BIN=%CASPER_PATH%\bin\
set PHANTOMJS=%~dp0PhantomJs\phantomjs.exe
set ARGV=%*
call "%PHANTOMJS%" "%CASPER_BIN%bootstrap.js" test --casper-path="%CASPER_PATH%" --cli %ARGV%