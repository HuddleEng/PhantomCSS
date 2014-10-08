/*
James Cryer / Huddle / 2014
https://github.com/Huddle/PhantomCSS
http://tldr.huddle.com/blog/css-testing/
*/

var fs = require('fs');

var _src = '.'+fs.separator+'screenshots';
var _results; // for backwards compatibility results and src are the same - but you can change it!
var _failures = '.'+fs.separator+'failures';

var _count = 0;
var _realPath;
var _diffsToProcess = [];
var exitStatus;
var _hideElements;
var _addLabelToFailedImage = true;
var _test_match;
var _test_exclude;
var _mismatchTolerance = 0.05;
var _resembleOutputSettings;
var _cleanupComparisonImages = false;
var diffsCreated = [];

var _resemblePath;
var _resembleContainerPath;

exports.screenshot = screenshot;
exports.compareAll = compareAll;
exports.compareMatched = compareMatched;
exports.compareExplicit = compareExplicit;
exports.compareSession = compareSession;
exports.compareFiles = compareFiles;
exports.waitForTests = waitForTests;
exports.init = init;
exports.update = update;
exports.turnOffAnimations = turnOffAnimations;
exports.getExitStatus = getExitStatus;
exports.getCreatedDiffFiles = getCreatedDiffFiles;

