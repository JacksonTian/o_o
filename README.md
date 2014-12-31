o_o
===

HTTP/HTTPS代理

## 应用场景
在iOS设备上，无法更改hosts，但是对于一些自定义的域名，又需要访问。解决方案就是在电脑上开启HTTP/HTTPS代理，让iOS设备设置HTTP代理，使之通过电脑上的hosts，完成目标主机的访问。

目前有很多软件可以实现代理，如Charles、Fiddler等，它们功能强大，但是仅仅解决hosts问题的话，大材小用了。o_o，轻巧易用，跨平台哦。

## Usage
### 命令行

```bash
$ npm install o_o -g
$ o_o 8989
```

也可以加载额外的hosts文件:
```bash
$ o_o -f ./my_hosts
```

### 脚本编程
#### 快速使用
```js
var proxy = require('o_o');
proxy().listen(8989);
```

#### 引入额外的hosts文件
```js
var proxy = require('o_o');
var hosts = require('fs').readFileSync('./my_hosts', 'utf8');
proxy(hosts).listen(8989);
```

## License
The MIT License, enjoy it.
