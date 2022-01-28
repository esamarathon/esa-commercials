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
exports.setup = void 0;
const nodecg_1 = require("@esa-commercials/util/nodecg");
const needle_1 = __importDefault(require("needle"));
const socket_io_client_1 = require("socket.io-client");
const speedcontrol_1 = require("./util/speedcontrol");
const config = (0, nodecg_1.get)().bundleConfig;
const address = new URL(config.server.address !== 'ADDRESS'
    ? config.server.address
    : 'http://localhost:2345');
const pathname = address.pathname.endsWith('/')
    ? address.pathname.slice(0, -1) : address.pathname;
const chans = Array.isArray(config.server.channels)
    ? config.server.channels.map((c) => c.toLowerCase()) : [config.server.channels.toLowerCase()];
const socket = (0, socket_io_client_1.io)(address.origin, { path: `${pathname || ''}/socket.io`, autoConnect: false });
function needleOpts() {
    const opts = {
        headers: {
            Authorization: `Bearer ${config.server.token}`,
            'Content-Type': 'application/json; charset=utf-8',
        },
    };
    if (socket.id && opts.headers) {
        opts.headers['Socket-ID'] = socket.id;
    }
    else {
        (0, nodecg_1.get)().log.warn('[Server] Cannot send Socket-ID in headers (socket.id: %s)', socket.id);
    }
    return opts;
}
function generateUrlParams(params) {
    return Object.entries(params).reduce((prev, [key, val], i) => {
        if (typeof val === 'undefined') {
            return prev;
        }
        return `${prev}${i > 0 ? '&' : '?'}${key}=${val}`;
    }, '');
}
function getAuthorisedChannels() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield (0, needle_1.default)('get', `${address.origin}${pathname}/authorised_channels/channels${generateUrlParams({
            max: 200,
            invalid: false,
        })}`, needleOpts());
        if (resp.statusCode !== 200) {
            throw new Error(`status code ${resp.statusCode}: ${JSON.stringify(resp.body)}`);
        }
        return (_b = (_a = resp === null || resp === void 0 ? void 0 : resp.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
    });
}
function startCommercial(length, manual = false) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const serverChans = yield getAuthorisedChannels();
            const validChans = serverChans.filter((c) => chans.includes(c.name.toLowerCase()));
            if (!validChans.length)
                throw new Error('client error; no channels to run commercials on');
            const data = {
                channelIds: validChans.map((c) => c.id),
                length,
                manual,
            };
            const resp = yield (0, needle_1.default)('post', `${address.origin}${pathname}/commercials/start`, JSON.stringify(data), needleOpts());
            if (resp.statusCode !== 200) {
                throw new Error(`status code ${resp.statusCode}: ${JSON.stringify(resp.body)}`);
            }
            (0, nodecg_1.get)().log.debug('[Server] Started commercial');
            return resp;
        }
        catch (err) {
            (0, nodecg_1.get)().log.warn('[Server] Error starting commercial');
            (0, nodecg_1.get)().log.debug('[Server] Error starting commercial:', err);
            throw err;
        }
    });
}
// eslint-disable-next-line import/prefer-default-export
function setup() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!config.server.enabled)
            return;
        (0, nodecg_1.get)().log.info('[Server] Setting up');
        socket.on('connect', () => {
            socket.emit('authenticate', config.server.token);
            (0, nodecg_1.get)().log.info('[Server] Socket.IO client connected');
        });
        socket.on('authenticated', () => {
            (0, nodecg_1.get)().log.info('[Server] Socket.IO client authenticated');
        });
        socket.on('disconnect', (reason) => {
            (0, nodecg_1.get)().log.info('[Server] Socket.IO client disconnected');
            (0, nodecg_1.get)().log.debug('[Server] Socket.IO client disconnected:', reason);
        });
        socket.on('commercialLogged', (val) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield speedcontrol_1.sc.sendMessage('twitchStartCommercialTimer', { duration: val.length });
            }
            catch (err) { /* ignore */ }
        }));
        socket.connect();
        speedcontrol_1.sc.listenFor('twitchExternalCommercial', (data, ack) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { body } = yield startCommercial(data.duration, data.fromDashboard);
                if (!ack.handled) {
                    if (body) {
                        ack(null, { duration: body.length });
                    }
                    else {
                        ack(new Error('server error; no channels to run commercials on'));
                    }
                }
            }
            catch (err) {
                if (!ack.handled)
                    ack(err);
            }
        }));
    });
}
exports.setup = setup;
