var fs = require('fs');
var _tolerance = 64;
var _root = '.';
var _count = 0;
var _realPath;
var _diffsToProcess = [];
var _emptyPageToRunTestsOn;
var _libraryRoot = '.';
var exitStatus;

exports.screenshot = screenshot;
exports.compareAll = compareAll;
exports.init = init;
exports.getExitStatus = getExitStatus;

function init(options){
	_emptyPageToRunTestsOn = options.testRunnerUrl;
	_libraryRoot = options.libraryRoot || _libraryRoot;
	_root = options.screenshotRoot || _root;
	_fileNameGetter = options.fileNameGetter || _fileNameGetter;
	_report = options.report || _report;
}

function _fileNameGetter(){
	var name = _root + "/screenshot_" + _count++;

	if(fs.isFile(name+'.png')){
		return name+'.diff.png';
	} else {
		return name+'.png';
	}

}

function screenshot(selector, timeToWait, hideSelector){
	casper.wait(timeToWait || 250, function(){

		if(hideSelector){
			casper.evaluate(function(s){
				$(s).css('visibility', 'hidden');
			}, {
				s: selector + ' ' + hideSelector
			});
		}

		casper.captureSelector( _fileNameGetter(_root) , selector);
		
	}); // give a bit of time for all the images appear
}

function asyncCompare(one, two, func){

	if(!casper.evaluate(function(){ return window._imagediff_;})){
		initClient();
	}

	casper.fill('form#image-diff', {
		'one': one,
		'two': two
	});

	casper.evaluate(function(){window._imagediff_.run();});

	casper.waitFor(
		function check() {
			return this.evaluate(function(){
				return window._imagediff_.hasResult;
			});
		},
		function () {
	
			var isSame = casper.evaluate(function(){
				return window._imagediff_.getResult();
			});

			func(isSame);
		}
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
			_diffsToProcess.push(filePath);
		}
	}

	_realPath = _realPath.replace(fs.separator + path, '');
}

function compareAll(){
	var tests = [];
	var fails = 0;
	var errors = 0;

	getDiffs(_root);

	_diffsToProcess.forEach(function(file){
		var baseFile = file.replace('.diff', '');
		var test = {
			filename: baseFile
		};

		if(!fs.isFile(baseFile)) {
			test.error = true;
			errors++;
			tests.push(test);
		} else {
			casper.
			thenOpen (_emptyPageToRunTestsOn, function (){
				asyncCompare(baseFile, file, function(isSame){
					if(!isSame){
						test.fail = true;
						fails++;
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
			_report(tests, fails, errors);
		});
	});
}

function initClient(){
	
	casper.page.injectJs(_libraryRoot+'/imagediff.js');

	casper.evaluate(function(_tolerance){
		
		var result;

		var compare = function firstCompare(one){
			compare = function secondCompare(two){
				result = imagediff.equal(one, two, _tolerance); // 0 = no tolerance 100 is too much.
				window._imagediff_.hasResult = true;
				compare = firstCompare;
			};
		};

		var div = document.createElement('div');

		function getImageData(e) {
			var image = new Image();
			image.onload = function(){
				compare( image );
			};
			image.src = e.target.result;
		}

		// this is a bit of hack, need to get images into browser for analysis
		div.style = "display:block;position:absolute;border:0;top:-1px;left:-1px;height:1px;width:1px;overflow:hidden;";
		div.innerHTML = '<form id="image-diff">'+
			'<input type="file" id="image-diff-one" name="one"/>'+
			'<input type="file" id="image-diff-two" name="two"/>'+
		'</form>';
		document.body.appendChild(div);

		window._imagediff_ = {
			hasResult: false,
			run: run,
			getResult: function(){
				window._imagediff_.hasResult = false;
				console.log('THE RESULT IS ', result);
				return result;
			}
		};

		function run(){
			var reader1 = new FileReader();
			var reader2 = new FileReader();

			reader1.onload = getImageData;
			reader2.onload = getImageData;

			reader1.readAsDataURL(document.getElementById('image-diff-one').files[0]);
			reader2.readAsDataURL(document.getElementById('image-diff-two').files[0]);
		}
	}, {
		_tolerance: _tolerance
	});
}


function _report(tests, noOfFails, noOfErrors){

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
		}

		if(noOfErrors !== 0){
			console.log("There were " + noOfErrors + "errors.  Is it possible that a baseline image was deleted but not the diff?");
		}

		exitStatus = noOfErrors+noOfFails;
	}
}

function getExitStatus() {
	return exitStatus;
}