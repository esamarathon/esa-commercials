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
const speedcontrol_1 = require("@esa-commercials/util/speedcontrol");
const nodecg_1 = require("./util/nodecg");
const obs_1 = __importStar(require("./util/obs"));
const replicants_1 = require("./util/replicants");
const config = (0, nodecg_1.get)().bundleConfig;
const { minEstimate, commercialLength, targetDensity, endBuffer, intermissionCommercials } = config;
const nonRunCommercialScenes = (() => {
    const cfg = config.obs.nonRunCommercialScenes;
    return Array.isArray(cfg) ? cfg : [cfg];
})();
let commercialInterval;
let intermissionCommercialCount = 0;
let intermissionCommercialTO = null;
/**
 * Will attempt to play a commercial at the points calculated on timer start.
 */
function checkForCommercial() {
    return __awaiter(this, void 0, void 0, function* () {
        const run = speedcontrol_1.sc.getCurrentRun();
        // We shouldn't be running at all, but just in case and it's disabled, don't go further.
        if (replicants_1.disabled.value || !replicants_1.cycles.value || !(run === null || run === void 0 ? void 0 : run.estimateS)) {
            return;
        }
        const timerS = speedcontrol_1.sc.timer.value.milliseconds / 1000;
        const timeLeft = run.estimateS - timerS;
        // We have a safety buffer at the end, which shouldn't be needed in most cases but
        // is there for safety, so we know for sure a commercial cannot happen in the last
        // X seconds of a run.
        if (timeLeft < endBuffer) {
            (0, nodecg_1.get)().log.info('[Commercial] End buffer hit, '
                + 'no more will be run for the remainder of the run');
            clearTimeout(commercialInterval);
            replicants_1.cycles.value = null;
            replicants_1.disabled.value = true;
        }
        else {
            const nextCycle = replicants_1.cycles.value.frequency * (replicants_1.cycles.value.countIndex + 1);
            if (nextCycle < timerS) {
                replicants_1.cycles.value.countIndex += 1;
                if (replicants_1.toggle.value) {
                    try {
                        yield speedcontrol_1.sc.sendMessage('twitchStartCommercial', { duration: commercialLength });
                        (0, nodecg_1.get)().log.info('[Commercial] Triggered successfully');
                    }
                    catch (err) {
                        (0, nodecg_1.get)().log.warn('[Commercial] Could not successfully be triggered');
                        (0, nodecg_1.get)().log.debug('[Commercial] Could not successfully be triggered:', err);
                    }
                }
                if (replicants_1.cycles.value.countIndex < replicants_1.cycles.value.countTotal) {
                    (0, nodecg_1.get)().log.info('[Commercial] Will run again in '
                        + `~${Math.round(replicants_1.cycles.value.frequency / 60)} minutes`);
                }
                else {
                    (0, nodecg_1.get)().log.info('[Commercial] Cycles complete, '
                        + 'no more will be run for the remainder of the run');
                    clearTimeout(commercialInterval);
                    replicants_1.cycles.value = null;
                    replicants_1.disabled.value = true;
                }
            }
        }
    });
}
speedcontrol_1.sc.on('timerStarted', () => {
    clearTimeout(commercialInterval);
    const run = speedcontrol_1.sc.getCurrentRun();
    // Don't run any if no active run is available to check.
    if (!(run === null || run === void 0 ? void 0 : run.estimateS)) {
        return;
    }
    // Don't run any if the run is under minimum estimate setting.
    if (run.estimateS < minEstimate) {
        (0, nodecg_1.get)().log.info('[Commercial] Will not run any as run is under minimum estimate');
        return;
    }
    // Calculate frequency and count, and store this information.
    const count = Math.floor((((targetDensity / 60) * ((run.estimateS / 60) / 60)) - 1)
        / (commercialLength / 60));
    const freq = Math.round(((run.estimateS / 60) / (count + 1)) * 60);
    replicants_1.cycles.value = {
        runId: run.id,
        frequency: freq,
        countIndex: 0,
        countTotal: count,
    };
    replicants_1.disabled.value = false;
    (0, nodecg_1.get)().log.info(`[Commercial] Will run in ~${Math.round(freq / 60)} minutes`);
    commercialInterval = setInterval(checkForCommercial, 1000);
});
speedcontrol_1.sc.on('timerStopped', () => {
    clearTimeout(commercialInterval);
    replicants_1.cycles.value = null;
    replicants_1.disabled.value = true;
});
speedcontrol_1.sc.on('timerReset', () => {
    clearTimeout(commercialInterval);
    replicants_1.cycles.value = null;
    replicants_1.disabled.value = true;
});
/**
 * Once triggers, loops every X minutes until the loop is stopped elsewhere.
 */
