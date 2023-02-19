import { Configschema } from '@esa-commercials/types/schemas';
import { sc } from '@esa-commercials/util/speedcontrol';
import type { DeepWritable } from 'ts-essentials';
import { get as nodecg } from './util/nodecg';
import obs, { isStreaming } from './util/obs';
import { cycles, disabled, toggle } from './util/replicants';

const config = nodecg().bundleConfig;
const { minEstimate, commercialLength, targetDensity, endBuffer, intermissionCommercials } = config;
const nonRunCommercialScenes = (() => {
  const cfg = (config as DeepWritable<Configschema>).obs.nonRunCommercialScenes;
  return Array.isArray(cfg) ? cfg : [cfg];
})();
let commercialInterval: NodeJS.Timeout;
let intermissionCommercialCount = 0;
let intermissionCommercialTO: NodeJS.Timeout | null = null;

/**
 * Will attempt to play a commercial at the points calculated on timer start.
 */
async function checkForCommercial(): Promise<void> {
  const run = sc.getCurrentRun();

  // We shouldn't be running at all, but just in case and it's disabled, don't go further.
  if (disabled.value || !cycles.value || !run?.estimateS) {
    return;
  }
  const timerS = sc.timer.value.milliseconds / 1000;
  const timeLeft = run.estimateS - timerS;
  // We have a safety buffer at the end, which shouldn't be needed in most cases but
  // is there for safety, so we know for sure a commercial cannot happen in the last
  // X seconds of a run.
  if (timeLeft < endBuffer) {
    nodecg().log.info('[Commercial] End buffer hit, '
      + 'no more will be run for the remainder of the run');
    clearTimeout(commercialInterval);
    cycles.value = null;
    disabled.value = true;
  } else {
    const nextCycle = cycles.value.frequency * (cycles.value.countIndex + 1);
    if (nextCycle < timerS) {
      cycles.value.countIndex += 1;
      if (toggle.value) {
        try {
          await sc.sendMessage('twitchStartCommercial', { duration: commercialLength });
          nodecg().log.info('[Commercial] Triggered successfully');
        } catch (err) {
          nodecg().log.warn('[Commercial] Could not successfully be triggered');
          nodecg().log.debug('[Commercial] Could not successfully be triggered:', err);
        }
      }
      if (cycles.value.countIndex < cycles.value.countTotal) {
        nodecg().log.info('[Commercial] Will run again in '
        + `~${Math.round(cycles.value.frequency / 60)} minutes`);
      } else {
        nodecg().log.info('[Commercial] Cycles complete, '
          + 'no more will be run for the remainder of the run');
        clearTimeout(commercialInterval);
        cycles.value = null;
        disabled.value = true;
      }
    }
  }
}

sc.on('timerStarted', () => {
  clearTimeout(commercialInterval);
  const run = sc.getCurrentRun();

  // Don't run any if no active run is available to check.
  if (!run?.estimateS) {
    return;
  }
  // Don't run any if the run is under minimum estimate setting.
  if (run.estimateS < minEstimate) {
    nodecg().log.info('[Commercial] Will not run any as run is under minimum estimate');
    return;
  }
  // Calculate frequency and count, and store this information.
  const count = Math.floor(((targetDensity * (run.estimateS / 60) - 1) / minEstimate));
  const freq = Math.round(run.estimateS / (count + 1));
  cycles.value = {
    runId: run.id,
    frequency: freq,
    countIndex: 0,
    countTotal: count,
  };

  disabled.value = false;
  nodecg().log.info(`[Commercial] Will run in ~${Math.round(freq / 60)} minutes`);
  commercialInterval = setInterval(checkForCommercial, 1000);
});

sc.on('timerStopped', () => {
  clearTimeout(commercialInterval);
  cycles.value = null;
  disabled.value = true;
});

sc.on('timerReset', () => {
  clearTimeout(commercialInterval);
  cycles.value = null;
  disabled.value = true;
});

/**
 * Once triggers, loops every X minutes until the loop is stopped elsewhere.
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
    intermissionCommercialCount += 1;
    if (toggle.value && isStreaming()) {
      const duration = (() => {
        switch (intermissionCommercialCount) {
          case 1:
            return intermissionCommercials.lengthFirst;
          case 2:
            return intermissionCommercials.lengthSecond ?? intermissionCommercials.lengthOther;
          default:
            return intermissionCommercials.lengthOther;
        }
      })();
      await sc.sendMessage('twitchStartCommercial', { duration });
      nodecg().log.info(
        '[Commercial] Triggered due to non-run commercial scenes (count: %s)',
        intermissionCommercialCount,
      );
    }
  } catch (err) {
    nodecg().log.warn(
      '[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s)',
      intermissionCommercialCount,
    );
    nodecg().log.debug(
      '[Commercial] Could not successfully be triggered for non-run commercial scenes (count: %s):',
      intermissionCommercialCount,
      err,
    );
  }
  const time = (() => {
    switch (intermissionCommercialCount) {
      case 1:
        return intermissionCommercials.waitFirst;
      case 2:
        return intermissionCommercials.waitSecond ?? intermissionCommercials.waitOther;
      default:
        return intermissionCommercials.waitOther;
    }
  })() * 1000;
  intermissionCommercialTO = setTimeout(playBreakCommercials, time);
}

// Trigger a Twitch commercial when on the relevant scene.
obs.on('SwitchScenes', async (data) => {
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
    intermissionCommercialTO = setTimeout(
      playBreakCommercials,
      (intermissionCommercials.waitFirst + (intermissionCommercials.waitSecond ?? 0)) * 1000,
    );
  }

  // Stop running intermission commercial checks if scene isn't one we expect for it.
  if (!isSceneNonRun && intermissionCommercialTO) {
    clearTimeout(intermissionCommercialTO);
    intermissionCommercialTO = null;
    intermissionCommercialCount = 0;
    nodecg().log.info('[Commercial] Will no longer check for non-run commercial scenes');
  }
});

// If the timer has been recovered on start up,
// need to make sure the commercial checking is going to run.
if (sc.timer.value.state === 'running' && !disabled.value && cycles.value) {
  const run = sc.getCurrentRun();
  if (run && run.id !== cycles.value.runId) {
    cycles.value = null;
    disabled.value = true;
    // TODO: Do the usual setup as a new run is being tracked (rare/impossible to happen).
  } else if (run) {
    nodecg().log.info('[Commercial] Will run in '
      + `~${Math.round(cycles.value.frequency / 60)} minutes`);
    commercialInterval = setInterval(checkForCommercial, 1000);
  }
}

nodecg().listenFor('disable', () => {
  if (!disabled.value) {
    nodecg().log.info('[Commercial] Will no longer run for the remainder of the run');
    clearTimeout(commercialInterval);
    cycles.value = null;
    disabled.value = true;
  }
});
