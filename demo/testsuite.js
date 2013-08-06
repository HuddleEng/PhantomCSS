
/*
	Initialise CasperJs
*/

phantom.casperPath = 'CasperJs';
phantom.injectJs(phantom.casperPath + '/bin/bootstrap.js');
phantom.injectJs('jquery.js');

var casper = require('casper').create({
	viewportSize: {
		width: 1027,
		height: 800
	}
});

/*
	Require and initialise PhantomCSS module
*/

var phantomcss = require('./phantomcss.js');
var url = startServer('demo/coffeemachine.html');

phantomcss.init({
	screenshotRoot: './screenshots',
	failedComparisonsRoot: './failures'
});

/*
	The test scenario
*/

casper.
	start( url ).
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

/*
	Fluff
*/

function startServer(path){
	// Use PhantomJs server to server web page, demo purposes only
	var fs = require('fs');
	var server = require('webserver').create();
	var html = fs.read(path);
	
	var service = server.listen(1337, function(request, response) {
		response.statusCode = 200;
		response.write(html);
		response.close();
	});

	return 'http://localhost:1337';
}