const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const root = process.argv[2] ? path.join(cwd, process.argv[2]) : cwd;

const extToContentType = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
};

const server = http.createServer((req, res) => {
  console.log(`[${req.method}] ${req.url}`);

  const parsedUrl = url.parse(req.url);
  let relativeName = parsedUrl.pathname;
  let pathname = path.join(root, relativeName);
  let ext = path.parse(pathname).ext;

  if (!ext && !relativeName.endsWith('/')) {
    ext = '.html';
    pathname += ext;
  }

  fs.stat(pathname, (err, stat) => {
    if (err) {
      res.statusCode = 404;
      res.end(`File '${relativeName}' not found!`);
      return;
    }

    if (stat.isDirectory()) {
      pathname = path.join(pathname, `index.html`);
      relativeName = path.join(relativeName, `index.html`);
      ext = '.html';
    }

    fs.readFile(pathname, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end(`Error reading: '${relativeName}'`);
        console.error(err);
      } else {
        const contentType = extToContentType[ext] || 'text/plain';
        res.setHeader('Content-Type', contentType);
        res.end(data);
      }
    });
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () =>
  console.log(
    `Server listening on port ${port}...\n  Static files root: ${root}`
  )
);
