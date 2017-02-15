/*
James Cryer / Huddle / 2016
https://github.com/Huddle/PhantomCSS
http://tldr.huddle.com/blog/css-testing/
*/

var fs = require( 'fs' );

var _src = '.' + fs.separator + 'screenshots';
var _results; // for backwards compatibility results and src are the same - but you can change it!
var _failures = '.' + fs.separator + 'failures';

var _count = 0;
var exitStatus;
var _hideElements;
var _waitTimeout = 60000;
var _addLabelToFailedImage = true;
var _mismatchTolerance = 0.05;
var _resembleOutputSettings = {};
var _cleanupComparisonImages = false;
var diffsCreated = [];

var _resemblePath;
var _resembleContainerPath;
var _libraryRoot;
var _rebase = false;
var _prefixCount = false;
var _isCount = true;

var _baselineImageSuffix = "";
var _diffImageSuffix = ".diff";
var _failureImageSuffix = ".fail";

var _captureWaitEnabled = true;

exports.screenshot = screenshot;
exports.compareAll = compareAll;
exports.compareMatched = compareMatched;
exports.compareExplicit = compareExplicit;
exports.compareSession = compareSession;
exports.compareFiles = compareFiles;
exports.waitForTests = waitForTests;
exports.init = init;
exports.done = done;
exports.update = update;
exports.turnOffAnimations = turnOffAnimations;
exports.getExitStatus = getExitStatus;
exports.getCreatedDiffFiles = getCreatedDiffFiles;

