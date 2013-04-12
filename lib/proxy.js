var net = require('net');
var port = 8989;

/**
* 从请求头部取得请求详细信息
* 如果是 CONNECT 方法，那么会返回 { method,host,port,httpVersion}
* 如果是 GET/POST 方法，那么返回 { metod,host,port,path,httpVersion}
*/
function parseRequest (buffer) {
  var s = buffer.toString('utf8');
  var arr;
  var method = s.split('\n')[0].match(/^([A-Z]+)\s/)[1];
  if (method === 'CONNECT') {
    arr = s.match(/^([A-Z]+)\s([^\:\s]+)\:(\d+)\sHTTP\/(\d\.\d)/);
    if (arr && arr[1] && arr[2] && arr[3] && arr[4]) {
      return {method: arr[1], host: arr[2], port: arr[3], httpVersion: arr[4]};
    }
  } else {
    arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d\.\d)/);
    if (arr && arr[1] && arr[2] && arr[3]) {
      var host = s.match(/Host\:\s+([^\n\s\r]+)/)[1];
      if (host) {
        var _p = host.split(':',2);
        return {method: arr[1], host: _p[0], port:_p[1]?_p[1]: 80, path: arr[2], httpVersion: arr[3]};
      }
    }
  }
  return false;
}

/**
* 从缓存中找到头部结束标记("\r\n\r\n")的位置
*/
function findBody (buffer) {
  for (var i = 0, len = buffer.length-3; i<len; i++) {
    if (buffer[i] === 0x0d && buffer[i + 1] === 0x0a && buffer[i + 2] === 0x0d && buffer[i + 3] === 0x0a) {
      return i + 4;
    }
  }
  return -1;
}

// 从http请求头部取得请求信息后，继续监听浏览器发送数据，同时连接目标服务器，并把目标服务器的数据传给浏览器
function proxy(req, client, buffer) {
  console.log(req.method + ' ' + req.host + ':' + req.port);

  //如果请求不是CONNECT方法（GET, POST），那么替换掉头部的一些东西
  if (req.method !== 'CONNECT') {
    //先从buffer中取出头部
    var _body_pos = findBody(buffer);
    if (_body_pos < 0) {
      _body_pos = buffer.length;
    }
    var header = buffer.slice(0, _body_pos).toString();
    //替换connection头
    header = header.replace(/(proxy\-)?connection\:.+\r\n/ig,'')
            .replace(/Keep\-Alive\:.+\r\n/i,'')
            .replace("\r\n",'\r\nConnection: close\r\n');

    //替换网址格式(去掉域名部分)
    if (req.httpVersion === '1.1') {
      var url = req.path.replace(/http\:\/\/[^\/]+/,'');
      if (url.path !== url) {
        header = header.replace(req.path,url);
      }
    }
    buffer = Buffer.concat([new Buffer(header, 'utf8'), buffer.slice(_body_pos)]);
  }

  //建立到目标服务器的连接
  var server = net.createConnection(req.port, req.host);
  //交换服务器与浏览器的数据
  client.pipe(server);
  server.pipe(client);
  // 异常
  client.on('error', function (err) {
    console.log(err);
  });
  server.on('error', function (err) {
    console.log(err);
  });

  if (req.method === 'CONNECT') {
    client.write("HTTP/1.1 200 Connection established\r\nConnection: close\r\n\r\n");
  } else {
    server.write(buffer);
  }
}

// 在本地创建一个server监听本地port端口
module.exports = function () {
  return net.createServer(function (client) {
    //首先监听浏览器的数据发送事件，直到收到的数据包含完整的http请求头
    var buffer = new Buffer(0);
    client.on('data',function (data) {
      buffer = Buffer.concat([buffer, data]);
      if (findBody(buffer) === -1) {
        return;
      }
      var req = parseRequest(buffer);
      if (req) {
        client.removeAllListeners('data');
        proxy(req, client, buffer);
      }
    });
  });
};
