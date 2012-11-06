var fs = require('fs');
var _tolerance = 64;
var _root = '.';
var _count = 0;
var _realPath;
var _diffsToProcess = [];
var _emptyPageToRunTestsOn; // what will this be then?
var _libraryRoot = '.';

exports.screenshot = screenshot;
exports.compareAll = compareAll;
exports.init = init;

function init(options){

	_emptyPageToRunTestsOn = options.testRunnerUrl;
	_libraryRoot = options.libraryRoot || _libraryRoot;
	_root = options.screenshotRoot || _root;
	_fileNameGetter = options._fileNameGetter || _fileNameGetter;
}

function _fileNameGetter(){
	return _root + "/screenshot_" + _count++;
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

		casper.captureSelector( _fileNameGetter() , selector);
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
	var failures = [];
	var missingBaseFiles = [];
	var haveDoneCount = 0;

	getDiffs(_root);

	_diffsToProcess.forEach(function(file){
		var baseFile = file.replace('.diff', '');

		if(!fs.isFile(baseFile)) {
			missingBaseFiles.push(baseFile);
			haveDoneCount++;
		} else {

			casper.
			thenOpen (_emptyPageToRunTestsOn, function (){
				asyncCompare(baseFile, file, function(isSame){
					haveDoneCount++;
					if(!isSame){
						failures.push(file);
					}
				});
			});
		}
	});

	casper.then(function(){

		casper.waitFor(function(){
			return _diffsToProcess.length === haveDoneCount;
		}, function(){

			var failedComparisonReport = '';
			var missingFilesReport = '';
			if(failures.length || missingBaseFiles.length){
				
				failures.forEach(function(file){
					failedComparisonReport += file + '\n';
				});

				if (failures.length) {
					casper.test.fail('\n\n****\nOh noes! Visual regression check has failed, you\'ll have to manually compare the following diffs to see what has changed.\n\n' + failedComparisonReport + '\n****\n');
				}

				missingBaseFiles.forEach(function(file) {
					missingFilesReport += file + '\n';
				});

				if (missingBaseFiles.length) {
					casper.test.fail('\n\n****\nAww snap, yo! Someone forgot to commit a base file for visual regression so it\'s all gone tits-up. These are the files I couldn\'t find :(\n\n' + missingFilesReport + '\n****\n\nPROTIP: Delete the diffs for the missing files and re-run the tests to generate new base files!');
				}

				failures = [];
				missingFilesReport = [];
			} else {
				casper.test.pass('\n\n****\nBrilliant, it all looks as I expected it to, you are awesome!\n****\n');
			}

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