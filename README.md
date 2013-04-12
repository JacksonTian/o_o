o_o
===

HTTP/HTTPS代理

## 应用场景
在iOS设备上，无法更改hosts，但是对于一些自定义的域名，又需要访问。解决方案就是在电脑上开启HTTP/HTTPS代理，让iOS设备设置HTTP代理，使之通过电脑上的hosts，完成目标主机的访问。

## Usage
### 命令行

```
[sudo] npm install o_o -g
o_o 8989
```

### 脚本编程

```
var proxy = require('o_o');
proxy().listen(8989);
```

## License
The MIT License, enjoy it.
