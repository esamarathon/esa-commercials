"use strict";
/* eslint-disable max-len */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggle = exports.disabled = exports.cycles = void 0;
const nodecg_1 = require("./nodecg");
/**
 * This is where you can declare all your replicant to import easily into other files,
 * and to make sure they have any correct settings on startup.
 */
exports.cycles = (0, nodecg_1.get)().Replicant('cycles');
exports.disabled = (0, nodecg_1.get)().Replicant('disabled');
exports.toggle = (0, nodecg_1.get)().Replicant('toggle');
