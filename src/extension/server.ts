import { Configschema } from '@esa-commercials/types/schemas';
import { get as nodecg } from '@esa-commercials/util/nodecg';
import needle, { NeedleOptions, NeedleResponse } from 'needle';
import { io, Socket } from 'socket.io-client';
import type { DeepWritable } from 'ts-essentials';
import { twitchChannelInfo } from './util/replicants';
import { sc } from './util/speedcontrol';

const config = nodecg().bundleConfig;
const address = new URL(
  config.server.address !== 'ADDRESS'
    ? config.server.address
    : 'http://localhost:2345',
);
const pathname = address.pathname.endsWith('/')
  ? address.pathname.slice(0, -1) : address.pathname;
const chans = (() => {
  const cfg = (config as DeepWritable<Configschema>).server.channels;
  return Array.isArray(cfg) ? cfg.map((c) => c.toLowerCase()) : [cfg.toLowerCase()];
})();
const socket: typeof Socket = io(
  address.origin,
  { path: `${pathname || ''}/socket.io`, autoConnect: false },
);

function needleOpts(): NeedleOptions {
  const opts: NeedleOptions = {
    headers: {
      Authorization: `Bearer ${config.server.token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  };
  if (socket.id && opts.headers) {
    opts.headers['Socket-ID'] = socket.id;
  } else {
    nodecg().log.warn('[Server] Cannot send Socket-ID in headers (socket.id: %s)', socket.id);
  }
  return opts;
}

function generateUrlParams(params: { [k: string]: unknown }): string {
  return Object.entries(params).reduce((prev, [key, val], i) => {
    if (typeof val === 'undefined') {
      return prev;
    }
    return `${prev}${i > 0 ? '&' : '?'}${key}=${val}`;
  }, '');
}

async function getAuthorisedChannels(): Promise<{
  creationTimestamp: string;
  updatedTimestamp: string;
  id: string;
  name: string;
  commercials: boolean;
  markers: boolean;
  invalid: boolean;
}[]> {
  const resp = await needle(
    'get',
    `${address.origin}${pathname}/authorised_channels/channels${generateUrlParams({
      max: 200, // TODO: Get all if needed? (Very unlikely to ever be needed.)
      invalid: false,
    })}`,
    needleOpts(),
  );
  if (resp.statusCode !== 200) {
    throw new Error(`status code ${resp.statusCode}: ${JSON.stringify(resp.body)}`);
  }
  return resp?.body?.data ?? [];
}

async function startCommercial(length: number, manual = false): Promise<NeedleResponse> {
  try {
    const serverChans = await getAuthorisedChannels();
    const validChans = serverChans.filter((c) => chans.includes(c.name.toLowerCase()));
    if (!validChans.length) throw new Error('client error; no channels to run commercials on');
    const data: {
      channelIds?: string[];
      length: number;
      manual?: boolean;
    } = {
      channelIds: validChans.map((c) => c.id),
      length,
      manual,
    };
    const resp = await needle(
      'post',
      `${address.origin}${pathname}/commercials/start`,
      JSON.stringify(data),
      needleOpts(),
    );
    if (resp.statusCode !== 200) {
      throw new Error(`status code ${resp.statusCode}: ${JSON.stringify(resp.body)}`);
    }
    nodecg().log.debug('[Server] Started commercial');
    return resp;
  } catch (err) {
    nodecg().log.warn('[Server] Error starting commercial');
    nodecg().log.debug('[Server] Error starting commercial:', err);
    throw err;
  }
}

async function changeTwitchMetadata(title?: string, gameId?: string): Promise<void> {
  try {
    const t = title || (twitchChannelInfo.value.title as string | undefined);
    const gID = gameId || (twitchChannelInfo.value.game_id as string | undefined);
    nodecg().log.debug('[Server] Decided Twitch title is: %s - Decided game ID is %s', t, gID);
    const serverChans = await getAuthorisedChannels();
    const validChans = serverChans.filter((c) => chans.includes(c.name.toLowerCase()));
    if (!validChans.length) throw new Error('client error; no channels to change metadata of');
    const data: {
      channelIds: string[];
      title: string;
      dir: string;
    } = {
      channelIds: validChans.map((c) => c.id),
      title: t?.slice(0, 140) || '',
      dir: gID || '',
    };
    const resp = await needle(
      'post',
      `${address.origin}${pathname}/twitch_metadata/change`,
      JSON.stringify(data),
      needleOpts(),
    );
    if (resp.statusCode !== 200) {
      throw new Error(`status code ${resp.statusCode}: ${JSON.stringify(resp.body)}`);
    }
    // Update the data with what we've got.
    twitchChannelInfo.value.title = t?.slice(0, 140) || '';
    twitchChannelInfo.value.game_id = gID || '';
    // twitchChannelInfo.value.game_name = dir?.name || '';
    nodecg().log.debug('[Server] Twitch title/game updated');
  } catch (err) {
    nodecg().log.warn('[Server] Error updating Twitch channel information');
    nodecg().log.debug('[Server] Error updating Twitch channel information:', err);
  }
}

// eslint-disable-next-line import/prefer-default-export
export async function setup(): Promise<void> {
  if (!config.server.enabled) return;
  nodecg().log.info('[Server] Setting up');

  socket.on('connect', () => {
    socket.emit('authenticate', config.server.token);
    nodecg().log.info('[Server] Socket.IO client connected');
  });
  socket.on('authenticated', () => {
    nodecg().log.info('[Server] Socket.IO client authenticated');
  });
  socket.on('disconnect', (reason: string) => {
    nodecg().log.info('[Server] Socket.IO client disconnected');
    nodecg().log.debug('[Server] Socket.IO client disconnected:', reason);
  });

  socket.on('commercialLogged', async (val: {
    id: number;
    channelIds: string[];
    eventId: number | null;
    timestamp: string;
    length: number;
    manual: boolean;
  }) => {
    try {
      // Check against ID if this commercial is applicable to this channel or not.
      const serverChanIds = (await getAuthorisedChannels())
        .filter((c) => chans.includes(c.name.toLowerCase())).map((c) => c.id);
      if (val.channelIds.filter((c) => serverChanIds.includes(c)).length) {
        await sc.sendMessage('twitchStartCommercialTimer', { duration: val.length });
      }
    } catch (err) { /* ignore */ }
  });

  socket.connect();

  sc.listenFor('twitchExternalCommercial', async (data, ack) => {
    try {
      const { body }: { body: {
        id: number;
        channelIds: string[];
        eventId: number | null;
        timestamp: string;
        length: number;
        manual: boolean;
      } | null } = await startCommercial(data.duration, data.fromDashboard);
      if (!ack.handled) {
        if (body) {
          ack(null, { duration: body.length });
        } else {
          ack(new Error('server error; no channels to run commercials on'));
        }
      }
    } catch (err) {
      if (!ack.handled) ack(err as Error);
    }
  });

  if (config.server.updateMetadata) {
    if (config.server.updateMetadataAltMode) {
      // Used to change the Twitch title/category when requested by any bundle targetting us.
      nodecg().listenFor(
        'twitchExternalMetadataAltMode',
        async ({ title, gameID }: {
          channelID?: string,
          title?: string,
          gameID: string,
        }) => {
          nodecg().log.debug(
            '[Server] Message received to change title/game, will attempt (title: %s, game id: %s)',
            title,
            gameID,
          );
          await changeTwitchMetadata(title, gameID);
        },
      );
    } else {
      // Used to change the Twitch title/category when requested by nodecg-speedcontrol.
      nodecg().listenFor(
        'twitchExternalMetadata',
        'nodecg-speedcontrol',
        async ({ title, gameID }: {
          channelID?: string,
          title?: string,
          gameID: string,
        }) => {
          nodecg().log.debug(
            '[Server] Message received to change title/game, will attempt (title: %s, game id: %s)',
            title,
            gameID,
          );
          await changeTwitchMetadata(title, gameID);
        },
      );
    }
  }
}
