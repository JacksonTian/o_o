var fs = require('fs');
require('../')(fs.readFileSync('./hosts', 'utf8').toString()).listen(8989);

// or just
// require('../')().listen(8989);
