**Huddle is Hiring!** We're always looking for talented Developers and Test Engineers. Visit http://www.huddle.com/careers for open vacancies now, or register your interest for the future.

PhantomCSS
==========

**CSS regression testing**. A [CasperJS](http://github.com/n1k0/casperjs) module for automating visual regression testing with [PhantomJS](http://github.com/ariya/phantomjs/) or [SlimerJS](http://slimerjs.org/) and [Resemble.js](http://huddle.github.com/Resemble.js/). For testing Web apps, live style guides and responsive layouts. Read more on Huddle's Engineering blog: [CSS Regression Testing](http://tldr.huddle.com/blog/css-testing/).

### What?

PhantomCSS takes screenshots captured by CasperJS and compares them to baseline images using [Resemble.js](http://huddle.github.com/Resemble.js/) to test for rgb pixel differences. PhantomCSS then generates image diffs to help you find the cause.

![A failed visual regression test, pink areas show where padding has changed.](https://raw.github.com/Huddle/PhantomCSS/master/readme_assets/intro-example.png "Failed visual regression test")

Screenshot based regression testing can only work when UI is predictable. It's possible to hide mutable UI components with PhantomCSS but it would be better to test static pages or drive the UI with faked data during test runs.

### Example

```javascript
casper.
	start( url ).
	then(function(){
		
		// do something
		casper.click('button#open-dialog');
		
		// Take a screenshot of the UI component
		phantomcss.screenshot('#the-dialog', 'a screenshot of my dialog');

	});
```

From the command line/terminal run:

* `casperjs test demo/testsuite.js`

or

* `casperjs test demo/testsuite.js --verbose --log-level=debug`

### Download

* `npm install phantomcss` (PhantomCSS is not itself a Node.js module)
* `bower install phantomcss`
* `git clone git://github.com/Huddle/PhantomCSS.git`

### Getting started, try the demo

* Mac OSX users should first [install CasperJS 1.1-beta](http://docs.casperjs.org/en/latest/installation.html), easiest with Homebrew.  For convenience I've included CasperJS.bat for Windows users.
* Download or clone this repo and run `casperjs test demo/testsuite.js` in command/terminal from the PhantomCSS folder.  PhantomJS is the only binary dependency - this should just work
* Find the screenshot folder and have a look at the (baseline) images
* Run the tests again with `casperjs test demo/testsuite.js`. New screenshots will be created to compare against the baseline images. These new images can be ignored, they will be replaced every test run.
* To test failure, add/change some CSS in the file demo/coffeemachine.html e.g. make `.mug` bright green
* Run the tests again, you should see some reported failures
* In the failures folder some images should have been created. The images should show bright pink where the screenshot has visually changed
* If you want to manually compare the images, go to the screenshot folder to see the original/baseline and latest screenshots

### SlimerJS

SlimerJS uses the Gecko browser engine rather than Webkit.  It currently has better support for Webfonts and can load Flash content if the plugin is installed. If this is of interest to you, please follow the [download and install](http://slimerjs.org/download.html) instructions and ensure SlimerJS is installed globally.

* `casperjs test demo/testsuite.js --engine=slimerjs`

### PhantomJS 2

The latest and greatest version of PhantomJS is not currently supported, as soon as CasperJS has confirmed full support we can look to update PhantomCSS. If (in the future) support has become viable, and you're eager to upgrade, please create and Issue and/or Pull Request.

### Options and setup

If you are using SlimerJS, you will need to specify absolute paths (see 'demo').

```javascript
phantomcss.init({
	/*
		libraryRoot is relative to this file and must point to your 
		phantomcss folder (not lib or node_modules). If you are using 
		NPM, this will be './node_modules/phantomcss'.
	*/
	libraryRoot: './modules/PhantomCSS',
	
	screenshotRoot: './screenshots',

	/*
		By default, failure images are put in the './failures' folder. 
		If failedComparisonsRoot is set to false a separate folder will 
		not be created but failure images can still be found alongside 
		the original and new images.
	*/
	failedComparisonsRoot: './failures',

	/*
		Remove results directory tree after run.  Use in conjunction 
		with failedComparisonsRoot to see failed comparisons.
	*/
	cleanupComparisonImages: true,

	/*
		A reference to a particular Casper instance. Required for SlimerJS.
	*/
	casper: specific_instance_of_casper,

	/*
		You might want to keep master/baseline images in a completely 
		different folder to the diffs/failures.  Useful when working 
		with version control systems. By default this resolves to the 
		screenshotRoot folder.
	*/
	comparisonResultRoot: './results',

	/*
		Don't add label to generated failure image
	*/
	addLabelToFailedImage: false,

	/*
		Mismatch tolerance defaults to  0.05%. Increasing this value 
		will decrease test coverage
	*/
	mismatchTolerance: 0.05,

	/*
		Callbacks for your specific integration
	*/
	onFail: function(test){ console.log(test.filename, test.mismatch); },
	
	onPass: function(test){ console.log(test.filename); },
	
	/* 
		Called when creating new baseline images
	*/
	onNewImage: function(){ console.log(test.filename); },
	
	onTimeout: function(){ console.log(test.filename); },
	
	onComplete: function(allTests, noOfFails, noOfErrors){
		allTests.forEach(function(test){
			if(test.fail){
				console.log(test.filename, test.mismatch);
			}
		});
	},

	/*
		Change the output screenshot filenames for your specific 
		integration
	*/
	fileNameGetter: function(root,filename){ 
		// globally override output filename
		// files must exist under root
		// and use the .diff convention
		var name = root+'/somewhere/'+filename;
		if(fs.isFile(name+'.png')){
			return name+'.diff.png';
		} else {
			return name+'.png';
		}
	},

	/*
		Output styles for image failure outputs genrated by 
		Resemble.js
	*/
	outputSettings: {
		errorColor: {
			red: 255,
			green: 255,
			blue: 0
		},
		errorType: 'movement',
		transparency: 0.3
	},

	/*
		Rebase is useful when you want to create new baseline 
		images without manually deleting the files
		casperjs demo/test.js --rebase
	*/
	rebase: casper.cli.get("rebase")
});

/*
	Turn off CSS transitions and jQuery animations
*/
phantomcss.turnOffAnimations();
```

### Don't like pink?

![A failed visual regression test, yellow areas show where the icon has enlarged and pushed other elements down.](https://raw.github.com/Huddle/PhantomCSS/master/readme_assets/differentcolour.png "Failed visual regression test")

```javascript
phantomcss.init({
	/*
		Output styles for image failure outputs genrated by Resemble.js
	*/
	outputSettings: {

		/*
			Error pixel color, RGB, anything you want, 
			though bright and ugly works best!
		*/
		errorColor: {
			red: 255,
			green: 255,
			blue: 0
		},
		
		/*
			ErrorType values include 'flat', or 'movement'.  
			The latter merges error color with base image
			which makes it a little easier to spot movement.
		*/
		errorType: 'movement',
		
		/*
			Fade unchanged areas to make changed areas more apparent.
		*/
		transparency: 0.3
	}
});
```

### There are different ways to take a screenshot

```javascript
var delay = 10;
var hideElements = 'input[type=file]';
var screenshotName = 'the_dialog'

phantomcss.screenshot( "#CSS .selector", screenshotName);

// phantomcss.screenshot({
//  	'Screenshot 1 File name': {selector: '.screenshot1', ignore: '.selector'},
//  	'Screenshot 2 File name': '#screenshot2'
// });
// phantomcss.screenshot( "#CSS .selector" );
// phantomcss.screenshot( "#CSS .selector", delay, hideElements, screenshotName);

// phantomcss.screenshot({
//   top: 100,
//   left: 100,
//   width: 500,
//   height: 400
// }, screenshotName);
```

### Compare the images when and how you want

```javascript
/*
	String is converted into a Regular expression that matches on full image path
*/
phantomcss.compareAll('exclude.test'); 

// phantomcss.compareMatched('include.test', 'exclude.test');
// phantomcss.compareMatched( new RegExp('include.test'), new RegExp('exclude.test'));

/*
	Compare image diffs generated in this test run only
*/
// phantomcss.compareSession();

/*
	Explicitly define what files you want to compare
*/
// phantomcss.compareExplicit(['/dialog.diff.png', '/header.diff.png']);

/*
	Get a list of image diffs generated in this test run
*/
// phantomcss.getCreatedDiffFiles();

/*
	Compare any two images, and wait for the results to complete
*/
// phantomcss.compareFiles(baseFile, diffFile);
// phantomcss.waitForTests();

```

### Best Practices

##### Name your screenshots!

By default PhantomCSS creates a file called screenshot_0.png, not very helpful.  You can name your screenshot by passing a string to either the second or forth parameter.

```javascript
var delay, hideElementsSelector;

phantomcss.screenshot("#feedback-form", delay, hideElementsSelector, "Responsive Feedback Form");

phantomcss.screenshot("#feedback-form", "Responsive Feedback Form");

```

Perhaps a better way is to use the ‘fileNameGetter’ callback property on the ‘init’ method. This does involve having a bit more structure around your tests.  See: https://github.com/Huddle/PhantomFlow/blob/master/lib/phantomCSSAdaptor.js#L41

##### CSS3 selectors for testing

Try not to use complex CSS3 selectors for asserting or creating screenshots.  In the same way that CSS should be written with good content/container separation, so should your test selectors be agnostic of location/context.  This might mean you need to add more ID's or data- attributes into your mark-up, but it's worth it, your tests will be more stable and more explicit.
This is not a good idea:

```javascript
phantomcss.screenshot("#sidebar li:nth-child(3) > div form");
```

But this is:

```javascript
phantomcss.screenshot("#feedback-form");
```

##### PhantomCSS should not be used to replace functional tests

If you needed functional tests before, then you still need them.  Automated visual regression testing gives us coverage of CSS and design in a way we didn't have before, but that doesn't mean that conventional test assertions are now invalid.  Feedback time is crucial with test automation, the longer it takes the easier it is to ignore; the easier it is to ignore the sooner trust is lost from the team.  Unfortunately comparing images is not, and never will be as fast as simple DOM assertion.

##### Don't try to test all the visuals

I'd argue this applies to all automated testing approaches.  As a rule, try to maximise coverage with fewer tests.  This is a difficult balancing act because granular feedback/reporting is very important for debugging and build analysis. Testing many things in one assert/screenshot might tell you there is a problem, but makes it harder to get to the root of the bug.  As a CSS/HTML Dev you'll know what components are more fragile than others, which are reused and which aren't, concentrate your visual tests on these areas.

##### Full page screenshots are a bad idea

If you try to test too much in one screenshot then you could end up with lots of failing tests every time someone makes a small change.  Say you've set up full-page visual regression tests for your 50 page website, and someone adds 2px padding to the footer - that’s 50 failed tests because of one change.  It's better to test UI components individually; in this example the footer could have its own test.
There is also a technical problem with this approach, the larger the image, the longer it takes to process.  An added pixel padding on the page body will offset everything, at best you'll have a sea of pink in the failed diff, at worse you'll get a TIMEOUT because it took too long to analyse.

##### Scaling visual regression testing within a large team

Scaling your test suite for many contributors may not be easy. [Resemble.js](http://huddle.github.com/Resemble.js/) (the core analysis engine of PhantomCSS) tries to consider image differences caused by different operating systems and graphics cards, but it's only so good, you are likely to see problems as more people contribute baseline screenshots.  You can mitigate this by hiding problematic elements such as select elements, file upload inputs etc. as so.

```javascript
phantomcss.screenshot("#feedback-form", undefined, 'input[type=file]');
```

Below is an example of a false-negative caused by antialiasing differences on different machines. How can we solve this?  **Contributions welcome!**

![Three images: baseline, latests and diff where antialiasing has caused the failed diff](https://raw.github.com/Huddle/PhantomCSS/master/readme_assets/false-negative.png "A False-negative?")

##### Scaling visual regression testing with Git

If your using a version control system like Git to store the baseline screenshots the repository size becomes increasingly relevant as your test suite grows.  I'd recommend using a tool like https://github.com/joeyh/git-annex or https://github.com/schacon/git-media to store the images outside of the repo.

### ...You might also be interested in

**[PhantomFlow](https://github.com/Huddle/PhantomFlow)** and **[grunt-phantomflow](https://github.com/Huddle/grunt-testflow)** wrap PhantomCSS and provides an experimental way of describing and visualising user flows through tests with CasperJS. As well as providing a terse readable structure for UI testing, it also produces intriguing graph visualisations that can be used to present PhantomCSS screenshots and failed diffs.  We're actively using it at Huddle and it's changing the way we think about UI for the better.

Also, take a look at [PhantomXHR](http://github.com/Huddle/PhantomXHR) for stubbing and mocking XHR requests. Isolated UI testing IS THE FUTURE!

### Huddle Careers

Huddle strongly believe in innovation and give you 20% of work time to spend on innovative projects of your choosing.

If you like what you see and would like to work on this kind of stuff for a job then get in touch.

Visit http://www.huddle.com/careers for open vacancies now, or register your interest for the future.

--------------------------------------

PhantomCSS was created by [James Cryer](http://github.com/jamescryer) and the Huddle development team.
