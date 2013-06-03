
var fs = require('fs');

var _root = '.';
var _tempDir = '.';
var _diffRoot = '/tmp/diff';  // hope this value is never used
var _failRoot = '/tmp/fail';  // hope this value is never used

var _verbose = false;
var _count = 0;
var _realPath;
var _diffsToProcess = [];
var _emptyPageToRunTestsOn;
var _libraryRoot = '.';
var exitStatus;
var _hideElements;

exports.screenshot = screenshot;
exports.compareAll = compareAll;
exports.init = init;
exports.turnOffAnimations = turnOffAnimations;
exports.getExitStatus = getExitStatus;

function out (s) {
    fs.write('/dev/stdout', s, 'w');
}

function init(options){
    casper = options.casper || casper;
    _emptyPageToRunTestsOn = options.testRunnerUrl;
    _libraryRoot = options.libraryRoot || _libraryRoot;
    _root = options.baselineRoot || _root;
    _tempDir = options.tempDir || _tempDir;
    _fileNameGetter = options.fileNameGetter || _fileNameGetter;

    _diffRoot = _tempDir + "/diff";
    _failRoot = _tempDir + "/fail";

    _onPass = options.onPass || _onPass;
    _onFail = options.onFail || _onFail;
    _onTimeout = options.onTimeout || _onTimeout;
    _onComplete = options.onComplete || options.report || _onComplete;

    _hideElements = options.hideElements;

    // can't use || shorthand, because false will fall-through
    if (options.verbose) {
        _verbose = true;
    }

    // wipe failures and diffs
    fs.removeTree(_diffRoot);
    fs.removeTree(_failRoot);
}

function turnOffAnimations() {
    console.log('Turning off animations');
    casper.evaluate(function turnOffAnimations(){
        window.addEventListener('load', function(){
            var css = document.createElement("style");
            css.type = "text/css";
            css.innerHTML = "* { -webkit-transition: none !important; transition: none !important; }";
            document.body.appendChild(css);

            if(jQuery){
                $.fx.off = true;
            }
        },false);
    });
}

function _fileNameGetter(root, filename) {
    if (!filename) {
        filename = 'screenshot_' + _count++;
    }
    var name = _root + "/" + filename + ".png";

    if (fs.isFile(name)) {
        return _diffRoot + "/" + filename + ".png";
    } else {
        return name;
    }
}

function screenshot(selector, timeToWait, hideSelector, fileName) {
    casper.captureBase64('png'); // force pre-render
    casper.wait(timeToWait || 250, function() {

        if (hideSelector || _hideElements) {
            casper.evaluate(function(s1, s2){
                if(s1){
                    $(s1).css('visibility', 'hidden');
                }
                $(s2).css('visibility', 'hidden');
            }, {
                s1: _hideElements,
                s2: hideSelector
            });
        }
        try{
            casper.captureSelector(_fileNameGetter(_root, fileName), selector);
        }
        catch(ex){
            console.log("Screenshot FAILED: " + ex.message);
        }
    }); // give a bit of time for all the images appear
}

function asyncCompare(one, two, func) {

    if(!casper.evaluate(function(){ return window._imagediff_;})){
        initClient();
    }
    casper.fill('form#image-diff', {
        'one': one,
        'two': two
    });
    casper.evaluate(function(filename){
        window._imagediff_.run(filename);
    }, {
        label: one
    });
    casper.waitFor(
        function check() {
            return this.evaluate(function(){
                return window._imagediff_.hasResult;
            });
        },
        function () {
            var mismatch = casper.evaluate(function(){
                return window._imagediff_.getResult();
            });

            if(Number(mismatch)){
                func(false, mismatch);
            } else {
                func(true);
            }

        }, function(){
            func(false);
        },
        10000
    );
}

function getDiffs (path){
    var filePath;

    //if (({'..':1,'.':1})[path]) {
    if ( path == '..' || path == '.') {
        return true;
    }
    if (_realPath) {
        _realPath += fs.separator + path;
    } else {
        _realPath = path;
    }
    filePath = _diffRoot + fs.separator + _realPath;

    if (fs.isDirectory(filePath)) {
        fs.list(filePath).forEach(getDiffs);
    } else {
        _diffsToProcess.push(_realPath);
    }
    _realPath = _realPath.replace(fs.separator + path, '');
}

