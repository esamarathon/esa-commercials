"use strict";
/* eslint-disable max-len */
Object.defineProperty(exports, "__esModule", { value: true });
exports.twitchChannelInfo = exports.toggle = exports.disabled = exports.cycles = void 0;
const nodecg_1 = require("./nodecg");
// Wrapper for replicants that have a default (based on schema).
function hasDefault(name, namespaceOrOpts, opts) {
    return (0, nodecg_1.get)().Replicant(name, namespaceOrOpts, opts);
}
// Wrapper for replicants that don't have a default (based on schema).
function hasNoDefault(name, namespaceOrOpts, opts) {
    return (0, nodecg_1.get)().Replicant(name, namespaceOrOpts, opts);
}
/**
 * This is where you can declare all your replicant to import easily into other files,
 * and to make sure they have any correct settings on startup.
 */
exports.cycles = hasDefault('cycles');
exports.disabled = hasDefault('disabled');
exports.toggle = hasDefault('toggle');
exports.twitchChannelInfo = hasNoDefault('twitchChannelInfo', 'nodecg-speedcontrol');
