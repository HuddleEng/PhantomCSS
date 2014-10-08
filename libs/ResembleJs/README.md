Resemble.js
==========

Analyse and compare images with Javascript and HTML5. [Resemble.js Demo](http://huddle.github.com/Resemble.js/)

![Two image diff examples side-by-side, one pink, one yellow.](https://raw.github.com/Huddle/Resemble.js/master/demoassets/readmeimage.jpg "Visual image comparison")

### Get it

`npm install resemblejs`

`bower install resemblejs`

### Example

Retrieve basic analysis on image.

```javascript
var api = resemble(fileData).onComplete(function(data){
	console.log(data);
	/*
	{
	  red: 255,
	  green: 255,
	  blue: 255,
	  brightness: 255
	}
	*/
});
```

Use resemble to compare two images.

```javascript
var diff = resemble(file).compareTo(file2).ignoreColors().onComplete(function(data){
	console.log(data);
	/*
	{
	  misMatchPercentage : 100, // %
	  isSameDimensions: true, // or false
	  dimensionDifference: { width: 0, height: -1 }, // defined if dimensions are not the same
	  getImageDataUrl: function(){}
	}
	*/
});
```

You can also change the comparison method after the first analysis.

```javascript
// diff.ignoreNothing();
// diff.ignoreColors();
diff.ignoreAntialiasing();
```

And change the output display style.

```javascript
resemble.outputSettings({
  errorColor: {
    red: 255,
    green: 0,
    blue: 255
  },
  errorType: 'movement',
  transparency: 0.3,
  largeImageThreshold: 1200
});
// resembleControl.repaint();
```

By default, the comparison algorithm skips pixels when the image width or height is larger than 1200 pixels. This is there to mitigate performance issues.

You can switch this modify this behaviour by setting the `largeImageThreshold` option to a different value. Set it to **0** to switch it off completely.

--------------------------------------

Created by [James Cryer](http://github.com/jamescryer) and the Huddle development team.
