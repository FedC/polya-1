var DATA = {
	1: [], // data set 1
	2: [] // data set 2
};

var RANGEX = 20;
var RANGEY = 20;

var DATAX = 'Knee Int/Ext R.';
var DATAY = 'Ankle Flex/Ext';

$('#loading').hide();

// Firebase config
var config = {
  apiKey: "AIzaSyD8ZAQxNMQNaYAyhniMICa3DNvAuOpNZ_c",
  authDomain: "polya-1.firebaseapp.com",
  databaseURL: "https://polya-1.firebaseio.com",
  projectId: "polya-1",
  storageBucket: "polya-1.appspot.com",
  messagingSenderId: "1015410485437"
};

// Firebase init
firebase.initializeApp(config);
var storageRef = firebase.storage().ref();
var file1Ref = storageRef.child('file1.tsv');
var file2Ref = storageRef.child('file2.tsv');

function handleFiles(delegate, files) {
	var file = files[0];
	console.log('Uploading file...', file);
	file1Ref.put(file).then(function(snapshot) {
		console.log('File uploaded.');
		var downloadURL = snapshot.downloadURL;

		collectDataFromFile({
			url: downloadURL,
			set: delegate == 'chart1' ? 1 : 2
		});

	});
}

function collectDataFromFile(options) {
	console.log("COLLECTING DATA...");

	d3.tsv(options.url, function(error, data) {
	  if (error) throw error;
	  var data_error;

	  data.forEach(function(d) {
	  	// console.log(d);
	    var keys = Object.keys(d);
	    if (keys.length < 3) data_error = 'The data is not formatted correctly. Ensure text file headers are separated by TABS.';

	    d[DATAX] = +d[keys[2]];
	    d[DATAY] = +d[keys[1]];

      // console.log( d );
      DATA[options.set].push(d);

	    RANGEX = Math.max(Math.abs(d[DATAX]), Math.abs(RANGEX));
	    RANGEY = Math.max(Math.abs(d[DATAY]), Math.abs(RANGEY));
	  });

	  if (data_error) alert(data_error);

	  console.log('DONE LOADING DATA:', DATA);
	  plot();

	});

}


function plot() {

	$('#loadin').show();
	$('#chart').html('');

	var margin = {top: 20, right: 20, bottom: 30, left: 50},
	    width = 500 - margin.left - margin.right,
	    height = 500 - margin.top - margin.bottom;

	var x = d3.scaleLinear().range([0, width]);
	var y = d3.scaleLinear().range([height, 0]);

  var svg = d3.select('#chart')
	  .append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", (height + 20) + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Scale the range of the data
  x.domain([-RANGEX, RANGEX]).range([0, width]).nice();
  y.domain([-RANGEY, RANGEY]).range([0, height]).nice();

  // Add the X Axis
  svg.append("g")
    .attr("class", "chart-item")
    .attr("transform", "translate(0,"+height/2+")")
    .call(d3.axisBottom(x));

  // text label for the x axis
  svg.append("text")  
    .attr("class", "chart-item")           
    .attr("transform", "translate("+width/2+"," + (height + margin.top + 20) + ")")
    .style("text-anchor", "middle")
    .text( DATAX );


  // Add the Y Axis
  svg.append("g")
    .attr("class", "chart-item")       
    .attr("transform", "translate("+width/2+",0)")
    .call(d3.axisLeft(y));

  // text label for the y axis
  svg.append("text")
    .attr("class", "chart-item")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text( DATAY ); 


  var valueline = d3.line()
    .x(function(d) { return x(d[DATAX]); })
    .y(function(d) { return y(d[DATAY]); });

  svg.append("path")
      .data([DATA['1']])
      .attr("class", "control line")
      .attr("d", valueline);


  svg.append("path")
      .data([DATA['2']])
      .attr("class", "actual line")
      .attr("d", valueline);


  $('#loadin').hide();
}