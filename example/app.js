var fs = require('fs');
require('../')(fs.readFileSync('./hosts').toString()).listen(8890);

// or just
// require('../')().listen(8890);
