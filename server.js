const express = require('express')
const app = express()
const path = require('path');

const PORT = process.env.PORT || 3000;

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/doc', function(req, res) {
    res.sendFile(path.join(__dirname + '/doc.html'));
});

app.get('*.*', express.static(path.join(process.cwd()), {
  maxAge: '1y'
}));

app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});