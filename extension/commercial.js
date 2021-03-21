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
const nodecg_1 = require("@/util/nodecg");
const obs_1 = __importDefault(require("@/util/obs"));
const speedcontrol_util_1 = __importDefault(require("speedcontrol-util"));
const replicants_1 = require("./util/replicants");
const config = nodecg_1.get().bundleConfig;
const nonRunCommercialScenes = Array.isArray(config.obs.nonRunCommercialScenes)
    ? config.obs.nonRunCommercialScenes
    : [config.obs.nonRunCommercialScenes];
const sc = new speedcontrol_util_1.default(nodecg_1.get());
let commercialTO;
let intermissionCommercialCount = 0;
let intermissionCommercialTO = null;
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
    return __awaiter(this, void 0, void 0, function* () {
        // We shouldn't be running at all, but just in case and it's disabled, don't go further.
        if (replicants_1.disabled.value) {
            return;
        }
        const run = sc.getCurrentRun();
        if (!run) {
            return;
        }
        const timeLeft = run && run.estimateS
            ? (run.estimateS + 60) - (sc.timer.value.milliseconds / 1000) : 0;
        if (run.estimateS && run.estimateS > (60 * (40 - 1)) && timeLeft > (60 * 20)) {
            const cycleTime = getCycleTime();
            try {
                yield sc.sendMessage('twitchStartCommercial', { duration: 60 });
                nodecg_1.get().log.info('[Commercial] Triggered successfully');
            }
            catch (err) {
                nodecg_1.get().log.warn('[Commercial] Could not successfully be triggered');
                nodecg_1.get().log.debug('[Commercial] Could not successfully be triggered:', err);
            }
            commercialTO = setTimeout(playCommercial, 1000 * cycleTime);
            nodecg_1.get().log.info('[Commercial] Will check again'
                + ` in ${Math.floor(cycleTime / 60)} minutes`);
        }
        else {
            nodecg_1.get().log.info('[Commercial] Does not need to be triggered,'
                + ' will not check again for this run');
            replicants_1.disabled.value = true;
        }
    });
}
sc.on('timerStarted', () => {
    // Start running normal run commercial checks.
    clearTimeout(commercialTO);
    replicants_1.disabled.value = false;
    nodecg_1.get().log.info('[Commercial] Will check if we can trigger in'
        + ` ${Math.floor(getCycleTime() / 60)} minutes`);
    commercialTO = setTimeout(playCommercial, 1000 * getCycleTime());
});
sc.on('timerStopped', () => {
    clearTimeout(commercialTO);
    replicants_1.disabled.value = true;
});
sc.on('timerReset', () => {
    clearTimeout(commercialTO);
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
            yield sc.sendMessage('twitchStartCommercial', {
                duration: intermissionCommercialCount < 1 ? 180 : 30,
            });
            nodecg_1.get().log.info('[Commercial] Triggered due to non-run commercial scenes (count: %s)', intermissionCommercialCount + 1);
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
        nodecg_1.get().log.info('[Commercial] Will check if we can trigger in'
            + ` ~${Math.round(timeLeft / 60)} minutes`);
        commercialTO = setTimeout(playCommercial, 1000 * timeLeft);
    }
}
nodecg_1.get().listenFor('disable', () => {
    if (!replicants_1.disabled.value) {
        replicants_1.disabled.value = true;
        clearTimeout(commercialTO);
        nodecg_1.get().log.info('[Commercial] Will no longer check for the remainder of the run');
    }
});
