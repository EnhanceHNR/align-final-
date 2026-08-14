const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrstudio1602714920d28c = onRequest({}, (req, res) => server.then(it => it.handle(req, res)));
  