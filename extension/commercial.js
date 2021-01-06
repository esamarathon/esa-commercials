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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var speedcontrol_util_1 = __importDefault(require("speedcontrol-util"));
var nodecg_1 = require("./util/nodecg");
var obs_1 = __importDefault(require("./util/obs"));
var config = nodecg_1.get().bundleConfig;
var sc = new speedcontrol_util_1.default(nodecg_1.get());
var commercialTO;
/**
 * Cycle time can change depending on which stream and current timer.
 */
function getCycleTime() {
    if (config.thisEvent === 2) {
        return 30 * 60;
    }
    return (sc.timer.value.milliseconds > (59 * 60 * 1000) ? 15 : 20) * 60;
}
/**
 * Will attempt to play a commercial if >19 minutes is left for the run
 * and the estimate is higher than 39 minutes.
 */
function playCommercial() {
    return __awaiter(this, void 0, void 0, function () {
        var run, timeLeft, cycleTime, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    run = sc.getCurrentRun();
                    if (!run) {
                        return [2 /*return*/];
                    }
                    timeLeft = run && run.estimateS
                        ? (run.estimateS + 60) - (sc.timer.value.milliseconds / 1000) : 0;
                    if (!(run.estimateS && run.estimateS > (60 * (40 - 1)) && timeLeft > (60 * 20))) return [3 /*break*/, 5];
                    cycleTime = getCycleTime();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, sc.sendMessage('twitchStartCommercial', { duration: 60 })];
                case 2:
                    _a.sent();
                    nodecg_1.get().log.info('[Commercial] Triggered successfully');
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    nodecg_1.get().log.warn('[Commercial] Could not successfully be triggered');
                    nodecg_1.get().log.debug('[Commercial] Could not successfully be triggered:', err_1);
                    return [3 /*break*/, 4];
                case 4:
                    commercialTO = setTimeout(playCommercial, 1000 * cycleTime);
                    nodecg_1.get().log.info('[Commercial] Will check again'
                        + (" in " + Math.floor(cycleTime / 60) + " minutes"));
                    return [3 /*break*/, 6];
                case 5:
                    nodecg_1.get().log.info('[Commercial] Does not need to be triggered,'
                        + ' will not check again for this run');
                    _a.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
sc.on('timerStarted', function () {
    clearTimeout(commercialTO);
    nodecg_1.get().log.info('[Commercial] Will check if we can trigger in'
        + (" " + Math.floor(getCycleTime() / 60) + " minutes"));
    commercialTO = setTimeout(playCommercial, 1000 * getCycleTime());
});
sc.on('timerStopped', function () {
    clearTimeout(commercialTO);
});
sc.on('timerReset', function () {
    clearTimeout(commercialTO);
});
// Trigger a Twitch commercial when on the relevant scene.
obs_1.default.on('SwitchScenes', function (data) { return __awaiter(void 0, void 0, void 0, function () {
    var err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!data['scene-name'].startsWith(config.obs.commercialScene)) return [3 /*break*/, 4];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sc.sendMessage('twitchStartCommercial', { duration: 180 })];
            case 2:
                _a.sent();
                nodecg_1.get().log.info('[Commercial] Triggered on change to relevant scene');
                return [3 /*break*/, 4];
            case 3:
                err_2 = _a.sent();
                nodecg_1.get().log.warn('[Commercial] Could not successfully be triggered');
                nodecg_1.get().log.debug('[Commercial] Could not successfully be triggered:', err_2);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// If the timer has been recovered on start up,
// need to make sure the commercial checking is going to run.
if (sc.timer.value.state === 'running') {
    var run = sc.getCurrentRun();
    if (run) {
        var cycleTime = (sc.timer.value.milliseconds / 1000) % getCycleTime();
        var timeLeft = (getCycleTime() - cycleTime);
        nodecg_1.get().log.info('[Commercial] Will check if we can trigger in'
            + (" ~" + Math.round(timeLeft / 60) + " minutes"));
        commercialTO = setTimeout(playCommercial, 1000 * timeLeft);
    }
}
