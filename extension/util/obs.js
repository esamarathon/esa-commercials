"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const obs_websocket_js_1 = __importDefault(require("obs-websocket-js"));
const nodecg_1 = require("./nodecg");
const config = (0, nodecg_1.get)().bundleConfig.obs;
const obs = new obs_websocket_js_1.default();
const settings = {
    address: config.address,
    password: config.password,
};
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield obs.connect(settings);
            (0, nodecg_1.get)().log.info('[OBS] Connection successful');
        }
        catch (err) {
            (0, nodecg_1.get)().log.warn('[OBS] Connection error');
            (0, nodecg_1.get)().log.debug('[OBS] Connection error:', err);
        }
    });
}
if (config.enable) {
    (0, nodecg_1.get)().log.info('[OBS] Setting up connection');
    connect();
    obs.on('ConnectionClosed', () => {
        (0, nodecg_1.get)().log.warn('[OBS] Connection lost, retrying in 5 seconds');
        setTimeout(connect, 5000);
    });
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Pretty sure this emits an error.
obs.on('error', (err) => {
    (0, nodecg_1.get)().log.warn('[OBS] Connection error');
    (0, nodecg_1.get)().log.debug('[OBS] Connection error:', err);
});
exports.default = obs;
