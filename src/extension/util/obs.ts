import type { Configschema } from '@esa-commercials/types/schemas/configschema';
import OBSWebSocketJS from 'obs-websocket-js';
import { get as nodecg } from './nodecg';

const config = (nodecg().bundleConfig as Configschema).obs;

const obs = new OBSWebSocketJS();
export let obsStreaming = false;
const settings = {
  address: config.address,
  password: config.password,
};

async function connect(): Promise<void> {
  try {
    await obs.connect(settings);
    const streamingStatus = await obs.send('GetStreamingStatus');
    obsStreaming = streamingStatus.streaming;
    nodecg().log.info('[OBS] Connection successful');
  } catch (err) {
    nodecg().log.warn('[OBS] Connection error');
    nodecg().log.debug('[OBS] Connection error:', err);
  }
}

if (config.enabled) {
  nodecg().log.info('[OBS] Setting up connection');
  connect();
  obs.on('StreamStarted', () => { obsStreaming = true; });
  obs.on('StreamStopped', () => { obsStreaming = false; });
  obs.on('ConnectionClosed', () => {
    nodecg().log.warn('[OBS] Connection lost, retrying in 5 seconds');
    setTimeout(connect, 5000);
  });
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Pretty sure this emits an error.
obs.on('error', (err) => {
  nodecg().log.warn('[OBS] Connection error');
  nodecg().log.debug('[OBS] Connection error:', err);
});

export default obs;
