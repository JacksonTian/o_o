var request = require('superagent');

request.get('http://192.168.10.12/')
  .set('Host', 'koa.dev')
  .end(function (err, res) {
    console.log(res.text);
  });