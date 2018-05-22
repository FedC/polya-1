const express = require('express');
const router  = express.Router();
const datalib = require('datalib');
const sample  = require('d3fc-sample');

const SAMPLE_BUCKET_SIZE = 1.5;

const sampler = sample.largestTriangleThreeBucket();

sampler.x(d => d['Ankle Flex/Ext'])
      .y(d => d['Knee Int/Ext R.']);

// Configure the size of the buckets used to downsample the data.
sampler.bucketSize( SAMPLE_BUCKET_SIZE );

let distance = function(p1, p2) {
  /*
    Distance = √(x2−x1)^2+(y2−y1)^2
  */
  return Math.sqrt( Math.pow((p2.x - p1.x), 2) + Math.pow((p2.y - p1.y), 2) );
}


let determineQuadrant = function(p1, p2) {
  let quadrant;

  if (p1 > 0 && p2 > 0) quadrant = 'quadrant1';
  if (p1 < 0 && p2 > 0) quadrant = 'quadrant2';
  if (p1 < 0 && p2 < 0) quadrant = 'quadrant3';
  if (p1 > 0 && p2 < 0) quadrant = 'quadrant4';

  return quadrant;
} 

router.post('/analyze', function(req, res) {

  let dataset1 = [];
  let dataset2 = [];
  let error_spread = 0;
  let tolerance = req.body.tolerance || 1;

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

  // Parse datasets from payload
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


  var sampledDataset1 = sampler(dataset1);
  console.log(`Reduced data size from ${dataset1.length} to ${sampledDataset1.length}`);


  var sampledDataset2 = sampler(dataset2);
  console.log(`Reduced data size from ${dataset2.length} to ${sampledDataset2.length}`);


  sampledDataset2.forEach(d2 => {
    let ankle2   = d2['Ankle Flex/Ext'];
    let knee2    = d2['Knee Int/Ext R.'];

    let quadrant = determineQuadrant(ankle2, knee2);

    coverage_areas[quadrant].total_points++;

    coverage_areas[quadrant].inside = true;

    d2.inside = false;

    sampledDataset1.some(d1 => {
      let ankle1 = d1['Ankle Flex/Ext'];
      let knee1 = d1['Knee Int/Ext R.'];

      // only if points are inside of quadrant we are analyzing
      if (determineQuadrant(ankle1, knee1) == quadrant) {

        let dist = distance( {x: ankle1, y: knee1}, {x: ankle2, y: knee2} );

        if ( dist <= tolerance ) {
          // if this data point was never before marked inside
          if (!d2.inside) coverage_areas[quadrant].total_points_in++;
          // now we finally say this data point is inside
          d2.inside = true;

          return d2.inside; // no need to keep searching

        } else {
          // record error spread while they are in the same quadrant
          error_spread = Math.max(error_spread, dist);
        }

      }

    });

  });


  let hits = sampledDataset2.filter(d => d.inside).length;

  let accuracy = parseFloat( hits / sampledDataset2.length * 100).toFixed(3);

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
    hits: hits,
    totalSampledPoints: sampledDataset2.length
  };

  res.send(response);
});

module.exports = router;