function playBreakCommercials() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // If we're no longer on an appropriate scene, stop trying to play non-run commercials.
            const scene = yield obs_1.default.send('GetCurrentScene');
            const isSceneNonRun = !!nonRunCommercialScenes.find((s) => scene.name.startsWith(s));
            if (!isSceneNonRun) {
                if (intermissionCommercialTO) {
                    clearTimeout(intermissionCommercialTO);
                    intermissionCommercialTO = null;
                    intermissionCommercialCount = 0;
                    (0, nodecg_1.get)().log.info('[Commercial] Will no longer check for non-run commercial scenes');
                }
                return;
            }
            intermissionCommercialCount += 1;
            if (replicants_1.toggle.value && (0, obs_1.isStreaming)()) {
                const duration = (() => {
                    var _a;
                    switch (intermissionCommercialCount) {
                        case 1:
                            return intermissionCommercials.lengthFirst;
                        case 2:
                            return (_a = intermissionCommercials.lengthSecond) !== null && _a !== void 0 ? _a : intermissionCommercials.lengthOther;
                        default:
                            return intermissionCommercials.lengthOther;
                    }
                })();
                yield speedcontrol_1.sc.sendMessage('twitchStartCommercial', { duration });
                (0, nodecg_1.get)().log.info('[Commercial] Triggered due to non-run commercial scenes (count: %s)', intermissionCommercialCount);
            }
        }
        catch (err) {
            (0, nodecg_1.get)().log.warn('[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s)', intermissionCommercialCount);
            (0, nodecg_1.get)().log.debug('[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s):', intermissionCommercialCount, err);
        }
        const time = (() => {
            var _a;
            switch (intermissionCommercialCount) {
                case 1:
                    return intermissionCommercials.waitFirst;
                case 2:
                    return (_a = intermissionCommercials.waitSecond) !== null && _a !== void 0 ? _a : intermissionCommercials.waitOther;
                default:
                    return intermissionCommercials.waitOther;
            }
        })() * 1000;
        intermissionCommercialTO = setTimeout(playBreakCommercials, time);
    });
}
// Trigger a Twitch commercial when on the relevant scene.
obs_1.default.on('SwitchScenes', (data) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (data['scene-name'].startsWith(config.obs.nonRunCommercialTriggerScene)
        && !intermissionCommercialTO && !intermissionCommercials.specialLogic) {
        playBreakCommercials();
    }
    const isSceneNonRun = !!nonRunCommercialScenes.find((s) => data['scene-name'].startsWith(s));
    // Only used by esa-layouts so we can continue playing commercials once our intermission player
    // ones have finished. Once we've switched to a relevant scene, skips the first (and second)
    // one(s) and waits until the "other" loops should start.
    if (isSceneNonRun && !intermissionCommercialTO && intermissionCommercials.specialLogic) {
        intermissionCommercialCount += 2;
        intermissionCommercialTO = setTimeout(playBreakCommercials, (intermissionCommercials.waitFirst + ((_a = intermissionCommercials.waitSecond) !== null && _a !== void 0 ? _a : 0)) * 1000);
    }
    // Stop running intermission commercial checks if scene isn't one we expect for it.
    if (!isSceneNonRun && intermissionCommercialTO) {
        clearTimeout(intermissionCommercialTO);
        intermissionCommercialTO = null;
        intermissionCommercialCount = 0;
        (0, nodecg_1.get)().log.info('[Commercial] Will no longer check for non-run commercial scenes');
    }
}));
// If the timer has been recovered on start up,
// need to make sure the commercial checking is going to run.
if (speedcontrol_1.sc.timer.value.state === 'running' && !replicants_1.disabled.value && replicants_1.cycles.value) {
    const run = speedcontrol_1.sc.getCurrentRun();
    if (run && run.id !== replicants_1.cycles.value.runId) {
        replicants_1.cycles.value = null;
        replicants_1.disabled.value = true;
        // TODO: Do the usual setup as a new run is being tracked (rare/impossible to happen).
    }
    else if (run) {
        const timerS = speedcontrol_1.sc.timer.value.milliseconds / 1000;
        const nextCommercial = replicants_1.cycles.value.frequency - (timerS % replicants_1.cycles.value.frequency);
        (0, nodecg_1.get)().log.info('[Commercial] Will run in '
            + `~${Math.round(nextCommercial / 60)} minutes`);
        commercialInterval = setInterval(checkForCommercial, 1000);
    }
}
(0, nodecg_1.get)().listenFor('disable', () => {
    if (!replicants_1.disabled.value) {
        (0, nodecg_1.get)().log.info('[Commercial] Will no longer run for the remainder of the run');
        clearTimeout(commercialInterval);
        replicants_1.cycles.value = null;
        replicants_1.disabled.value = true;
    }
});
