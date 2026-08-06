import serverModule from '../dist/server/server.js';

const server = serverModule.default ?? serverModule;

function getRequestUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  return new URL(req.url, `${protocol}://${host}`);
}

function getRequestHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  return headers;
}

export default async function handler(req, res) {
  const url = getRequestUrl(req);
  const request = new Request(url, {
    method: req.method,
    headers: getRequestHeaders(req),
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
  });

  const response = await server.fetch(request, process.env, undefined);

  res.statusCode = response.status;
  response.headers.forEach((value, name) => {
    res.setHeader(name, value);
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}
