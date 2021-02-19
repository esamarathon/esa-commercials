import type { Configschema } from '@/types/schemas/configschema';
import { get as nodecg } from '@/util/nodecg';
import obs from '@/util/obs';
import SpeedcontrolUtil from 'speedcontrol-util';
import { disabled } from './util/replicants';

const config = (nodecg().bundleConfig as Configschema);
const sc = new SpeedcontrolUtil(nodecg());
let commercialTO: NodeJS.Timeout;
let intermissionCommercialCount = 0;
let intermissionCommercialTO: NodeJS.Timeout | null = null;

/**
 * Cycle time can change depending on which stream and current timer.
 */
function getCycleTime(): number {
  if (config.thisEvent === 2) {
    return 30 * 60;
  }
  return (sc.timer.value.milliseconds > (59 * 60 * 1000) ? 15 : 20) * 60;
}

/**
 * Will attempt to play a commercial if >19 minutes is left for the run
 * and the estimate is higher than 39 minutes.
 */
async function playCommercial(): Promise<void> {
  // We shouldn't be running at all, but just in case and it's disabled, don't go further.
  if (disabled.value) {
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
      await sc.sendMessage('twitchStartCommercial', { duration: 60 });
      nodecg().log.info('[Commercial] Triggered successfully');
    } catch (err) {
      nodecg().log.warn('[Commercial] Could not successfully be triggered');
      nodecg().log.debug('[Commercial] Could not successfully be triggered:', err);
    }
    commercialTO = setTimeout(playCommercial, 1000 * cycleTime);
    nodecg().log.info('[Commercial] Will check again'
      + ` in ${Math.floor(cycleTime / 60)} minutes`);
  } else {
    nodecg().log.info('[Commercial] Does not need to be triggered,'
      + ' will not check again for this run');
    disabled.value = true;
  }
}

sc.on('timerStarted', () => {
  // Stop running intermission commercial checks.
  if (intermissionCommercialTO) {
    clearTimeout(intermissionCommercialTO);
    intermissionCommercialTO = null;
    intermissionCommercialCount = 0;
    nodecg().log.info('[Commercial] Will no longer check for commercial scene');
  }

  // Start running normal run commercial checks.
  clearTimeout(commercialTO);
  disabled.value = false;
  nodecg().log.info('[Commercial] Will check if we can trigger in'
    + ` ${Math.floor(getCycleTime() / 60)} minutes`);
  commercialTO = setTimeout(playCommercial, 1000 * getCycleTime());
});

sc.on('timerStopped', () => {
  clearTimeout(commercialTO);
  disabled.value = true;
});

sc.on('timerReset', () => {
  clearTimeout(commercialTO);
  disabled.value = true;
});

/**
 * Once triggers, loops every 11m/8m10s until the loop is stopped elsewhere.
 */
async function playBreakCommercials(): Promise<void> {
  try {
    await sc.sendMessage('twitchStartCommercial', {
      duration: intermissionCommercialCount < 1 ? 180 : 60,
    });
    nodecg().log.info(
      '[Commercial] Triggered due to commercial scene (count: %s)',
      intermissionCommercialCount + 1,
    );
  } catch (err) {
    nodecg().log.warn(
      '[Commercial] Could not successfully be triggered for commercial scene (count: %s)',
      intermissionCommercialCount + 1,
    );
    nodecg().log.debug(
      '[Commercial] Could not successfully be triggered for commercial scene (count: %s):',
      intermissionCommercialCount + 1, err,
    );
  }
  intermissionCommercialCount += 1;
  const time = intermissionCommercialCount > 1 ? (8 * 60 * 1000) + (10 * 1000) : (11 * 60 * 1000);
  intermissionCommercialTO = setTimeout(playBreakCommercials, time);
}

// Trigger a Twitch commercial when on the relevant scene.
obs.on('SwitchScenes', async (data) => {
  if (data['scene-name'].startsWith(config.obs.commercialScene) && !intermissionCommercialTO) {
    playBreakCommercials();
  }
});

// If the timer has been recovered on start up,
// need to make sure the commercial checking is going to run.
if (sc.timer.value.state === 'running' && !disabled.value) {
  const run = sc.getCurrentRun();
  if (run) {
    const cycleTime = (sc.timer.value.milliseconds / 1000) % getCycleTime();
    const timeLeft = (getCycleTime() - cycleTime);
    nodecg().log.info('[Commercial] Will check if we can trigger in'
      + ` ~${Math.round(timeLeft / 60)} minutes`);
    commercialTO = setTimeout(playCommercial, 1000 * timeLeft);
  }
}

nodecg().listenFor('disable', () => {
  if (!disabled.value) {
    disabled.value = true;
    clearTimeout(commercialTO);
    nodecg().log.info('[Commercial] Will no longer check for the remainder of the run');
  }
});
