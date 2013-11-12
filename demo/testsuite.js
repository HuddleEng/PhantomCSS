
/*
	Initialise CasperJs
*/

var casper = require('casper').create({
	viewportSize: {
		width: 1027,
		height: 800
	}
});

/*
	Require and initialise PhantomCSS module
	Paths are relative to CasperJs directory
*/

var phantomcss = require('./../phantomcss.js');
//var url = startServer('./demo/coffeemachine.html');

phantomcss.init(/*{
	screenshotRoot: '/screenshots',
	failedComparisonsRoot: '/failures'
	casper: specific_instance_of_casper,
	libraryRoot: '/phantomcss',
	fileNameGetter: function overide_file_naming(){},
	onPass: function passCallback(){},
	onFail: function failCallback(){},
	onTimeout: function timeoutCallback(){},
	onComplete: function completeCallback(){},
	hideElements: '#thing.selector',
	addLabelToFailedImage: true
}*/);

/*
	The test scenario
*/

casper.
	start( './demo/coffeemachine.html' ).
	then(function(){
		phantomcss.screenshot('#coffee-machine-wrapper', 'open coffee machine button');
	}).
	then(function(){
		casper.click('#coffee-machine-button');
		
		// wait for modal to fade-in 
		casper.waitForSelector('#myModal:not([style*="display: none"])',
			function success(){
				phantomcss.screenshot('#myModal', 'coffee machine dialog');
			},
			function timeout(){
				casper.test.fail('Should see coffee machine');
			}
		);

	}).
	then(function(){
		casper.click('#cappuccino-button');
		phantomcss.screenshot('#myModal', 'cappuccino success');
	}).
	then(function(){
		casper.click('#close');

		// wait for modal to fade-out
		casper.waitForSelector('#myModal[style*="display: none"]',
			function success(){
				phantomcss.screenshot('#coffee-machine-wrapper', 'coffee machine close success');
			},
			function timeout(){
				casper.test.fail('Should be able to walk away from the coffee machine');
			}
		);
	});

/*
	End tests and compare screenshots
*/

casper.
	then( function now_check_the_screenshots(){
		phantomcss.compareAll();
	}).
	run( function end_it(){
		console.log('\nTHE END.');
		
		phantom.exit(phantomcss.getExitStatus());
	});