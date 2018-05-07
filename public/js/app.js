// Client side data storage
var DATA = { 1: [], 2: [] };
// Chart axis ranges 
//(a value of 20 extends from -20 to 20);
var RANGEX = 20;
var RANGEY = 20;
// Column name for X-axis
var DATAX = 'Knee Int/Ext R.';
// Column name for Y-axis
var DATAY = 'Ankle Flex/Ext';
// Set default tolerance for comparison
var TOLERANCE = 1.0;
// Firebase config
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyD8ZAQxNMQNaYAyhniMICa3DNvAuOpNZ_c",
  authDomain: "polya-1.firebaseapp.com",
  databaseURL: "https://polya-1.firebaseio.com",
  projectId: "polya-1",
  storageBucket: "polya-1.appspot.com",
  messagingSenderId: "1015410485437"
};

$( document ).ready(function() {

  // Initialize Firebase
  firebase.initializeApp(FIREBASE_CONFIG);
  // Firebase file storage reference
  var storageRef = firebase.storage().ref();

  // Set UI states
  $('#loading, #loading-analysis').hide();
  $('#analysis').hide();

  // Event handlers

  $('#tolerance').on('input', function(event) {
    TOLERANCE = event.target.value;
    console.log(`tolerance changed to ${TOLERANCE}`);
  });

  $('textarea').on('input', function(event) {
    processData( event.target.value, event.target.dataset.id );
  });

  $("#analyze").on('click', function (event) {
    analyzeData();
  });

  $(window).resize(function(evt) {
    plot();
  });

  $('form').submit(function (evt) {
    plot();
    analyzeData();
  })

  // Handle file uploads
  $('.inputfile').change(function(event) {

    $('#loading').show();

    var fileId = event.target.id;
    var file = this.files[0];

    var fileRef = storageRef.child(`${fileId}.tsv`);

    console.log('Uploading ', fileId, file);
    fileRef.put(file).then(function(snapshot) {
      var downloadURL = snapshot.downloadURL;
      console.log(`${fileId} uploaded.`);

      function done() {
        $('#loading').hide();
        console.log(`${fileId} contents read.`);
        var fileContents = this.response;
        var id = fileId == 'file1' ? 1 : 2;
        processData(fileContents, id);
      }

      var xmlhttp;
      xmlhttp = new XMLHttpRequest();
      xmlhttp.addEventListener("load", done, false);
      xmlhttp.open("GET", downloadURL,true);
      xmlhttp.send();
    });

  });


  // Process datasets from either 
  // pasted text or file uploads
  // plots and runs a data anaylsis if two 
  // datasets are stored in memory
  function processData(data, id) {

    DATA[ id ] = [];

    data = data.split('\t');

    if (data[0] == 'Tiempo' ) {
      // session description was erased from text file
      data.shift();
      data.shift();
      data.shift();
      data.shift();
    }
    else if (data[0].length > 10) data.shift(); // session description is split into index 0

    data.map( (d,i) => {
     if (i%3==0) DATA[ id ].push({ "Ankle Flex/Ext": data[i], "Knee Int/Ext R.": data[i+1]});
    });

    plot();
    analyzeData();
  }


  // If two datasets are stored in memory
  // run data analysis for the two sets 
  // and display on screen
  function analyzeData() {

    if (DATA[2].length > 0 && DATA[1].length > 0) {

      $('#loading-analysis').show();
      $('#analysis').hide();

      setTimeout(function () {
        $.ajax({
          type: "POST",
          url: '/api/analyze',
          data: {
            dataset1: DATA[1],
            dataset2: DATA[2],
            tolerance: TOLERANCE
          },
          success: function(response) {
            console.log(response);

            $('#hits').html( response.hits + "/" + response.totalSampledPoints );
            $('#q1accuracy').html( response.coverage_areas['quadrant1'].accuracy + "%" );
            $('#q2accuracy').html( response.coverage_areas['quadrant2'].accuracy + "%" );
            $('#q3accuracy').html( response.coverage_areas['quadrant3'].accuracy + "%" );
            $('#q4accuracy').html( response.coverage_areas['quadrant4'].accuracy + "%" );
            $('#accuracy').html( response.accuracy + "%" );
            $('#coverage').html( response.coverage + '%' );

            $('#loading-analysis').hide();
            $('#analysis').show();
          }
        });
      }, 100);
    }
  }



  // gridlines in x axis function
  function make_x_gridlines(x) {   
      return d3.axisBottom(x)
          .ticks(10)
  }

  // gridlines in y axis function
  function make_y_gridlines(y) {   
      return d3.axisLeft(y)
          .ticks(10)
  }


  function plot() {
    $('#loading').show();
    $('#chart').html('');

    var dimension = parseInt($('.chart-container').height() * .9);

    var margin = {top: 20, right: 20, bottom: 20, left: 20},
        width = dimension,
        height = dimension - margin.top;

    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);

    var svg = d3.select('#chart')
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the data
    x.domain([-RANGEX, RANGEX]).range([0, width]).nice();
    y.domain([-RANGEY, RANGEY]).range([0, height]).nice();


    // add the X gridlines
    svg.append("g")     
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(make_x_gridlines(x)
            .tickSize(-height)
            .tickFormat("")
        )

    // add the Y gridlines
    svg.append("g")     
        .attr("class", "grid")
        .call(make_y_gridlines(y)
            .tickSize(-width)
            .tickFormat("")
        )

    // Add the X Axis
    svg.append("g")
      .attr("class", "chart-item")
      .attr("transform", "translate(0,"+height/2+")")
      .call(d3.axisBottom(x));

    // text label for the x axis
    svg.append("text")  
      .attr("class", "chart-item")           
      .attr("transform", "translate(" + width/2 + "," + (height + margin.top*1.5) + ")")
      .style("text-anchor", "middle")
      .text( DATAX );


    // Add the Y Axis
    svg.append("g")
      .attr("class", "chart-item")       
      .attr("transform", "translate(" + width/2 + ", 0)")
      .call(d3.axisLeft(y));

    // text label for the y axis
    svg.append("text")
      .attr("class", "chart-item")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - (margin.left * 2.5) )
      .attr("x", 0 - (width / 2))
      .attr("dy", "2em")
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


    $('#loading').hide();
  }

  plot();
});