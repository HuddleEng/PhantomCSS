var fs = require('fs');

// CasperJS library
phantom.casperPath = 'CasperJs';
phantom.injectJs(phantom.casperPath + '/bin/bootstrap.js');
phantom.injectJs('jquery.js');

// Populate global variables
var casper = require('casper').create({
	viewportSize: {width: 1027, height: 800}
});

var css = require('./phantomcss.js');
var url = initPageOnServer('demo/testpage.html');

css.init({
	screenshotRoot: './screenshots',
	failedComparisonsRoot: './failures',
	testRunnerUrl: url.emptyPage
});

casper.
	start(url.testPage).
	then( function should_look_like_this(){
		css.screenshot('body');
	} ).
	then( function user_clicks_link(){
		casper.page.sendEvent('click', 10, 10); // You obviously shouldn't hardcode element positions in your tests
	} ).
	then( function should_look_different_than_before(){
		css.screenshot('body');
	}).
	then( function now_check_the_screenshots(){
		css.compareAll();
	}).
	run( function end_it(){
		console.log('\nTHE END.');
		phantom.exit(css.getExitStatus());
	});


function initPageOnServer(path){
	var server = require('webserver').create();
	var fs = require("fs");
	var html = fs.read(path);
	
	var service = server.listen(1337, function(request, response) {
		response.statusCode = 200;
		
		if(request.url.indexOf('empty') != -1){
			response.write('<html><body>This blank page is used for processing the images with HTML5 magics</body></html>');
		} else {
			response.write(html);
		}

		response.close();
	});

	return {
		testPage: 'http://localhost:1337',
		emptyPage: 'http://localhost:1337/empty'
	};
}