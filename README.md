PhantomCSS
==========

Integration of js-imagediff with PhantomJS for automated visual regression testing.

### Why?

PhantomJS & CasperJS provide an excellent framework in which to test Web applications. PhantomCSS can be used to augment your functional test suite with visual checks for coverage of CSS and HTML Markup.

### Example

```javascript

var css = require('./modules/phantomcss.js');

css.init({
	libraryRoot: './modules/PhantomCSS',
	screenshotRoot: './screenshots',
	testRunnerUrl: 'http://my.blank.page.html', //  needs to be a 'http' domain for the HTML5 magic to work
});

css.screenshot("#CSS .selector");

css.compareAll();
```

### Author

+ [James Cryer](/jamescryer)