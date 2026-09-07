// apt.sanctuaireagentique.com — Debian repository front end.
//
// GET  /<key>       serves the object from R2, except that anything under
//                   pool/ listed in pool-map.json is redirected to where the
//                   package actually lives (usually a GitHub release asset),
//                   so large .deb files never transit this Worker or R2.
// PUT  /<key>       writes the object, given the publish bearer token.

const PUBLIC_MAX_AGE = { 'dists/': 'no-cache', 'pool-map.json': 'no-cache' };

function cacheControlFor(key) {
  for (const prefix in PUBLIC_MAX_AGE) {
    if (key.startsWith(prefix)) return PUBLIC_MAX_AGE[prefix];
  }
  return 'public, max-age=3600';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

    if (request.method === 'PUT') {
      const auth = request.headers.get('authorization') || '';
      if (auth !== `Bearer ${env.PUBLISH_TOKEN}`) {
        return new Response('forbidden\n', { status: 403 });
      }
      if (!key) return new Response('missing key\n', { status: 400 });
      await env.APT.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get('content-type') || 'application/octet-stream',
          cacheControl: cacheControlFor(key),
        },
      });
      return new Response(`stored ${key}\n`);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('method not allowed\n', {
        status: 405,
        headers: { allow: 'GET, HEAD, PUT' },
      });
    }

    if (!key) return new Response('Sanctuaire Agentique apt repository\n');

    if (key.startsWith('pool/')) {
      const map = await env.APT.get('pool-map.json');
      if (map) {
        const target = (await map.json())[key];
        if (target) return Response.redirect(target, 302);
      }
      // Fall through: small packages may be stored in the bucket directly.
    }

    const object = await env.APT.get(key);
    if (!object) return new Response('not found\n', { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', cacheControlFor(key));
    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  },
};
