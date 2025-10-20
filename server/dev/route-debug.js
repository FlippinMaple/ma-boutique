// server/dev/route-debug.js
import * as express from 'express';

function wrapProto(proto, label) {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'use', 'all'];
  for (const m of methods) {
    if (typeof proto[m] !== 'function') continue;
    const orig = proto[m];
    proto[m] = function (path, ...handlers) {
      try {
        return orig.call(this, path, ...handlers);
      } catch (e) {
        // Affiche la signature ET une stack vers TON fichier
        console.error(
          `❌ Route error on ${label}.${m}(${JSON.stringify(path)})`
        );
        console.error(e?.message || e);
        console.error(new Error('↩ Registered here').stack);
        throw e;
      }
    };
  }
}

// Patch both Application and Router
wrapProto(express.application, 'app');
wrapProto(express.Router.prototype, 'router');
