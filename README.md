o_o
===

HTTP/HTTPS 代理服务器

## 应用场景
在 iOS 设备上，无法更改 hosts，但是对于一些自定义的域名，又需要访问。解决方案就是在电脑上开启 HTTP/HTTPS 代理，让 iOS 设备设置 HTTP 代理，使之通过电脑上的 hosts ，完成目标主机的访问。

目前有很多软件可以实现代理，如 Charles、Fiddler 等，它们功能强大，但是仅仅解决 hosts 问题的话，大材小用了。o_o，轻巧易用，跨平台哦。

## Usage

### 命令行形式

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
const proxy = require('o_o');
proxy().listen(8989);
```

#### 引入额外的hosts文件

```js
const fs = require('fs');

const proxy = require('o_o');

const hosts = fs.readFileSync('./my_hosts', 'utf8');
proxy(hosts).listen(8989);
```

## License
The MIT License, enjoy it.
