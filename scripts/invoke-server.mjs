import serverModule from '../dist/server/server.js';

const server = serverModule.default ?? serverModule;

async function invoke() {
  const url = 'http://localhost/';
  const req = new Request(url, { method: 'GET', headers: { host: 'localhost' } });
  try {
    const res = await server.fetch(req, process.env, undefined);
    console.log('Response status:', res.status);
    const text = await res.text();
    console.log('Response body (truncated):\n', text.slice(0, 2000));
  } catch (err) {
    console.error('Invocation error:');
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

invoke();
