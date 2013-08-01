PhantomCSS
==========

*CSS regression testing*. An integration of [Resemble.js](http://huddle.github.com/Resemble.js/) with [PhantomJS](http://github.com/ariya/phantomjs/) and [CasperJS](http://github.com/n1k0/casperjs) for automating visual regression testing of Website styling to support refactoring of CSS.

### Why?

The problem with functional UI tests is that they make assertions on HTML markup, not the actual rendering. You can't know through automated tests if something has visually broke, too much margin, disabled state etc.  This situation is exacerbated by the increasing use of CSS3 for visual state changes that were traditionally built with JavaScript and DOM manipulation, ':target' pseudoclass or keyframes for example. Read more on Huddle's Engineering blog: [CSS Regression Testing](http://tldr.huddle.com/blog/css-testing/).

![A failed visual regression test, pink areas show where padding has changed.](https://raw.github.com/Huddle/PhantomCSS/master/readme_assets/intro-example.png "Failed visual regression test")

### How?

PhantomCSS takes screenshots captured by PhantomJS and compares them to baseline images using [Resemble.js](http://huddle.github.com/Resemble.js/) to test for rgb pixel differences with HTML5 canvas. PhantomCSS then generates image diffs to help you find the cause so you don't need to manually compare the new and old images.

PhantomCSS can only work when UI is predictable. It's possible to hide mutable UI components with PhantomCSS but it would be better to drive the UI from faked data during test runs.  Take a look at [PhantomXHR](http://github.com/Huddle/PhantomXHR) for mocking XHR requests.

### Example

Check out the [demo](http://github.com/Huddle/PhantomCSS/tree/master/demo) for a full working example (run `phantomjs demo/testsuite.js` from the command line).

```javascript

var css = require('./modules/phantomcss.js');

css.init({
	libraryRoot: './modules/PhantomCSS',
	screenshotRoot: './screenshots',
	failedComparisonsRoot: './failures', // If this is not defined failure images can still be found alongside the original and new images
	testRunnerUrl: 'http://my.blank.page.html', //  needs to be a 'http' domain for the HTML5 magic to work
});

css.screenshot("#CSS .selector"/*, delay: 500, selector: '.elements-to-be-hidden', filename: 'my_webapp_feature'*/);

css.compareAll();
```

Please note that I have included the PhantomJS exe for convenience only, please follow the [PhantomJS install instructions](http://phantomjs.org/download.html) for custom and non-Windows environments.

### Workflow

* Define what screenshots you need in your regular tests
* Ensure that the 'compareAll' method gets called at the end of the test run
* Find the screenshot directory and check that they look as you expect.  These images will be used as a baseline.  Subsequent test runs will report if the latest screenshot is different to the baseline
* Run the tests again.  New screenshots will be created to compare against the baseline image.  These new images can be ignored, they will be replaced every test run.
* If there are test failures, image diffs will be generated.

### Another example

```javascript

css.init({
	libraryRoot: './modules/PhantomCSS',
	screenshotRoot: './screenshots',
	failedComparisonsRoot: './failures',
	testRunnerUrl: 'http://my.blank.page.html',

	addLabelToFailedImage: false, // Don't add label to generated failure image

	onFail: function(test){ console.log(test.filename, test.mismatch); },
	onPass: function(){ console.log(test.filename); },
	onTimeout: function(){ console.log(test.filename); },
	onComplete: function(allTests, noOfFails, noOfErrors){
		allTests.forEach(function(test){
			if(test.fail){
				console.log(test.filename, test.mismatch);
			}
		});
	},
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
	}
});

css.turnOffAnimations(); // turn off CSS transitions and jQuery animations

css.compareAll('exclude.test'); // String is converted into a Regular expression that matches on full image path

// css.compareMatched('include.test', 'exclude.test');
// css.compareMatched( new RegExp('include.test'), new RegExp('exclude.test'));
```

### Notes

#### Name your screenshots!

By default PhantomCSS creates a file called screenshot_0.png, not very helpful.  You can name your screenshot by passing a string to the forth parameter.

```javascript
var delay, hideElementsSelector;

phantomcss.screenshot("#feedback-form", delay, hideElementsSelector, "Responsive Feedback Form");
```

(I'd like to clean up the signature, but for backwards compatibility, it is what it is.)

Perhaps a better way is to use the ‘fileNameGetter’ callback property on the ‘init’ method. This does involve having a bit more structure around your tests.  See: https://github.com/Huddle/PhantomFlow/blob/master/demo/runTests.js#L72

#### CSS3 selectors for testing

Try not to use complex CSS3 selectors for asserting or creating screenshots.  In the same way that CSS should be written with good content/container separation, so should your test selectors be agnostic of location/context.  This might mean you need to add more ID's or data- attributes into your mark-up, but it's worth it, your tests will be more stable and more explicit.
This is not a good idea:

```javascript
phantomcss.screenshot("#sidebar li:nth-child(3) > div form");
```

But this is:

```javascript
phantomcss.screenshot("#feedback-form");
```

#### PhantomCSS should not be used to replace functional tests

If you needed functional tests before, then you still need them.  Automated visual regression testing gives us coverage of CSS and design in a way we didn't have before, but that doesn't mean that conventional test assertions are now invalid.  Feedback time is crucial with test automation, the longer it takes the easier it is to ignore; the easier it is to ignore the sooner trust is lost from the team.  Unfortunately comparing images it not and never will be as fast as simple DOM assertion.

#### Don't try to test all the visuals

I'd argue this applies to all automated testing approaches.  As a rule, try to maximise coverage with fewer tests.  This is a difficult balancing act because granular feedback/reporting is very important for debugging and build analysis. Testing many things in one assert/screenshot might tell you there is a problem, but makes it harder to get to the root of the bug.  As a CSS/HTML Dev you'll know what components are more fragile than others, which are reused and which aren't, concentrate your visual tests on these areas.

#### Full page screenshots are a bad idea

If you try to test too much in one screenshot then you could end up with lots of failing tests every time someone makes a small change.  Say you've set up full-page visual regression tests for your 50 page website, and someone adds 2px padding to the footer - that’s 50 failed tests because of one change.  It's better to test UI components individually; in this example the footer could have its own test.
There is also a technical problem with this approach, the larger the image, the longer it takes to process.  An added pixel padding on the page body will offset everything, at best you'll have a sea of pink in the failed diff, at worse you'll get a TIMEOUT because it took too long to analyse.

#### Scaling visual regression testing within a large team

Scaling your test suite for many contributors may not be easy. [Resemble.js](http://huddle.github.com/Resemble.js/) (the core analysis engine of PhantomCSS) tries to consider image differences caused by different operating systems and graphics cards, but it's only so good, you are likely to see problems as more people contribute baseline screenshots.  You can mitigate this by hiding problematic elements such as select elements, file upload inputs etc. as so.

```javascript
phantomcss.screenshot("#feedback-form", undefined, 'input[type=file]');
```

Below is an example of a false-negative caused by antialiasing differences on different machines. How can we solve this?  Contributions welcome!

![Three images: baseline, latests and diff where antialiasing has caused the failed diff](https://raw.github.com/Huddle/PhantomCSS/master/readme_assets/false-negative.png "A False-negative?")

#### Scaling visual regression testing with Git

If your using a version control system like Git to store the baseline screenshots the repository size becomes increasingly relevant as your test suite grows.  I'd recommend using a tool like https://github.com/joeyh/git-annex or https://github.com/schacon/git-media to store the images outside of the repo.

#### ...You might also be interested in

[PhantomFlow](http://github.com/Huddle/PhantomFlow), is an experimental way of describing and visualising user flows through tests. As well as providing a terse readable structure for UI testing, it also produces a fantastic graph visualisation that can be used to present PhantomCSS screenshots and failed diffs.  We're actively using it at Huddle and its changing the way we think about UI for the better.


--------------------------------------

PhantomCSS was created by [James Cryer](http://github.com/jamescryer) and the Huddle development team.