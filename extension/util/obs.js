"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStreaming = void 0;
const obs_websocket_js_1 = __importStar(require("obs-websocket-js"));
const nodecg_1 = require("./nodecg");
const config = (0, nodecg_1.get)().bundleConfig.obs;
const obs = new obs_websocket_js_1.default();
let obsStreaming = false;
function connect() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { obsWebSocketVersion, rpcVersion, } = yield obs.connect(config.address, config.password, {
                // eslint-disable-next-line no-bitwise
                eventSubscriptions: obs_websocket_js_1.EventSubscription.MediaInputs | obs_websocket_js_1.EventSubscription.Transitions,
            });
            (0, nodecg_1.get)().log.debug('[OBS] Connected (version: %s, RPC: %s)', obsWebSocketVersion, rpcVersion);
            const data = yield obs.call('GetStreamStatus');
            obsStreaming = data.outputActive;
        }
        catch (err) {
            try {
                yield obs.disconnect();
            }
            catch ( /* ignore errors */_b) { /* ignore errors */ }
            (0, nodecg_1.get)().log.warn('[OBS] Connection error (reason: %s - %s)', (_a = err.code) !== null && _a !== void 0 ? _a : 'N/A', err.message || 'N/A');
        }
    });
}
if (config.enabled) {
    (0, nodecg_1.get)().log.info('[OBS] Setting up connection');
    connect().catch(() => { });
    obs.on('StreamStateChanged', (data) => { obsStreaming = data.outputActive; });
    obs.on('ConnectionClosed', (data) => {
        var _a;
        (0, nodecg_1.get)().log.warn('[OBS] Connection closed (reason: %s - %s)', (_a = data.code) !== null && _a !== void 0 ? _a : 'N/A', data.message || 'N/A');
        setTimeout(connect, 5000);
    });
}
obs.on('ConnectionError', (err) => {
    (0, nodecg_1.get)().log.warn('[OBS] Connection error (reason: %s - %s):', err.code, err.message);
});
function isStreaming() {
    return obsStreaming;
}
exports.isStreaming = isStreaming;
exports.default = obs;
