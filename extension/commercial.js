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
const config = (0, nodecg_1.get)().bundleConfig;
const nonRunCommercialScenes = Array.isArray(config.obs.nonRunCommercialScenes)
    ? config.obs.nonRunCommercialScenes
    : [config.obs.nonRunCommercialScenes];
const sc = new speedcontrol_util_1.default((0, nodecg_1.get)());
let commercialInterval;
let intermissionCommercialCount = 0;
let intermissionCommercialTO = null;
/**
 * Will attempt to play a commercial at the points calculated on timer start.
 */
function checkForCommercial() {
    return __awaiter(this, void 0, void 0, function* () {
        const run = sc.getCurrentRun();
        // We shouldn't be running at all, but just in case and it's disabled, don't go further.
        if (replicants_1.disabled.value || !replicants_1.cycles.value || !(run === null || run === void 0 ? void 0 : run.estimateS)) {
            return;
        }
        const timerS = sc.timer.value.milliseconds / 1000;
        const nextCycle = replicants_1.cycles.value.frequency * (replicants_1.cycles.value.countIndex + 1);
        if (nextCycle < timerS) {
            replicants_1.cycles.value.countIndex += 1;
            if (replicants_1.toggle.value) {
                try {
                    yield sc.sendMessage('twitchStartCommercial', { duration: 180 });
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
    });
}
sc.on('timerStarted', () => {
    clearTimeout(commercialInterval);
    const run = sc.getCurrentRun();
    // Don't run any if no active run is available to check.
    if (!(run === null || run === void 0 ? void 0 : run.estimateS)) {
        return;
    }
    // Don't run any if the run is under 2 hours.
    if (run.estimateS < (2 * 60 * 60)) {
        (0, nodecg_1.get)().log.info('[Commercial] Will not run any as run is under 2 hours in length');
        return;
    }
    // Calculate frequency and count, and store this information.
    const count = Math.round(run.estimateS / (1 * 60 * 60)) - 1;
    const freq = Math.round(run.estimateS / (count + 1));
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
sc.on('timerStopped', () => {
    clearTimeout(commercialInterval);
    replicants_1.cycles.value = null;
    replicants_1.disabled.value = true;
});
sc.on('timerReset', () => {
    clearTimeout(commercialInterval);
    replicants_1.cycles.value = null;
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
                    (0, nodecg_1.get)().log.info('[Commercial] Will no longer check for non-run commercial scenes');
                }
                return;
            }
            if (replicants_1.toggle.value) {
                yield sc.sendMessage('twitchStartCommercial', {
                    duration: intermissionCommercialCount < 1 ? 300 : 30, // 5 minutes / 30 seconds
                });
                (0, nodecg_1.get)().log.info('[Commercial] Triggered due to non-run commercial scenes (count: %s)', intermissionCommercialCount + 1);
            }
        }
        catch (err) {
            (0, nodecg_1.get)().log.warn('[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s)', intermissionCommercialCount + 1);
            (0, nodecg_1.get)().log.debug('[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s):', intermissionCommercialCount + 1, err);
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
        (0, nodecg_1.get)().log.info('[Commercial] Will no longer check for non-run commercial scenes');
    }
}));
// If the timer has been recovered on start up,
// need to make sure the commercial checking is going to run.
if (sc.timer.value.state === 'running' && !replicants_1.disabled.value && replicants_1.cycles.value) {
    const run = sc.getCurrentRun();
    if (run && run.id !== replicants_1.cycles.value.runId) {
        replicants_1.cycles.value = null;
        replicants_1.disabled.value = true;
        // TODO: Do the usual setup as a new run is being tracked (rare/impossible to happen).
    }
    else if (run) {
        (0, nodecg_1.get)().log.info('[Commercial] Will run in '
            + `~${Math.round(replicants_1.cycles.value.frequency / 60)} minutes`);
        commercialInterval = setInterval(checkForCommercial, 1000);
    }
}
// Only used by esa-layouts so we can continue playing commercials once our video player
// ones have finished. Once the video player has finished, will continue the cycle after 3m10s.
// TODO: change to be smarter
(0, nodecg_1.get)().listenFor('videoPlayerFinished', 'esa-layouts', () => {
    if (!intermissionCommercialTO) {
        intermissionCommercialCount += 1;
        intermissionCommercialTO = setTimeout(playBreakCommercials, (3 * 60 * 1000) + (10 * 1000));
    }
});
(0, nodecg_1.get)().listenFor('disable', () => {
    if (!replicants_1.disabled.value) {
        (0, nodecg_1.get)().log.info('[Commercial] Will no longer run for the remainder of the run');
        clearTimeout(commercialInterval);
        replicants_1.cycles.value = null;
        replicants_1.disabled.value = true;
    }
});
