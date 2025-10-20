import http from 'http';
const PORT = 4242;
http
  .createServer((_req, res) => res.end('ok'))
  .listen(PORT, '0.0.0.0', () => {
    console.log('PROBE listening on http://localhost:' + PORT);
  });
