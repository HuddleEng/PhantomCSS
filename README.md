PhantomCSS
==========

*CSS regression testing*. An integration of [js-imagediff](/HumbleSoftware/js-imagediff) with [PhantomJS](/ariya/phantomjs/) and [CasperJS](/n1k0/casperjs) for automating visual regression testing and test coverage of Website styling to support refactoring of CSS.

### Why?

The problem with functional UI tests is that they make assertions on HTML markup, not the actual rendering. You can't know through automated tests if something has visually broke, too much margin, disabled state etc.  This situation is exacerbated by the increasing use of CSS3 for visual state changes that were traditionally built with JavaScript and DOM manipulation, ':target' pseudoclass or keyframes for example.

### How?

PhantomCSS takes screenshots captured by PhantomJS and compares them to baseline images using [js-imagediff](/HumbleSoftware/js-imagediff) to test for rgb pixel differences with HTML5 canvas.

PhantomCSS can only work when UI is predictable. It's possible to hide mutable UI components with PhantomCSS but it would be better if could drive the UI from faked data during test runs.  Take a look at [PhantomXHR](/Huddle/PhantomXHR) for mocking XHR requests.

### Example

Check out the [demo](/Huddle/PhantomCSS/tree/master/demo) for a full working example.

```javascript

var css = require('./modules/phantomcss.js');

css.init({
	libraryRoot: './modules/PhantomCSS',
	screenshotRoot: './screenshots',
	testRunnerUrl: 'http://my.blank.page.html', //  needs to be a 'http' domain for the HTML5 magic to work
});

css.screenshot("#CSS .selector"/*, delay: 500, selector: ''.elements-to-be-hidden*/);

css.compareAll();
```

### Workflow

* Define what screenshots you need in your regular tests
* Ensure that the 'compareAll' method gets called at the end of the test run
* Find the screenshot directory and check that they look as you expect.  These images will be used as a baseline.  Subsequent test runs will report if the latest screenshot is different to the baseline
* Commit/push these baseline images with your normal tests (presuming you're using a version control system)
* Run the tests again.  New screenshots will be created to compare against the baseline image.  These new images can be ignored, they will be replaced every test run. They don't need to be committed


--------------------------------------

Created by [James Cryer](/jamescryer) and the Huddle development team.