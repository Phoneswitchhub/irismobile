const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  
  // Handle root redirect
  if (reqUrl === '/' || reqUrl === '/index.html') {
    res.writeHead(302, { 'Location': '/irismobile/index.html' });
    res.end();
    return;
  }
  
  if (reqUrl === '/irismobile') {
    res.writeHead(302, { 'Location': '/irismobile/' });
    res.end();
    return;
  }
  
  // Strip '/irismobile/' prefix to find local file path
  let relativePath = reqUrl;
  if (reqUrl.startsWith('/irismobile/')) {
    relativePath = reqUrl.substring('/irismobile/'.length);
  }
  
  // Default to index.html if directory
  if (relativePath === '' || relativePath === '/') {
    relativePath = 'index.html';
  }
  
  const filePath = path.join(__dirname, relativePath);
  
  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + reqUrl);
      return;
    }
    
    // Serve file
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Iris Mobile Local Server is running!`);
  console.log(`👉 http://localhost:${PORT}/irismobile/index.html\n`);
  console.log(`Press Ctrl+C to stop the server.`);
});
