var fs = require('fs');
require('../')(fs.readFileSync('./hosts').toString()).listen(8890);
