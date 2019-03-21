'use strict';

const net = require('net');
const Hosts = require('hosts-parser').Hosts;

/**
 * 从缓存中找到头部结束标记("\r\n\r\n")的位置
 */
function findBody(buffer) {
  for (var i = 0, len = buffer.length - 3; i < len; i++) {
    if (buffer[i] === 0x0d && buffer[i + 1] === 0x0a &&
      buffer[i + 2] === 0x0d && buffer[i + 3] === 0x0a) {
      return i + 4;
    }
  }
  return -1;
}

function readHeader(readable) {
  return new Promise((resolve, reject) => {
    var buffer = Buffer.alloc(0);
    var ondata = function (data) {
      console.log(data.toString());
      buffer = Buffer.concat([buffer, data]);
      var pos = findBody(buffer);
      if (pos === -1) {
        return;
      }
      readable.removeListener('data', ondata);
      resolve([buffer.slice(0, pos), buffer.slice(pos)]);
    };
    readable.on('data', ondata);
  });
}

/**
 * 从请求头部取得请求详细信息
 * 如果是 CONNECT 方法，那么会返回 { method,host,port,httpVersion}
 * 如果是 GET/POST 方法，那么返回 { metod,host,port,path,httpVersion}
 */
function parseRequest(buffer) {
  const s = buffer.toString('utf8');
  var arr;
  var firstLine = s.split('\n')[0];
  var method = firstLine.match(/^([A-Z]+)\s/)[1];
  if (method === 'CONNECT') {
    arr = s.match(/^([A-Z]+)\s([^:\s]+):(\d+)\sHTTP\/(\d\.\d)/);
    if (arr && arr[1] && arr[2] && arr[3] && arr[4]) {
      return {
        method: arr[1],
        host: arr[2],
        port: arr[3],
        httpVersion: arr[4]
      };
    }
  } else {
    arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d\.\d)/);
    if (arr && arr[1] && arr[2] && arr[3]) {
      var hostHeader = s.match(/Host:\s+([^\n\s\r]+)/)[1];
      if (hostHeader) {
        var [ hostname, port ] = hostHeader.split(':', 2);
        return {
          method: arr[1],
          host: hostname,
          port: port || 80,
          path: arr[2],
          httpVersion: arr[3]
        };
      }
    }
  }

  return false;
}

function getRealHost(host, hosts) {
  // 匹配额外的hosts文件
  return hosts.resolve(host) || host;
}

// 解析 hosts 文件
function parseHosts(hosts = '') {
  const parsed = [];
  const lines = hosts.split('\n');
  for (var i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const matched = line.match(/([^\s]*)(?:\s*)([^\s]*)/);
    if (matched && matched.length === 3) {
      parsed.push({
        domain: matched[1],
        cname: matched[2]
      });
    }
  }

  return parsed;
}

async function proxyForConnect (req, client, header, rest, hosts) {
  const realHost = getRealHost(req.host, hosts);

  // 建立到目标服务器的连接
  var server = net.createConnection(req.port, realHost);
  // 异常
  client.on('error', function (err) {
    console.log(err);
  });
  server.on('error', function (err) {
    console.log(err);
  });
  // 交换服务器与浏览器的数据
  client.pipe(server);
  server.pipe(client);
  client.write('HTTP/1.1 200 Connection established\r\n');
  client.write('Connection: close\r\n\r\n');
}

// 从http请求头部取得请求信息后，继续监听浏览器发送数据，同时连接目标服务器，
// 并把目标服务器的数据传给浏览器
async function proxy(req, client, header, rest, hosts) {
  const realHost = getRealHost(req.host, hosts);
  var newHeader = header.toString();
  //替换connection头
  newHeader = newHeader.replace(/(proxy-)?connection:.+\r\n/ig, '')
    .replace(/Keep-Alive:.+\r\n/i, '')
    .replace('\r\n', '\r\nConnection: close\r\n');

  //替换网址格式(去掉域名部分)
  if (req.httpVersion === '1.1') {
    var url = req.path.replace(/http:\/\/[^/]+/, '');
    if (req.path !== url) {
      newHeader = newHeader.replace(req.path, url);
    }
  }
  // 建立到目标服务器的连接
  var server = net.createConnection(req.port, realHost);
  // 异常
  client.on('error', function (err) {
    console.log(err);
  });
  server.on('error', function (err) {
    console.log(err);
  });
  // 交换服务器与浏览器的数据
  client.pipe(server);
  console.log(newHeader);
  server.write(newHeader);
  server.write(rest);
  var [responseHeader, responseRest] = await readHeader(server);
  client.write(responseHeader.toString()
    .replace('\r\n', `\r\nVia: HTTP/${req.httpVersion} o_o\r\n`));
  client.write(responseRest);
  server.pipe(client);
}

// 在本地创建一个server监听本地port端口
module.exports = function (hosts) {
  hosts = new Hosts(hosts);

  return net.createServer(async function (client) {
    // 首先监听浏览器的数据发送事件，直到收到的数据包含完整的http请求头
    const [header, rest] = await readHeader(client);
    const req = parseRequest(header);
    if (req) {
      console.log(`${req.method} ${req.host}:${req.port}`);
      if (req.method === 'CONNECT') {
        await proxyForConnect(req, client, header, rest, hosts);
      } else {
        await proxy(req, client, header, rest, hosts);
      }
    }
  });
};
