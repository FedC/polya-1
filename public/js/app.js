// Client side data storage
var DATA = { 1: [], 2: [], 3: [] };
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
// Analysis response
var ANALYSIS;
// chart globals
var SVG;
var DIMENSION;

// Firebase config
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyD8ZAQxNMQNaYAyhniMICa3DNvAuOpNZ_c",
  authDomain: "polya-1.firebaseapp.com",
  databaseURL: "https://polya-1.firebaseio.com",
  projectId: "polya-1",
  storageBucket: "polya-1.appspot.com",
  messagingSenderId: "1015410485437"
};

/*
  
  Use jQuery to wait for document to load

*/
$( document ).ready(function() {

  // Initialize Firebase
  firebase.initializeApp(FIREBASE_CONFIG);
  // Firebase file storage reference
  var storageRef = firebase.storage().ref();

  // Set UI states
  $('#loading, #loading-analysis').hide();
  $('#analysis').hide();
  $('#download-analysis').hide();

  $("#file1-download-section").hide();
  $("#file2-download-section").hide();


  // Custom file input behavior
  var inputs = document.querySelectorAll( '.inputfile' );
  Array.prototype.forEach.call( inputs, function( input )
  {
    var label  = input.nextElementSibling;
    var labelVal = label.innerHTML;
    
    input.addEventListener( 'focus', function() {
      input.classList.add( 'has-focus' ); 
    });
    
    input.addEventListener( 'blur', function() {
      input.classList.remove( 'has-focus' ); 
    });

    input.addEventListener( 'change', function( e )
    {
      var fileName = '';
      if( this.files && this.files.length > 1 )
        fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );
      else
        fileName = e.target.value.split( '\\' ).pop();

      if( fileName )
        label.querySelector('span').innerHTML = fileName;
      else
        label.innerHTML = labelVal;
    });
  });



  /*

    Event handlers

  */

  $('#tolerance').on('input', function(event) {
    TOLERANCE = event.target.value;
    console.log(`tolerance changed to ${TOLERANCE}`);
  });

  $('textarea').on('input', function(event) {
    processData( event.target.value, event.target.dataset.id );
  });

  $("#analyze").on('click', function () {
    analyzeData();
  });

  $(window).resize(function() {
    plot();
  });

  $('form').submit(function () {
    plot();
    analyzeData();
  });


  $('.download-png').on('click', function () {
    downloadPNG();
  });



  /*

    Download Chart as PNG

  */

  function downloadPNG() {
    var width = DIMENSION;
    var height = DIMENSION;
    
    var svgString = getSVGString( SVG.node() );

    svgString2Image( svgString, 2.2*width, 2.2*height, 'png', save ); // passes Blob and filesize String to the callback

    function save( dataBlob, filesize ){
      console.log('save', dataBlob, filesize);
      saveAs( dataBlob, 'chart.png' ); // FileSaver.js function
    }
  }


  // Below are the functions that handle actual exporting:
  // getSVGString ( svgNode ) and svgString2Image( svgString, width, height, format, callback )
  function getSVGString( svgNode ) {

    var clone = svgNode.cloneNode(true);

    clone.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
    
    var cssStyleText = `
      svg:not(:root) {
        overflow: visible;
      }

      .grid {
        fill: white;
      }

      .grid .tick line {
        stroke: lightgrey !important;
        stroke-opacity: 0.5;
        shape-rendering: crispEdges;
      }

      .grid path {
        stroke-width: 0;
      }

      .line {
        fill: none;
        stroke: steelblue;
        stroke-width: 2px;
      }

      .control.line {
        stroke: #fce95c;
      }

      .intersection {
        stroke: #ff3b3b;
      }
    `;

    appendCSS( cssStyleText, clone );

    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(clone);
    svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
    svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

    return svgString;

    function appendCSS( cssText, element ) {
      var styleElement = document.createElement("style");
      styleElement.setAttribute("type","text/css"); 
      styleElement.innerHTML = cssText;
      var refNode = element.hasChildNodes() ? element.children[0] : null;
      element.insertBefore( styleElement, refNode );
    }
  }



  /*

    SVG to Image

  */

  function svgString2Image( svgString, width, height, format, callback ) {
    var format = format ? format : 'png';

    var imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); // Convert SVG string to data URL
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var image = new Image();

    canvas.width = width;
    canvas.height = height;

    image.onload = function() {

      context.clearRect ( 0, 0, width, height );
      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob( function(blob) {
        var filesize = Math.round( blob.length/1024 ) + ' KB';
        if ( callback ) callback( blob, filesize );
      });
    };

    image.onerror = function(event, error) {
      alert('Something went wrong, try again.');
    };

    image.src = imgsrc;
  }




  /*

     File upload

  */

  $('.inputfile').change(function(event) {

    var fileId = event.target.id;
    var file = this.files[0];

    var fileRef = storageRef.child(`${fileId}.tsv`);

    if (!file) return false;

    $('#loading').show();

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


  
  $(".download-csv").click(function(event) {

    var file = $(event.currentTarget).data('file');

    var json = {};

    var fileName;

    if (file){
      json = DATA[ +file ];
      fileName = "file-" + file + ".csv";
    }
    else {

      json = [
        { 
          'Total Accuracy': ANALYSIS.accuracy, 
          'Total Coverage': ANALYSIS.coverage,
          'Quadrant 1 Accuracy': ANALYSIS.coverage_areas.quadrant1.accuracy,
          'Quadrant 2 Accuracy': ANALYSIS.coverage_areas.quadrant2.accuracy,
          'Quadrant 3 Accuracy': ANALYSIS.coverage_areas.quadrant3.accuracy,
          'Quadrant 4 Accuracy': ANALYSIS.coverage_areas.quadrant4.accuracy,
        }
      ]

      fileName = "analysis.csv";
    }

    var csv = JSON2CSV(json);

    var downloadLink = document.createElement("a");
    var blob = new Blob(["\ufeff", csv]);
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;

    downloadLink.download = fileName;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  });


  // JSON to CSV method
  function JSON2CSV(objArray) {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';
    var line = '';
    var head = array[0];

    console.log(array);

    for (var index in head) {
      line += index + ',';
    }

    line = line.slice(0, -1);
    str += line + '\r\n';

    for (var i = 0; i < array.length; i++) {
      var line = '';
      
      for (var index in array[i]) {
        line += array[i][index] + ',';
      }

      line = line.slice(0, -1);
      str += line + '\r\n';
    }
    return str;
  }


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
     if (i%3==0) DATA[ id ].push({ "Ankle Flex/Ext": data[i], "Knee Int/Ext R.": data[i+1], "Inversion/Eversion": data[i+2]});
    });

    $("#file" + id + "-download-section").show();

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
      $('#download-analysis').hide();

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

            ANALYSIS = response;

            plot(); // now with analysis data

            $('#hits').html( response.hits + "/" + response.totalSampledPoints );
            $('#q1accuracy').html( response.coverage_areas['quadrant1'].accuracy + "%" );
            $('#q2accuracy').html( response.coverage_areas['quadrant2'].accuracy + "%" );
            $('#q3accuracy').html( response.coverage_areas['quadrant3'].accuracy + "%" );
            $('#q4accuracy').html( response.coverage_areas['quadrant4'].accuracy + "%" );
            $('#accuracy').html( response.accuracy + "%" );
            $('#coverage').html( response.coverage + '%' );

            $('#loading-analysis').hide();
            $('#analysis').show();
            $('#download-analysis').show();
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
        .attr("height", height + margin.top + margin.bottom);

    var chart = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the data
    x.domain([-RANGEX, RANGEX]).range([0, width]).nice();
    y.domain([-RANGEY, RANGEY]).range([height, 0]).nice();


    // add the X gridlines
    chart.append("g")     
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(make_x_gridlines(x)
            .tickSize(-height)
            .tickFormat("")
        )

    // add the Y gridlines
    chart.append("g")     
        .attr("class", "grid")
        .call(make_y_gridlines(y)
            .tickSize(-width)
            .tickFormat("")
        )

    // Add the X Axis
    chart.append("g")
      .attr("class", "chart-item")
      .attr("transform", "translate(0,"+height/2+")")
      .call(d3.axisBottom(x));

    // text label for the x axis
    chart.append("text")  
      .attr("class", "chart-item")           
      .attr("transform", "translate(" + width/2 + "," + (height + 18) + ")")
      .style("text-anchor", "middle")
      .text( DATAX );


    // Add the Y Axis
    chart.append("g")
      .attr("class", "chart-item")       
      .attr("transform", "translate(" + width/2 + ", 0)")
      .call(d3.axisLeft(y));

    // text label for the y axis
    chart.append("text")
      .attr("class", "chart-item")
      .attr("transform", "rotate(-90)")
      .attr("y", -38)
      .attr("x", 0 - (width / 2))
      .attr("dy", "2em")
      .style("text-anchor", "middle")
      .text( DATAY ); 


    var valueline = d3.line()
      .x(function(d) { return x(d[DATAX]); })
      .y(function(d) { return y(d[DATAY]); });

    chart.append("path")
        .data([DATA['1']])
        .attr("class", "control line")
        .attr("d", valueline);


    chart.append("path")
        .data([DATA['2']])
        .attr("class", "actual line")
        .attr("d", valueline);

    if ( ANALYSIS ) {
      chart.selectAll("dot")
        .data(ANALYSIS.intersection)
        .enter()
        .append("circle")
        .attr("class", "intersection")
        .attr("r", 1)
        .attr("cx", function(d) { return x(d[DATAX]); })
        .attr("cy", function(d) { return y(d[DATAY]); });

    }

    DIMENSION = dimension;
    SVG = svg;

    $('#loading').hide();
  }

  plot();
});