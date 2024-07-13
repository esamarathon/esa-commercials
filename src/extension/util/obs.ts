import OBSWebSocket, { EventSubscription, OBSWebSocketError } from 'obs-websocket-js';
import { get as nodecg } from './nodecg';

const config = nodecg().bundleConfig.obs;

const obs = new OBSWebSocket();
let obsStreaming = false;

async function connect(): Promise<void> {
  try {
    const {
      obsWebSocketVersion,
      rpcVersion,
    } = await obs.connect(
      config.address,
      config.password,
      {
        // eslint-disable-next-line no-bitwise
        eventSubscriptions: EventSubscription.MediaInputs | EventSubscription.Transitions,
      },
    );
    nodecg().log.debug(
      '[OBS] Connected (version: %s, RPC: %s)',
      obsWebSocketVersion,
      rpcVersion,
    );
    const data = await obs.call('GetStreamStatus');
    obsStreaming = data.outputActive;
  } catch (err) {
    try {
      await obs.disconnect();
    } catch { /* ignore errors */ }
    nodecg().log.warn(
      '[OBS] Connection error (reason: %s - %s)',
      (err as OBSWebSocketError).code ?? 'N/A',
      (err as OBSWebSocketError).message || 'N/A',
    );
  }
}

if (config.enabled) {
  nodecg().log.info('[OBS] Setting up connection');
  connect().catch(() => {});
  obs.on('StreamStateChanged', (data) => { obsStreaming = data.outputActive; });
  obs.on('ConnectionClosed', (data) => {
    nodecg().log.warn(
      '[OBS] Connection closed (reason: %s - %s)',
      data.code ?? 'N/A',
      data.message || 'N/A',
    );
    setTimeout(connect, 5000);
  });
}

obs.on('ConnectionError', (err) => {
  nodecg().log.warn('[OBS] Connection error (reason: %s - %s):', err.code, err.message);
});

export function isStreaming(): boolean {
  return obsStreaming;
}

export default obs;
