"use strict";
/* eslint-disable global-require */
var nodecg_1 = require("./util/nodecg");
module.exports = function (nodecg) {
    nodecg_1.set(nodecg);
    require('./commercial');
};