function update( options ) {

	function stripslash( str ) {
		return ( str || '' ).replace( /\/\//g, '/' ).replace( /\\/g, '\\' );
	}

	options = options || {};

	casper = options.casper || casper;

	_waitTimeout = options.waitTimeout || _waitTimeout;

	_libraryRoot = options.libraryRoot;

	_resemblePath = _resemblePath || getResemblePath( _libraryRoot );

	_resembleContainerPath = _resembleContainerPath || getResembleContainerPath( _libraryRoot );

	_src = stripslash( options.screenshotRoot || _src );
	_results = stripslash( options.comparisonResultRoot || options.screenshotRoot || _results || _src );
	_failures = options.failedComparisonsRoot === false ? false : stripslash( options.failedComparisonsRoot || _failures );

	_fileNameGetter = options.fileNameGetter || _fileNameGetter;

	_prefixCount = options.prefixCount || _prefixCount;
	_isCount = ( options.addIteratorToImage !== false );

	_onPass = options.onPass || _onPass;
	_onFail = options.onFail || _onFail;
	_onTimeout = options.onTimeout || _onTimeout;
	_onNewImage = options.onNewImage || _onNewImage;
	_onComplete = options.onComplete || options.report || _onComplete;

	_hideElements = options.hideElements;

	_mismatchTolerance = options.mismatchTolerance || _mismatchTolerance;

	_rebase = isNotUndefined(options.rebase) ? options.rebase : _rebase;

	_resembleOutputSettings = options.outputSettings || _resembleOutputSettings;

	_resembleOutputSettings.useCrossOrigin=false; // turn off x-origin attr in Resemble to support SlimerJS 

	_cleanupComparisonImages = options.cleanupComparisonImages || _cleanupComparisonImages;

	_baselineImageSuffix = options.baselineImageSuffix || _baselineImageSuffix;
	_diffImageSuffix = options.diffImageSuffix || _diffImageSuffix;
	_failureImageSuffix = options.failureImageSuffix || _failureImageSuffix;

	_captureWaitEnabled = isNotUndefined(options.captureWaitEnabled) ? options.captureWaitEnabled : _captureWaitEnabled;

	if ( options.addLabelToFailedImage !== undefined ) {
		_addLabelToFailedImage = options.addLabelToFailedImage;
	}

	if ( _cleanupComparisonImages ) {
		_results += fs.separator + generateRandomString();
	}
}

function isNotUndefined(val){
	return val !== void 0;
}

function init( options ) {
	update( options );
}

function done(){
	_count = 0;
}

function getResemblePath( root ) {
    var path;

	if(root){
		path = [ root, 'node_modules', 'resemblejs', 'resemble.js' ].join( fs.separator );
		if ( !_isFile( path ) ) {
			path = [ root, '..', 'resemblejs', 'resemble.js' ].join( fs.separator );
		}
	} else {
		require('resemblejs');
		for(var c in require.cache) {
			if(/resemblejs/.test(c)) {
				path = require.cache[c].filename;
				break;
			}
		}
	}

	if ( !_isFile( path ) ) {
		throw "[PhantomCSS] Resemble.js not found: " + path;
	}

    return path;
}


function getResembleContainerPath(root) {
    var path;

	if(root){
		path = root + fs.separator + 'resemblejscontainer.html';
	} else {
		for (var c in require.cache) {
			if (/phantomcss/.test(c)) {
				path = require.cache[c].filename.replace('phantomcss.js', 'resemblejscontainer.html');
				break;
			}
		}
	}

    if ( !_isFile(path) ) {
        throw '[PhantomCSS] Can\'t find Resemble container. (' + path + ')';
    }

    return path;
}

function turnOffAnimations() {
	console.log( '[PhantomCSS] Turning off animations' );
	casper.evaluate( function turnOffAnimations() {

		function disableAnimations() {
			var jQuery = window.jQuery;
			if ( jQuery ) {
				jQuery.fx.off = true;
			}

			var css = document.createElement( "style" );
			css.type = "text/css";
			css.innerHTML = "* { -webkit-transition: none !important; transition: none !important; -webkit-animation: none !important; animation: none !important; }";
			document.body.appendChild( css );
		}

		if ( document.readyState !== "loading" ) {
			disableAnimations();
		} else {
			window.addEventListener( 'load', disableAnimations, false );
		}
	} );
}

function _fileNameGetter( root, fileName ) {
	var name;

	// If no iterator, enforce filename.
	if ( !_isCount && !fileName ) {
		throw 'Filename is required when addIteratorToImage option is false.';
	}

	fileName = fileName || "screenshot";

	if ( !_isCount ) {
		name = root + fs.separator + fileName;
		_count++;
	} else {
		if ( _prefixCount ) {
			name = root + fs.separator + _count++ + "_" + fileName;
		} else {
			name = root + fs.separator + fileName + "_" + _count++;
		}
	}

	if ( _isFile( name + _baselineImageSuffix + '.png' ) ) {
		return name + _diffImageSuffix + '.png';
	} else {
		return name + _baselineImageSuffix + '.png';
	}
}

function _replaceDiffSuffix( str ) {
	return str.replace( _diffImageSuffix, _baselineImageSuffix );
}

function _isFile( path ) {
	var exists = false;
	try {
		exists = fs.isFile( path );
	} catch ( e ) {
		if ( e.name !== 'NS_ERROR_FILE_TARGET_DOES_NOT_EXIST' && e.name !== 'NS_ERROR_FILE_NOT_FOUND' ) {
			// We weren't expecting this exception
			throw e;
		}
	}
	return exists;
}

function screenshot( target, timeToWait, hideSelector, fileName ) {
	var name;

	if ( isComponentsConfig( target ) ) {
		for ( name in target ) {
			if ( isComponentsConfig( target[ name ] ) ) {
				waitAndHideToCapture( target[ name ].selector, name, target[ name ].ignore, target[ name ].wait );
			} else {
				waitAndHideToCapture( target[ name ], name );
			}
		}
	} else {
		if ( isNaN( Number( timeToWait ) ) && ( typeof timeToWait === 'string' ) ) {
			fileName = timeToWait;
			timeToWait = void 0;
		}
		waitAndHideToCapture( target, fileName, hideSelector, timeToWait );
	}
}

function isComponentsConfig( obj ) {
	return ( Object.prototype.toString.call( obj ) === '[object Object]' ) && ( isClipRect( obj ) === false );
}

function grab( filepath, target ) {
	if ( isClipRect( target ) ) {
		casper.capture( filepath, target );
	} else {
		casper.captureSelector( filepath, target );
	}
}

function capture( srcPath, resultPath, target ) {
	var originalForResult = _replaceDiffSuffix( resultPath );
	var originalFromSource = _replaceDiffSuffix( srcPath );

	try {

		if ( _rebase ) {

			grab( originalFromSource, target );

			if ( isThisImageADiff( resultPath ) ) {
				// Tidy up. Remove old diff after rebase
				removeFile( resultPath );
			}

			_onNewImage( {
				filename: originalFromSource
			} );

		} else if ( isThisImageADiff( resultPath ) ) {

			grab( resultPath, target );

			diffsCreated.push( resultPath );

			if ( srcPath !== resultPath ) {
				// also copy the original over to the result directory
				copyAndReplaceFile( originalFromSource, originalForResult );
			}

		} else {

			grab( srcPath, target );

			if ( srcPath !== resultPath ) {
				// can't use copyAndReplaceFile yet, so just capture again
				grab( resultPath, target );
			}

			_onNewImage( {
				filename: resultPath
			} );
		}

	} catch ( ex ) {
		console.log( "[PhantomCSS] Screenshot capture failed: " + ex.message );
	}
}

function isClipRect( value ) {
	return (
		typeof value === 'object' &&
		typeof value.top === 'number' &&
		typeof value.left === 'number' &&
		typeof value.width === 'number' &&
		typeof value.height === 'number'
	);
}

function isThisImageADiff( path ) {
	var sanitizedDiffSuffix = _diffImageSuffix.replace( /[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&" );
	var diffRegex = new RegExp( sanitizedDiffSuffix + "\\.png" );
	return diffRegex.test( path );
}

function copyAndReplaceFile( src, dest ) {
	removeFile( dest );
	fs.copy( src, dest );
}

function removeFile( filepath ) {
	if ( _isFile( filepath ) ) {
		fs.remove( filepath );
	}
}

function asyncCompare( one, two, func ) {

	if ( !casper.evaluate( function () {
			return window._imagediff_;
		} ) ) {
		initClient();
	}

	casper.fillSelectors( 'form#image-diff-form', {
		'[name=one]': one,
		'[name=two]': two
	} );

	casper.evaluate( function ( filename ) {
		window._imagediff_.run( filename );
	}, {
		label: _addLabelToFailedImage ? one : false
	} );

	casper.waitFor(
		function check() {
			return this.evaluate( function () {
				return window._imagediff_.hasResult;
			} );
		},
		function () {

			var mismatch = casper.evaluate( function () {
				return window._imagediff_.getResult();
			} );

			if ( Number( mismatch ) ) {
				func( false, mismatch );
			} else {
				func( true );
			}

		},
		function () {
			func( false );
		},
		_waitTimeout
	);
}

function getDiffs( root, collection ) {
	var symDict = { '..': 1, '.': 1};
	if(!collection) {collection = [];}
	if ( fs.isDirectory( root ) ) {
		fs.list( root ).forEach( function(leaf){
			var newroot = root + fs.separator + leaf;
			if ( symDict[ leaf ] ) { return true; }
			getDiffs(newroot, collection);
		} );
	} else if ( isThisImageADiff( root.toLowerCase() ) ) {
		collection.push( root );
	}
	return collection;
}

function filterOn(include, exclude){
	return function(path){
		var includeAble = (include === void 0) || include.test( path.toLowerCase() );
		var excludeAble = exclude && exclude.test( path.toLowerCase() );
		return !excludeAble && includeAble;
	}
}

function getCreatedDiffFiles() {
	var d = diffsCreated;
	diffsCreated = [];
	return d;
}

function compareMatched( match, exclude ) {
	// Search for diff images, but only compare matched filenames
	compareAll( exclude, void 0, match);
}

function compareExplicit( list ) {
	// An explicit list of diff images to compare ['/dialog.diff.png', '/header.diff.png']
	compareAll( void 0, list );
}

function compareSession( list ) {
	// compare the diffs created in this session
	compareAll( void 0, getCreatedDiffFiles() );
}

function compareFiles( baseFile, file ) {
	var test = {
		filename: baseFile
	};

	if ( !_isFile( baseFile ) ) {
		test.error = true;
	} else {

		casper.thenOpen( 'about:blank', function () {}); // reset page (fixes bug where failure screenshots leak between captures)
		casper.thenOpen( 'file:///' + _resembleContainerPath, function () {

			asyncCompare( baseFile, file, function ( isSame, mismatch ) {

				if ( !isSame ) {

					test.fail = true;

					casper.waitFor(
						function check() {
							return casper.evaluate( function () {
								return window._imagediff_.hasImage;
							} );
						},
						function () {
							var failFile, safeFileName, increment;

							if ( _failures ) {
								// flattened structure for failed diffs so that it is easier to preview
								failFile = _failures + fs.separator + file.split( /\/|\\/g ).pop().replace( _diffImageSuffix + '.png', '' ).replace( '.png', '' );
								safeFileName = failFile;
								increment = 0;

								while ( _isFile( safeFileName + _failureImageSuffix + '.png' ) ) {
									increment++;
									safeFileName = failFile + '.' + increment;
								}

								failFile = safeFileName + _failureImageSuffix + '.png';
								casper.captureSelector( failFile, 'img' );

								test.failFile = failFile;
							}

							if ( file.indexOf( _diffImageSuffix + '.png' ) !== -1 ) {
								casper.captureSelector( file.replace( _diffImageSuffix + '.png', _failureImageSuffix + '.png' ), 'img' );
							} else {
								casper.captureSelector( file.replace( '.png', _failureImageSuffix + '.png' ), 'img' );
							}

							casper.evaluate( function () {
								window._imagediff_.hasImage = false;
							} );

							if ( mismatch ) {
								test.mismatch = mismatch;
								_onFail( test ); // casper.test.fail throws and error, this function call is aborted
								return; // Just to make it clear what is happening
							} else {
								_onTimeout( test );
							}

						},
						function () {},
						_waitTimeout
					);
				} else {
					test.success = true;
					_onPass( test );
				}

			} );
		} );
	}
	return test;
}

function str2RegExp(str){
	return typeof str === 'string' ? new RegExp( str ) : str;
}

function compareAll( exclude, diffList, include ) {
	var tests = [];

	if ( !diffList ) {
		diffList = getDiffs( _results );
		if(exclude || include){
			diffList = diffList.filter(filterOn( str2RegExp(include), str2RegExp(exclude) ));
		}
		//diffList.forEach(function(path){console.log( '[PhantomCSS] Attempting visual comparison of ' + path );})
	}

	diffList.forEach( function ( file ) {
		var baseFile = _replaceDiffSuffix( file );
		tests.push( compareFiles( baseFile, file ) );
	} );

	waitForTests( tests );
}

function waitForTests( tests ) {
	casper.then( function () {
		casper.waitFor( function () {
				return tests.length === tests.reduce( function ( count, test ) {
					if ( test.success || test.fail || test.error ) {
						return count + 1;
					} else {
						return count;
					}
				}, 0 );
			}, function () {
				var fails = 0,
					errors = 0;
				tests.forEach( function ( test ) {
					if ( test.fail ) {
						fails++;
					} else if ( test.error ) {
						errors++;
					}
				} );
				_onComplete( tests, fails, errors );
			}, function () {

			},
			_waitTimeout );
	} );
}

function initClient() {

	casper.page.injectJs( _resemblePath );

	casper.evaluate( function ( mismatchTolerance, resembleOutputSettings ) {

			var result;

			var div = document.createElement( 'div' );

			// this is a bit of hack, need to get images into browser for analysis
			div.style = "display:block;position:absolute;border:0;top:10px;left:0;";
			// div.style = "display:block;position:absolute;border:0;top:0;left:0;height:1px;width:1px;";
			div.innerHTML = '<form id="image-diff-form">' +
				'<input type="file" id="image-diff-one" name="one"/>' +
				'<input type="file" id="image-diff-two" name="two"/>' +
				'</form><div id="image-diff"></div>';
			document.body.appendChild( div );

			if ( resembleOutputSettings ) {
				resemble.outputSettings( resembleOutputSettings );
			}

			window._imagediff_ = {
				hasResult: false,
				hasImage: false,
				run: run,
				getResult: function () {
					window._imagediff_.hasResult = false;
					return result;
				}
			};

			function run( label ) {

				function render( data ) {
					var img = new Image();

					img.onload = function () {
						window._imagediff_.hasImage = true;
					};
					document.getElementById( 'image-diff' ).appendChild( img );
					img.src = data.getImageDataUrl( label );
				}

				resemble( document.getElementById( 'image-diff-one' ).files[ 0 ] ).
				compareTo( document.getElementById( 'image-diff-two' ).files[ 0 ] ).
				ignoreAntialiasing(). // <-- muy importante
				onComplete( function ( data ) {
					var diffImage;

					if ( Number( data.misMatchPercentage ) > mismatchTolerance ) {
						result = data.misMatchPercentage;
					} else {
						result = false;
					}

					window._imagediff_.hasResult = true;

					if ( Number( data.misMatchPercentage ) > mismatchTolerance ) {
						render( data );
					}

				} );
			}
		},
		_mismatchTolerance,
		_resembleOutputSettings
	);
}

function _onPass( test ) {
	console.log( '\n' );
	var name = 'Should look the same ' + test.filename;
	casper.test.pass(name, {name: name});
}

function _onFail( test ) {
	console.log('\n');
	var name = 'Should look the same ' + test.filename;
	casper.test.fail(name, {name:name, message: 'Looks different (' + test.mismatch + '% mismatch) ' + test.failFile });
}

function _onTimeout( test ) {
	console.log( '\n' );
	casper.test.info( 'Could not complete image comparison for ' + test.filename );
}

function _onNewImage( test ) {
	console.log( '\n' );
	casper.test.info( 'New screenshot at ' + test.filename );
}

function _onComplete( tests, noOfFails, noOfErrors ) {

	if ( tests.length === 0 ) {
		console.log( "\nMust be your first time?" );
		console.log( "Some screenshots have been generated in the directory " + _results );
		console.log( "This is your 'baseline', check the images manually. If they're wrong, delete the images." );
		console.log( "The next time you run these tests, new screenshots will be taken.  These screenshots will be compared to the original." );
		console.log( 'If they are different, PhantomCSS will report a failure.' );
	} else {

		if ( noOfFails === 0 ) {
			console.log( "\nPhantomCSS found " + tests.length + " tests, None of them failed. Which is good right?" );
			console.log( "\nIf you want to make them fail, change some CSS." );
		} else {
			console.log( "\nPhantomCSS found " + tests.length + " tests, " + noOfFails + ' of them failed.' );
			if ( _failures ) {
				console.log( '\nPhantomCSS has created some images that try to show the difference (in the directory ' + _failures + '). Fuchsia colored pixels indicate a difference betwen the new and old screenshots.' );
			}
		}

		if ( noOfErrors !== 0 ) {
			console.log( "There were " + noOfErrors + "errors.  Is it possible that a baseline image was deleted but not the diff?" );
		}

		if ( _cleanupComparisonImages ) {
			fs.removeTree( _results );
		}

		exitStatus = noOfErrors + noOfFails;
	}
}

function waitAndHideToCapture( target, fileName, hideSelector, timeToWait ) {
	var srcPath = _fileNameGetter( _src, fileName );
	var resultPath = srcPath.replace( _src, _results );

	function runCapture() {
		if ( hideSelector || _hideElements ) {
			casper.evaluate( setVisibilityToHidden, {
				s1: _hideElements,
				s2: hideSelector
			} );
		}

		capture( srcPath, resultPath, target );
	}
	if(_captureWaitEnabled) {
		casper.wait(timeToWait || 250, runCapture); // give a bit of time for all the images appear
	} else {
		runCapture();
	}
}

function setVisibilityToHidden( s1, s2 ) {
	// executes in browser scope
	var selector;
	var elements;
	var i;

	var jQuery = window.jQuery;
	if ( jQuery ) {
		if ( s1 ) {
			jQuery( s1 ).css( 'visibility', 'hidden' );
		}
		if ( s2 ) {
			jQuery( s2 ).css( 'visibility', 'hidden' );
		}
		return;
	}

	// Ensure at least an empty string
	s1 = s1 || '';
	s2 = s2 || '';

	// Create a combined selector, removing leading/trailing commas
	selector = ( s1 + ',' + s2 ).replace( /(^,|,$)/g, '' );
	elements = document.querySelectorAll( selector );
	i = elements.length;

	while ( i-- ) {
		elements[ i ].style.visibility = 'hidden';
	}
}

function getExitStatus() {
	return exitStatus;
}

function generateRandomString() {
	return ( Math.random() + 1 ).toString( 36 ).substring( 7 );
}
