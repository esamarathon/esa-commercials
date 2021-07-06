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
const speedcontrol_util_1 = __importDefault(require("speedcontrol-util"));
const nodecg_1 = require("./util/nodecg");
const obs_1 = __importDefault(require("./util/obs"));
const replicants_1 = require("./util/replicants");
const config = nodecg_1.get().bundleConfig;
const nonRunCommercialScenes = Array.isArray(config.obs.nonRunCommercialScenes)
    ? config.obs.nonRunCommercialScenes
    : [config.obs.nonRunCommercialScenes];
const sc = new speedcontrol_util_1.default(nodecg_1.get());
let nextCommercialStamp = 0;
let commercialInterval;
let intermissionCommercialCount = 0;
let intermissionCommercialTO = null;
/**
 * Cycle time can change depending on which stream and current timer.
 */
function getCycleTime() {
    if (sc.timer.value.milliseconds < (60 * 60 * 1000)) {
        return 60 * 60; // 1 hour
    }
    if (config.thisEvent === 2) {
        return 30 * 60; // 30 minutes
    }
    return 15 * 60; // 15 minutes
}
/**
 * Will attempt to play a commercial if >19 minutes is left for the run
 * and the estimate is higher than 60 minutes.
 */
function checkForCommercial() {
    return __awaiter(this, void 0, void 0, function* () {
        // We shouldn't be running at all, but just in case and it's disabled, don't go further.
        if (replicants_1.disabled.value) {
            return;
        }
        const run = sc.getCurrentRun();
        if (!(run === null || run === void 0 ? void 0 : run.estimateS)) {
            return;
        }
        if (nextCommercialStamp <= Date.now()) {
            const timeLeft = run.estimateS - (sc.timer.value.milliseconds / 1000);
            if (run.estimateS > (60 * 60) && timeLeft > (60 * 19)) {
                try {
                    if (replicants_1.toggle.value) {
                        yield sc.sendMessage('twitchStartCommercial', { duration: 60 });
                        nodecg_1.get().log.info('[Commercial] Triggered successfully');
                    }
                }
                catch (err) {
                    nodecg_1.get().log.warn('[Commercial] Could not successfully be triggered');
                    nodecg_1.get().log.debug('[Commercial] Could not successfully be triggered:', err);
                }
                nextCommercialStamp = Date.now() + (getCycleTime() * 1000);
                nodecg_1.get().log.info('[Commercial] Will check again'
                    + ` in ${Math.floor(getCycleTime() / 60)} minutes`);
            }
            else {
                nodecg_1.get().log.info('[Commercial] Does not need to be triggered,'
                    + ' will not check again for this run');
                clearTimeout(commercialInterval);
                replicants_1.disabled.value = true;
            }
        }
    });
}
sc.on('timerStarted', () => {
    // Start running normal run commercial checks.
    clearTimeout(commercialInterval);
    replicants_1.disabled.value = false;
    nextCommercialStamp = Date.now() + (getCycleTime() * 1000);
    nodecg_1.get().log.info('[Commercial] Will check if we can trigger in'
        + ` ${Math.floor(getCycleTime() / 60)} minutes`);
    commercialInterval = setInterval(checkForCommercial, 1000);
});
sc.on('timerStopped', () => {
    clearTimeout(commercialInterval);
    replicants_1.disabled.value = true;
});
sc.on('timerReset', () => {
    clearTimeout(commercialInterval);
    replicants_1.disabled.value = true;
});
/**
 * Once triggers, loops every 11m/8m10s until the loop is stopped elsewhere.
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
                    nodecg_1.get().log.info('[Commercial] Will no longer check for non-run commercial scenes');
                }
                return;
            }
            if (replicants_1.toggle.value) {
                yield sc.sendMessage('twitchStartCommercial', {
                    duration: intermissionCommercialCount < 1 ? 300 : 30, // 5 minutes / 30 seconds
                });
                nodecg_1.get().log.info('[Commercial] Triggered due to non-run commercial scenes (count: %s)', intermissionCommercialCount + 1);
            }
        }
        catch (err) {
            nodecg_1.get().log.warn('[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s)', intermissionCommercialCount + 1);
            nodecg_1.get().log.debug('[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s):', intermissionCommercialCount + 1, err);
        }
        intermissionCommercialCount += 1;
        const time = intermissionCommercialCount > 1
            ? (8 * 60 * 1000) + (10 * 1000)
            : (11 * 60 * 1000);
        intermissionCommercialTO = setTimeout(playBreakCommercials, time);
    });
}
// Trigger a Twitch commercial when on the relevant scene.
obs_1.default.on('SwitchScenes', (data) => __awaiter(void 0, void 0, void 0, function* () {
    if (data['scene-name'].startsWith(config.obs.nonRunCommercialTriggerScene)
        && !intermissionCommercialTO) {
        playBreakCommercials();
    }
    // Stop running intermission commercial checks if scene isn't one we expect for it.
    const isSceneNonRun = !!nonRunCommercialScenes.find((s) => data['scene-name'].startsWith(s));
    if (!isSceneNonRun && intermissionCommercialTO) {
        clearTimeout(intermissionCommercialTO);
        intermissionCommercialTO = null;
        intermissionCommercialCount = 0;
        nodecg_1.get().log.info('[Commercial] Will no longer check for non-run commercial scenes');
    }
}));
// If the timer has been recovered on start up,
// need to make sure the commercial checking is going to run.
if (sc.timer.value.state === 'running' && !replicants_1.disabled.value) {
    const run = sc.getCurrentRun();
    if (run) {
        const cycleTime = (sc.timer.value.milliseconds / 1000) % getCycleTime();
        const timeLeft = (getCycleTime() - cycleTime);
        nextCommercialStamp = Date.now() + (timeLeft * 1000);
        nodecg_1.get().log.info('[Commercial] Will check if we can trigger in'
            + ` ~${Math.round(timeLeft / 60)} minutes`);
        commercialInterval = setInterval(checkForCommercial, 1000);
    }
}
nodecg_1.get().listenFor('disable', () => {
    if (!replicants_1.disabled.value) {
        nodecg_1.get().log.info('[Commercial] Will no longer check for the remainder of the run');
        clearTimeout(commercialInterval);
        replicants_1.disabled.value = true;
    }
});
