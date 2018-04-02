const express = require('express')
const app = express()
const path = require('path');
let bodyParser = require("body-parser");

const PORT = process.env.PORT || 3000;

// if ( process.env.NODE_ENV === 'production' ) {
//   const forceSSL = function() {
//     return function (req, res, next) {
//       if (req.headers['x-forwarded-proto'] !== 'https') {
//         return res.redirect(
//          ['https://', req.get('Host'), req.url].join('')
//         );
//       }
//       next();
//     };
//   };
//   app.use(forceSSL());
// }

app.use(bodyParser.urlencoded({ extended: false, limit: 100000000, parameterLimit: 100000000}));
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log( `${req.method} ${req.url}`);
  next();
});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/doc', function(req, res) {
    res.sendFile(path.join(__dirname + '/doc.html'));
});

app.post('/analyze', function(req, res) {

  let tolerance = req.body.tolerance || 1;

  let dataset1 = [];
  let dataset2 = [];

  Object.keys(req.body).forEach(k => {
    if (k.includes('dataset')) {

      let value = req.body[k];

      let ary = k.replace(/]/g, '').split('[');

      let dataset = ary[0];

      let index = ary[1];

      let key = ary[2];

      switch(dataset) {
        case 'dataset1':
          dataset1[index] = dataset1[index] || {};
          dataset1[index][key] = value;
          break;
        default: // dataset2
          dataset2[index] = dataset2[index] || {};
          dataset2[index][key] = value;
          break;
      }

    }
  });

  if (!dataset1 || !dataset2) return res.status(500).send('No valid data provided');

  let distance = function(p1, p2) {
    /*
      Distance = √(x2−x1)^2+(y2−y1)^2
    */
    return Math.sqrt( Math.pow((p2.x - p1.x), 2) + Math.pow((p2.y - p1.y), 2) );
  }

  let error_spread = 0;

  let coverage_areas = {
    quadrant1: {
      inside: false,
      total_points: 0,
      total_points_in: 0,
      accuracy: null
    },
    quadrant2: {
      inside: false, 
      total_points: 0,
      total_points_in: 0,
      accuracy: null
    },
    quadrant3: {
      inside: false, 
      total_points: 0,
      total_points_in: 0,
      accuracy: null
    },
    quadrant4: {
      inside: false,
      total_points: 0,
      total_points_in: 0,
      accuracy: null
    },
  };

  dataset2.forEach(d2 => {
    let ankle2 = d2['Ankle Flex/Ext'];
    let knee2 = d2['Knee Int/Ext R.'];

    let quadrant;

    if (ankle2 < 0 && knee2 > 0) quadrant = 'quadrant1';
    if (ankle2 < 0 && knee2 < 0) quadrant = 'quadrant2';
    if (ankle2 > 0 && knee2 < 0) quadrant = 'quadrant3';
    if (ankle2 > 0 && knee2 > 0) quadrant = 'quadrant4';

    coverage_areas[quadrant].total_points++;
    coverage_areas[quadrant].inside = true;

    d2.inside = false;

    dataset1.some(d1 => {
      let ankle1 = d1['Ankle Flex/Ext'];
      let knee1 = d1['Knee Int/Ext R.'];
      let dist = distance( {x: ankle1, y: knee1}, {x: ankle2, y: knee2} );

      let d1quadrant = '';
      if (ankle1 < 0 && knee1 > 0) d1quadrant = 'quadrant1';
      if (ankle1 < 0 && knee1 < 0) d1quadrant = 'quadrant2';
      if (ankle1 > 0 && knee1 < 0) d1quadrant = 'quadrant3';
      if (ankle1 > 0 && knee1 > 0) d1quadrant = 'quadrant4';

      if ( dist <= tolerance ) {
        // if this data point was never before marked inside
        if (!d2.inside) coverage_areas[quadrant].total_points_in++;
        // now we finally say this data point is inside
        d2.inside = true;
        return true; // point is inside no need to keep searching
      } else {
        // record error spread while they are in the same quadrant
        if (d1quadrant == quadrant)
          error_spread = Math.max(error_spread, dist);
      }
    });

  });


  let hits = dataset2.filter(d => d.inside).length;

  let accuracy = parseFloat( hits / dataset2.length * 100).toFixed(3);

  let coverage_areas_count = 0;

  Object.keys(coverage_areas).forEach(k => {
    if (coverage_areas[k].inside) coverage_areas_count++;
    coverage_areas[k].accuracy = parseFloat(coverage_areas[k].total_points_in / coverage_areas[k].total_points * 100).toFixed(3);
    if ( isNaN(coverage_areas[k].accuracy) ) coverage_areas[k].accuracy = 0;
  });

  let coverage = parseFloat(coverage_areas_count / 4 * 100).toFixed(3);

  let response = {
    coverage_areas: coverage_areas,
    accuracy: accuracy,
    coverage: coverage,
    hits: hits
  };
  res.send(response);

});

app.get('*.*', express.static(path.join(process.cwd()), {
  maxAge: 2592000000
}));

app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});