function update(options){

	function stripslash ( str ){
		return (str||'').replace(/\/\//g,'/').replace(/\\/g,'\\');
	}

	options = options || {};

	casper = options.casper || casper;

	_resemblePath = getResemblePath(options.libraryRoot || '.');

	_resembleContainerPath = (options.libraryRoot || '.') + fs.separator + 'resemblejscontainer.html'

	_src = stripslash(options.screenshotRoot || _src);
	_results = stripslash(options.comparisonResultRoot || _results || _src);
	_failures = options.failedComparisonsRoot === false ? false : stripslash( options.failedComparisonsRoot || _failures);
	
	_fileNameGetter = options.fileNameGetter || _fileNameGetter;

	_onPass = options.onPass || _onPass;
	_onFail = options.onFail || _onFail;
	_onTimeout = options.onTimeout || _onTimeout;
	_onNewImage = options.onNewImage || _onNewImage;
	_onComplete = options.onComplete || options.report || _onComplete;

	_hideElements = options.hideElements;

	_mismatchTolerance = options.mismatchTolerance || _mismatchTolerance;

	_resembleOutputSettings = options.outputSettings || _resembleOutputSettings;

    _cleanupComparisonImages = options.cleanupComparisonImages || _cleanupComparisonImages;

	if(options.addLabelToFailedImage !== undefined){
		_addLabelToFailedImage = options.addLabelToFailedImage;
	}

	if (_cleanupComparisonImages) {
	   _results += fs.separator + generateRandomString();
	}
}

function init(options){
	update(options);
}

function getResemblePath(root){
	var path = [root,'libs','resemblejs','resemble.js'].join(fs.separator);
	if(!fs.isFile(path)){
		path = [root,'node_modules','resemblejs','resemble.js'].join(fs.separator);
		if(!fs.isFile(path)){
			console.log("[PhantomCSS] Screenshot capture failed: ", ex.message);
		}
	}
	return path;
}

function turnOffAnimations(){
	console.log('[PhantomCSS] Turning off animations');
	casper.evaluate(function turnOffAnimations(){
		
		function disableAnimations(){
			if(jQuery){
				jQuery.fx.off = true;
			}
		
			var css = document.createElement("style");
			css.type = "text/css";
			css.innerHTML = "* { -webkit-transition: none !important; transition: none !important; -webkit-animation: none !important; animation: none !important; }";
			document.body.appendChild(css);
		}

		if (document.readyState !== "loading") {
			disableAnimations();
		} else {
			window.addEventListener('load', disableAnimations, false);
		}
	});
}

function _fileNameGetter(root, fileName){
	var name;

	fileName = fileName || "screenshot";
	name = root + fs.separator + fileName + "_" + _count++;

	if(fs.isFile(name+'.png')){
		return name+'.diff.png';
	} else {
		return name+'.png';
	}
}

	
function screenshot(target, timeToWait, hideSelector, fileName){
	if(isNaN(Number(timeToWait)) && typeof timeToWait === 'string'){
		fileName = timeToWait;
		timeToWait = void 0;
	}

	casper.captureBase64('png'); // force pre-render
	casper.wait(timeToWait || 250, function(){

		var srcPath = _fileNameGetter(_src, fileName);
		var resultPath =  srcPath.replace(_src, _results);

		if(hideSelector || _hideElements){
			casper.evaluate(function(s1, s2){

				if(jQuery){
					if(s1){ jQuery(s1).css('visibility', 'hidden'); }
					if(s2){ jQuery(s2).css('visibility', 'hidden'); }
					return;
				}

				// Ensure at least an empty string
				s1 = s1 || '';
				s2 = s2 || '';

				// Create a combined selector, removing leading/trailing commas
				var selector = (s1 + ',' + s2).replace(/(^,|,$)/g, '');
				var elements = document.querySelectorAll(selector);
				var i        = elements.length;

				while( i-- ){
					elements[i].style.visibility = 'hidden';
				}
			}, {
				s1: _hideElements,
				s2: hideSelector
			});
		}

		capture(srcPath, resultPath, target);

	}); // give a bit of time for all the images appear
}

function capture(srcPath, resultPath, target){
	var originalForResult = resultPath.replace('.diff', '');
	var originalFromSource = srcPath.replace('.diff', '');

	try {

		if( isThisImageADiff(resultPath) ){
			if (isClipRect(target)) {
				casper.capture(resultPath, target);
			} else {
				casper.captureSelector(resultPath, target);
			}
			diffsCreated.push(resultPath);

			if(srcPath !== resultPath){
				// also copy the original over to the result directory
				copyAndReplaceFile(originalFromSource, originalForResult);
			}

		} else {

			if (isClipRect(target)) {
				casper.capture(srcPath, target);
			} else {
				casper.captureSelector(srcPath, target);
			}

			if(srcPath !== resultPath){
				// can't use copyAndReplaceFile yet, so just capture again
				casper.captureSelector(resultPath, target);
			}

			_onNewImage({
				filename: resultPath
			});
		}

	}
	catch(ex){
		console.log("[PhantomCSS] Screenshot capture failed: ", ex.message);
	}
}

function isClipRect(value) {
	return (
		typeof value === 'object' &&
		typeof value.top === 'number' &&
		typeof value.left === 'number' &&
		typeof value.width === 'number' &&
		typeof value.height === 'number'
	);
}

function isThisImageADiff(path){
	return /\.diff\.png/.test(path);
}

function copyAndReplaceFile(src, dest){
	if(fs.isFile(dest)){
		fs.remove(dest);
	}
	fs.copy(src, dest);
}

function asyncCompare(one, two, func){

	if(!casper.evaluate(function(){ return window._imagediff_;})){
		initClient();
	}

	casper.fill('form#image-diff', {
		'one': one,
		'two': two
	});

	casper.evaluate(function(filename){
		window._imagediff_.run( filename );
	}, {
		label: _addLabelToFailedImage ? one : false
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

	if(({'..':1,'.':1})[path]){ return true; }

	if(_realPath){
		_realPath += fs.separator + path;
	} else {
		_realPath = path;
	}

	filePath = _realPath;

	if(fs.isDirectory(_realPath) ){
		fs.list(_realPath).forEach(getDiffs);
	} else {
		if( /\.diff\./.test(path.toLowerCase()) ){
			if(_test_match){
				if( _test_match.test(_realPath.toLowerCase()) ){
					if( !(_test_exclude && _test_exclude.test(_realPath.toLowerCase())) ){
						console.log('[PhantomCSS] Analysing', _realPath);
						_diffsToProcess.push(filePath);
					}
				}
			} else {
				if( !(_test_exclude && _test_exclude.test(_realPath.toLowerCase())) ){
					_diffsToProcess.push(filePath);
				}
			}
		}
	}

	_realPath = _realPath.replace(fs.separator + path, '');
}

function getCreatedDiffFiles(){
	var d = diffsCreated;
	diffsCreated = [];
	return d;
}

function compareMatched(match, exclude){
	// Search for diff images, but only compare matched filenames
	_test_match = typeof match === 'string' ? new RegExp(match) : match;
	compareAll(exclude);
}

function compareExplicit(list){
	// An explicit list of diff images to compare ['/dialog.diff.png', '/header.diff.png']
	compareAll(void 0, list);
}

function compareSession(list){
	// compare the diffs created in this session
	compareAll(void 0, getCreatedDiffFiles() );
}

function compareFiles(baseFile, file) {
	var test = {
		filename: baseFile
	};

	if(!fs.isFile(baseFile)) {
		test.error = true;
	} else {

		if( !fs.isFile(_resembleContainerPath) ){
			console.log('[PhantomCSS] Can\'t find Resemble container. Perhaps the library root is mis configured. ('+_resembleContainerPath+')');
			test.error = true;
			return;
		}

		casper.thenOpen ( _resembleContainerPath , function (){

			asyncCompare(baseFile, file, function(isSame, mismatch){

				if(!isSame){

					test.fail = true;

					casper.waitFor(
						function check() {
							return casper.evaluate(function(){
								return window._imagediff_.hasImage;
							});
						},
						function () {
							var failFile, safeFileName, increment;

							if(_failures){
								// flattened structure for failed diffs so that it is easier to preview
								failFile = _failures + fs.separator + file.split(/\/|\\/g).pop().replace('.diff.png', '').replace('.png', '');
								safeFileName = failFile;
								increment = 0;

								while ( fs.isFile(safeFileName+'.fail.png') ){
									increment++;
									safeFileName = failFile+'.'+increment;
								}

								failFile = safeFileName + '.fail.png';
								casper.captureSelector(failFile, 'img');

								test.failFile = failFile;
								console.log('Failure! Saved to', failFile);
							}

							if (file.indexOf('.diff.png') !== -1) {
								casper.captureSelector(file.replace('.diff.png', '.fail.png'), 'img');
							} else {
								casper.captureSelector(file.replace('.png', '.fail.png'), 'img');
							}
						
							casper.evaluate(function(){
								window._imagediff_.hasImage = false;
							});

							if(mismatch){
								test.mismatch = mismatch;
								_onFail(test); // casper.test.fail throws and error, this function call is aborted
								return;  // Just to make it clear what is happening
							} else {
								_onTimeout(test);
							}

						}, function(){},
						10000
					);
				} else {
                    test.success = true;
					_onPass(test);
				}

			});
		});
	}
    return test;
}

function compareAll(exclude, list){
	var tests = [];

	_test_exclude = typeof exclude === 'string' ? new RegExp(exclude) : exclude;
	
	if (list){
		_diffsToProcess = list;
	} else {
		_realPath = undefined;
		getDiffs(_results);
	}

	_diffsToProcess.forEach(function(file){
		var baseFile = file.replace('.diff', '');
		tests.push(compareFiles(baseFile, file));
	});
	waitForTests(tests);
}

function waitForTests(tests){
	casper.then(function(){
		casper.waitFor(function(){
			return tests.length === tests.reduce(function(count, test){
				if (test.success || test.fail || test.error) {
					return count + 1;
				} else {
					return count;
				}
			}, 0);
		}, function(){
			var fails = 0, errors = 0;
			tests.forEach(function(test){
				if (test.fail){
					fails++;
				} else if (test.error){
					errors++;
				}
			});
			_onComplete(tests, fails, errors);
		}, function(){

		},
		10000);
	});
}

function initClient(){

	casper.page.injectJs(_resemblePath);

	casper.evaluate(function(mismatchTolerance, resembleOutputSettings){
		
		var result;

		var div = document.createElement('div');

		// this is a bit of hack, need to get images into browser for analysis
		div.style = "display:block;position:absolute;border:0;top:-1px;left:-1px;height:1px;width:1px;overflow:hidden;";
		div.innerHTML = '<form id="image-diff">'+
			'<input type="file" id="image-diff-one" name="one"/>'+
			'<input type="file" id="image-diff-two" name="two"/>'+
		'</form><div id="image-diff"></div>';
		document.body.appendChild(div);

		if(resembleOutputSettings){
			resemble.outputSettings(resembleOutputSettings);
		}

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
				var img = new Image();

				img.onload = function(){
					window._imagediff_.hasImage = true;
				};
				document.getElementById('image-diff').appendChild(img);
				img.src = data.getImageDataUrl(label);
			}

			resemble(document.getElementById('image-diff-one').files[0]).
				compareTo(document.getElementById('image-diff-two').files[0]).
				ignoreAntialiasing(). // <-- muy importante
				onComplete(function(data){
					var diffImage;

					if(Number(data.misMatchPercentage) > mismatchTolerance){
						result = data.misMatchPercentage;
					} else {
						result = false;
					}

					window._imagediff_.hasResult = true;

					if(Number(data.misMatchPercentage) > mismatchTolerance){
						render(data);
					}
					
				});
		}
	}, 
		_mismatchTolerance,
		_resembleOutputSettings
	);
}

function _onPass(test){
	console.log('\n');
	casper.test.pass('No changes found for screenshot ' + test.filename);
}
function _onFail(test){
	console.log('\n');
	casper.test.fail('Visual change found for screenshot ' + test.filename + ' (' + test.mismatch + '% mismatch)');
}
function _onTimeout(test){
	console.log('\n');
	casper.test.info('Could not complete image comparison for ' + test.filename);
}
function _onNewImage(test){
	console.log('\n');
	casper.test.info('New screenshot at '+ test.filename);
}
function _onComplete(tests, noOfFails, noOfErrors){

	if( tests.length === 0){
		console.log("\nMust be your first time?");
		console.log("Some screenshots have been generated in the directory " + _results);
		console.log("This is your 'baseline', check the images manually. If they're wrong, delete the images.");
		console.log("The next time you run these tests, new screenshots will be taken.  These screenshots will be compared to the original.");
		console.log('If they are different, PhantomCSS will report a failure.');
	} else {
				
		if(noOfFails === 0){
			console.log("\nPhantomCSS found " + tests.length + " tests, None of them failed. Which is good right?");
			console.log("\nIf you want to make them fail, go change some CSS - weirdo.");
		} else {
			console.log("\nPhantomCSS found " + tests.length + " tests, " + noOfFails + ' of them failed.');
			if(_failures){
				console.log('\nPhantomCSS has created some images that try to show the difference (in the directory '+_failures+'). Fuchsia colored pixels indicate a difference betwen the new and old screenshots.');
			}
		}

		if(noOfErrors !== 0){
			console.log("There were " + noOfErrors + "errors.  Is it possible that a baseline image was deleted but not the diff?");
		}

        if (_cleanupComparisonImages) {
           fs.removeTree(_results);
        }

		exitStatus = noOfErrors+noOfFails;
	}
}

function getExitStatus() {
	return exitStatus;
}
function generateRandomString() {
   return (Math.random() + 1).toString(36).substring(7);
}