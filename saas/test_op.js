const https = require('https');
const query = '[out:json][timeout:25];area[\"name\"=\"Tubize\"]->.searchArea;(way[\"building\"~\"house|detached|semi_detached|terrace\"](area.searchArea););out tags;';
const options = {
  hostname: 'overpass-api.de',
  port: 443,
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength('data=' + encodeURIComponent(query))
  }
};
const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const streets = new Set();
      parsed.elements.forEach(e => {
        if(e.tags && e.tags['addr:street']) streets.add(e.tags['addr:street']);
      });
      console.log('Streets from houses:', Array.from(streets).slice(0, 10));
      console.log('Total unique streets found:', streets.size);
    } catch(e) { console.error('Error parsing:', e); }
  });
});
req.on('error', e => console.error(e));
req.write('data=' + encodeURIComponent(query));
req.end();

