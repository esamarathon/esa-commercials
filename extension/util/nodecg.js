"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = exports.set = void 0;
var nodecg;
function set(ctx) {
    nodecg = ctx;
}
exports.set = set;
function get() {
    return nodecg;
}
exports.get = get;