function compareAll(){
    var tests = [];
    var fails = 0;
    var errors = 0;

    getDiffs('');

    _diffsToProcess.forEach(function(file){
        var baseFile = _root + "/" + file;
        var diffFile = _diffRoot + "/" + file;
        var test = {
            filename: file
        };

        if(!fs.isFile(baseFile)) {
            test.error = true;
            errors++;
            tests.push(test);
        } else {
            casper.
            thenOpen (_emptyPageToRunTestsOn, function (){
                asyncCompare(baseFile, diffFile, function(isSame, mismatch){

                    if(!isSame){

                        test.fail = true;
                        fails++;

                        if(mismatch){
                            test.mismatch = mismatch;
                            _onFail(test);
                        } else {
                            _onTimeout(test);
                        }

                        casper.waitFor(
                            function check() {
                                return casper.evaluate(function(){
                                    return window._imagediff_.hasImage;
                                });
                            },
                            function () {

                                var failFile = _failRoot + "/" + file;
                                var safeFileName = failFile;
                                var increment = 0;

                                while (fs.isFile(safeFileName) ){
                                    increment++;
                                    safeFileName = failFile + '.' + increment;
                                }
                                failFile = safeFileName;

                                casper.evaluate(function(){
                                    window._imagediff_.hasImage = false;
                                });

                                casper.captureSelector(failFile, 'img');
                            }, function(){},
                            10000
                        );
                    } else {
                        _onPass(test);
                    }

                    tests.push(test);
                });
            });
        }
    });

    casper.then(function(){
        casper.waitFor(function(){
            return _diffsToProcess.length === tests.length;
        }, function(){
            _onComplete(tests, fails, errors);
        }, function(){},
        10000);
    });
}

function initClient(){

    casper.page.injectJs(_libraryRoot+'/resemble.js');

    casper.evaluate(function(){

        var result;

        var div = document.createElement('div');

        // this is a bit of hack, need to get images into browser for analysis
        div.style = "display:block;position:absolute;border:0;top:-1px;left:-1px;height:1px;width:1px;overflow:hidden;";
        div.innerHTML = '<form id="image-diff">'+
            '<input type="file" id="image-diff-one" name="one"/>'+
            '<input type="file" id="image-diff-two" name="two"/>'+
        '</form><div id="image-diff"></div>';
        document.body.appendChild(div);

        window._imagediff_ = {
            hasResult: false,
            hasImage: false,
            run: run,
            getResult: function(){
                window._imagediff_.hasResult = false;
                return result;
            }
        };

        function run(label){

            function render(data){
                document.getElementById('image-diff').innerHTML = '<img src="'+data.getImageDataUrl(label)+'"/>';
                window._imagediff_.hasImage = true;
            }

            resemble(document.getElementById('image-diff-one').files[0]).
                compareTo(document.getElementById('image-diff-two').files[0]).
                ignoreAntialiasing(). // <-- muy importante
                onComplete(function(data){
                    var diffImage;

                    if(Number(data.misMatchPercentage) > 0.05){
                        result = data.misMatchPercentage;
                    } else {
                        result = false;
                    }

                    window._imagediff_.hasResult = true;

                    if(Number(data.misMatchPercentage) > 0.05){
                        render(data);
                    }

                });
        }
    });
}

function _onPass(test){
    out(".");
}
function _onFail(test){
    if (_verbose) {
        // original output text
        console.log('FAILED: ('+test.mismatch+'% mismatch)', test.filename, '\n');
    } else {
        // console-friendly, non-verbose reporting
        out("F");
    }
}
function _onTimeout(test){
    if (_verbose) {
        // original output text
        console.log('TIMEOUT: ', test.filename, '\n');
    } else {
        // console-friendly, non-verbose reporting
        out("E");
    }
}
function _onComplete(tests, noOfFails, noOfErrors){

    if (_verbose) {
        // the original output text
        if( tests.length === 0){
            console.log("\nMust be your first time?");
            console.log("Some screenshots have been generated in the directory " + _root);
            console.log("This is your 'baseline', check the images manually. If they're wrong, delete the images.");
            console.log("The next time you run these tests, new screenshots will be taken.  These screenshots will be compared to the original.");
            console.log('If they are different, PhantomCSS will report a failure.');
        } else {

            console.log("\nPhantomCSS found: " + tests.length + " tests.");

            if(noOfFails === 0){
                console.log("None of them failed. Which is good right?");
                console.log("If you want to make them fail, go change some CSS - weirdo.");
            } else {
                console.log(noOfFails + ' of them failed.');
                console.log('PhantomCSS has created some images that try to show the difference (in the directory ' + _failRoot + '). Fuchsia colored pixels indicate a difference betwen the new and old screenshots.');
            }

            if(noOfErrors !== 0){
                console.log("There were " + noOfErrors + "errors.  Is it possible that a baseline image was deleted but not the diff?");
            }

            exitStatus = noOfErrors+noOfFails;
        }
    } else {
        // non-verbose, console-friendly test results
        console.log('');
        if (noOfFails > 0) {
            var e = noOfErrors + ' error' + (noOfErrors == 1 ? ' ' : 's.');
            var f = noOfFails + ' failure' + (noOfFails == 1 ? ' ' : 's.');
            console.log(f + " " + e);
            tests.forEach(function(test){
                if(test.fail){
                    console.log("FAILURE: " + test.filename);
                }
            });
        } else {
            console.log('SUCCESS.');
        }
    }
}

function getExitStatus() {
    return exitStatus;
}
