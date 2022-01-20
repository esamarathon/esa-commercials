import { Configschema } from '@esa-commercials/types/schemas';
import { get as nodecg } from '@esa-commercials/util/nodecg';
import needle, { NeedleOptions, NeedleResponse } from 'needle';
import { io, Socket } from 'socket.io-client';
import { sc } from './util/speedcontrol';

const config = (nodecg().bundleConfig as Configschema);
const address = new URL(
  config.server.address !== 'ADDRESS'
    ? config.server.address
    : 'http://localhost:2345',
);
const pathname = address.pathname.endsWith('/')
  ? address.pathname.slice(0, -1) : address.pathname;
const chans = Array.isArray(config.server.channels)
  ? config.server.channels.map((c) => c.toLowerCase()) : [config.server.channels.toLowerCase()];
const socket: typeof Socket = io(
  address.origin,
  { path: `${pathname || ''}/socket.io`, autoConnect: false },
);

function needleOpts(includeSocketId = true): NeedleOptions {
  const opts: NeedleOptions = {
    headers: {
      Authorization: `Bearer ${config.server.token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  };
  if (includeSocketId && socket.id && opts.headers) {
    opts.headers['Socket-ID'] = socket.id;
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

  socket.on('commercialLogged', (val: {
    id: number;
    channelIds: string[];
    eventId: number | null;
    timestamp: string;
    length: number;
    manual: boolean;
  }) => {
    try {
      sc.sendMessage('twitchStartCommercialTimer', { duration: val.length });
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
}
