import type { Configschema } from '@esa-commercials/types/schemas';
import SpeedcontrolUtil from 'speedcontrol-util';
import { get as nodecg } from './util/nodecg';
import obs from './util/obs';
import { disabled, toggle } from './util/replicants';

const config = (nodecg().bundleConfig as Configschema);
const nonRunCommercialScenes = Array.isArray(config.obs.nonRunCommercialScenes)
  ? config.obs.nonRunCommercialScenes
  : [config.obs.nonRunCommercialScenes];
const sc = new SpeedcontrolUtil(nodecg());
let nextCommercialStamp = 0;
let commercialInterval: NodeJS.Timeout;
let intermissionCommercialCount = 0;
let intermissionCommercialTO: NodeJS.Timeout | null = null;

/**
 * Cycle time can change depending on which stream and current timer.
 */
function getCycleTime(): number {
  if (sc.timer.value.milliseconds < (60 * 60 * 1000)) {
    return 60 * 60; // 1 hour
  }
  if (config.thisEvent === 2) {
    return 30 * 60; // 30 minutes
  }
  return 15 * 60; // 15 minutes
}

/**
 * Will attempt to play a commercial if >20 minutes is left for the run
 * and the estimate is higher than 60 minutes.
 */
async function checkForCommercial(): Promise<void> {
  // We shouldn't be running at all, but just in case and it's disabled, don't go further.
  if (disabled.value) {
    return;
  }
  const run = sc.getCurrentRun();
  if (!run?.estimateS) {
    return;
  }
  if (nextCommercialStamp <= Date.now()) {
    const timeLeft = run.estimateS - (sc.timer.value.milliseconds / 1000);
    if (run.estimateS > (60 * 60) && timeLeft > (60 * 20)) {
      try {
        if (toggle.value) {
          await sc.sendMessage('twitchStartCommercial', { duration: 60 });
          nodecg().log.info('[Commercial] Triggered successfully');
        }
      } catch (err) {
        nodecg().log.warn('[Commercial] Could not successfully be triggered');
        nodecg().log.debug('[Commercial] Could not successfully be triggered:', err);
      }
      nextCommercialStamp = Date.now() + (getCycleTime() * 1000);
      nodecg().log.info('[Commercial] Will check again'
        + ` in ${Math.floor(getCycleTime() / 60)} minutes`);
    } else {
      nodecg().log.info('[Commercial] Does not need to be triggered,'
        + ' will not check again for this run');
      clearTimeout(commercialInterval);
      disabled.value = true;
    }
  }
}

sc.on('timerStarted', () => {
  // Start running normal run commercial checks.
  clearTimeout(commercialInterval);
  disabled.value = false;
  nextCommercialStamp = Date.now() + (getCycleTime() * 1000);
  nodecg().log.info('[Commercial] Will check if we can trigger in'
    + ` ${Math.floor(getCycleTime() / 60)} minutes`);
  commercialInterval = setInterval(checkForCommercial, 1000);
});

sc.on('timerStopped', () => {
  clearTimeout(commercialInterval);
  disabled.value = true;
});

sc.on('timerReset', () => {
  clearTimeout(commercialInterval);
  disabled.value = true;
});

/**
 * Once triggers, loops every 11m/8m10s until the loop is stopped elsewhere.
 */
async function playBreakCommercials(): Promise<void> {
  try {
    // If we're no longer on an appropriate scene, stop trying to play non-run commercials.
    const scene = await obs.send('GetCurrentScene');
    const isSceneNonRun = !!nonRunCommercialScenes.find((s) => scene.name.startsWith(s));
    if (!isSceneNonRun) {
      if (intermissionCommercialTO) {
        clearTimeout(intermissionCommercialTO);
        intermissionCommercialTO = null;
        intermissionCommercialCount = 0;
        nodecg().log.info('[Commercial] Will no longer check for non-run commercial scenes');
      }
      return;
    }
    if (toggle.value) {
      await sc.sendMessage('twitchStartCommercial', {
        duration: intermissionCommercialCount < 1 ? 180 : 30, // TODO: change 180 (3m) to 300 (5m)
      });
      nodecg().log.info(
        '[Commercial] Triggered due to non-run commercial scenes (count: %s)',
        intermissionCommercialCount + 1,
      );
    }
  } catch (err) {
    nodecg().log.warn(
      '[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s)',
      intermissionCommercialCount + 1,
    );
    nodecg().log.debug(
      '[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s):',
      intermissionCommercialCount + 1, err,
    );
  }
  intermissionCommercialCount += 1;
  const time = intermissionCommercialCount > 1
    ? (8 * 60 * 1000) + (10 * 1000)
    : (11 * 60 * 1000);
  intermissionCommercialTO = setTimeout(playBreakCommercials, time);
}

// Trigger a Twitch commercial when on the relevant scene.
obs.on('SwitchScenes', async (data) => {
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
    nodecg().log.info('[Commercial] Will no longer check for non-run commercial scenes');
  }
});

// If the timer has been recovered on start up,
// need to make sure the commercial checking is going to run.
if (sc.timer.value.state === 'running' && !disabled.value) {
  const run = sc.getCurrentRun();
  if (run) {
    const cycleTime = (sc.timer.value.milliseconds / 1000) % getCycleTime();
    const timeLeft = (getCycleTime() - cycleTime);
    nextCommercialStamp = Date.now() + (timeLeft * 1000);
    nodecg().log.info('[Commercial] Will check if we can trigger in'
      + ` ~${Math.round(timeLeft / 60)} minutes`);
    commercialInterval = setInterval(checkForCommercial, 1000);
  }
}

nodecg().listenFor('disable', () => {
  if (!disabled.value) {
    nodecg().log.info('[Commercial] Will no longer check for the remainder of the run');
    clearTimeout(commercialInterval);
    disabled.value = true;
  }
});
