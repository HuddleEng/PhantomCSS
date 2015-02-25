@ECHO OFF
set CASPER_PATH=%~dp0libs\CasperJs
set CASPER_BIN=%CASPER_PATH%\bin\
set PHANTOMJS=%~dp0libs\PhantomJs\phantomjs.exe
set ARGV=%*
set IS_SLIMERJS="false"

for %%a in (%*) do (
    if %%a equ slimerjs (
    	set IS_SLIMERJS="true"
    )
)

if %IS_SLIMERJS% equ "false" (
    call "%PHANTOMJS%" "%CASPER_BIN%bootstrap.js" --casper-path="%CASPER_PATH%" --cli %ARGV%
) else (
	call slimerjs "%CASPER_BIN%bootstrap.js" --casper-path="%CASPER_PATH%" --cli %ARGV%
)