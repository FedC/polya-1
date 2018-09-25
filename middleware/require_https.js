//
//  Created by Elias Janetis on 1/1/17.
//  Copyright © 2017 Squeeze. All rights reserved.
//
/* Require before most other middleware */
module.exports = 
  function( req, res, next) {
    if ( req.headers['x-forwarded-proto'] && 
         req.headers['x-forwarded-proto']!='https' && 
         process.env.REQUIRE_HTTPS 
       )
      res.redirect('https://' + req.get('host') + req.originalUrl);
      
    else
      next(); /* Continue to other routes if we're not redirecting */
  };
