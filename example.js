var fs = require('fs');
require('./')(fs.readFileSync('./example.hosts').toString()).listen(8890);