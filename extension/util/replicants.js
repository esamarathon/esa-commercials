"use strict";
/* eslint-disable max-len */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggle = exports.disabled = void 0;
const nodecg_1 = require("./nodecg");
/**
 * This is where you can declare all your replicant to import easily into other files,
 * and to make sure they have any correct settings on startup.
 */
exports.disabled = nodecg_1.get().Replicant('disabled');
exports.toggle = nodecg_1.get().Replicant('toggle');
