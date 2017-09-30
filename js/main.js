// Initialize Firebase
// TODO: Replace with your project's customized code snippet
var config = {
  apiKey: "AIzaSyD8ZAQxNMQNaYAyhniMICa3DNvAuOpNZ_c",
  authDomain: "polya-1.firebaseapp.com",
  databaseURL: "https://polya-1.firebaseio.com",
  projectId: "polya-1",
  storageBucket: "polya-1.appspot.com",
  messagingSenderId: "1015410485437"
};
firebase.initializeApp(config);

var storageRef = firebase.storage().ref();

var file1Ref = storageRef.child('file1.csv');
var file2Ref = storageRef.child('file2.csv');

function handleFiles(delegate, files) {

	console.log(delegate);

	var file = files[0];

	console.log('Uploading file...', file);

	file1Ref.put(file).then(function(snapshot) {
		console.log('File read...');
		var downloadURL = snapshot.downloadURL;

		plotData({
			url: downloadURL,
			container: '#' + delegate
		});

	});

}




function plotData(options) {

	// set the dimensions and margins of the graph
	var margin = {top: 20, right: 20, bottom: 30, left: 50},
	    width = 500 - margin.left - margin.right,
	    height = 500 - margin.top - margin.bottom;

	// parse the date / time
	var parseTime = d3.timeParse("%d-%b-%y");

	// set the ranges
	var x = d3.scaleTime().range([0, width]);
	var y = d3.scaleLinear().range([height, 0]);

	// define the 1st line
	var valueline = d3.line()
	    .x(function(d) { return x(d['TIME']); })
	    .y(function(d) { return y(d['A Flex/Ext']); });

	// define the 2nd line
	var valueline2 = d3.line()
	    .x(function(d) { return x(d['TIME']); })
	    .y(function(d) { return y(d['Knee Int/Ext R']); });


	// define the 2nd line
	var valueline3 = d3.line()
	    .x(function(d) { return x(d['TIME']); })
	    .y(function(d) { return y(d['A I/E']); });

	// append the svg obgect to the body of the page
	// appends a 'group' element to 'svg'
	// moves the 'group' element to the top left margin
	var svg = d3.select(options.container).append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", (height * 2) + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform",
	          "translate(" + margin.left + "," + margin.top + ")");
  
	// Get the data
	d3.csv(options.url, function(error, data) {
	  if (error) throw error;

	  // format the data
	  data.forEach(function(d) {
	      d['TIME'] = +d['TIME'];
	      d['A Flex/Ext'] = +d['A Flex/Ext'];
	      d['Knee Int/Ext R'] = +d['Knee Int/Ext R'];
	      d['A I/E'] = +d['A I/E'];
	      console.log( d );
	  });

	  // Scale the range of the data
	  x.domain(d3.extent(data, function(d) { return d['TIME']; }));
	  y.domain([0, d3.max(data, function(d) {
		  return Math.max(d['A Flex/Ext'], d['Knee Int/Ext R'], d['A I/E']); })]);

	  // Add the valueline path.
	  svg.append("path")
	      .data([data])
	      .attr("class", "line")
	      .attr("d", valueline);

	  // Add the valueline2 path.
	  svg.append("path")
	      .data([data])
	      .attr("class", "line")
	      .style("stroke", "red")
	      .attr("d", valueline2);

	  // Add the valueline3 path.
	  svg.append("path")
	      .data([data])
	      .attr("class", "line")
	      .style("stroke", "green")
	      .attr("d", valueline3);

	  // Add the X Axis
	  svg.append("g")
	      .attr("transform", "translate(0," + height + ")")
	      .call(d3.axisBottom(x));

	  // Add the Y Axis
	  svg.append("g")
	      .call(d3.axisLeft(y));

	});

}