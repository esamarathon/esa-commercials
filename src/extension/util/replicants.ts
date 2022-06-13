/* eslint-disable max-len */

import { Cycles, Disabled, Toggle } from '@esa-commercials/types/schemas';
import { TwitchChannelInfo } from 'speedcontrol-util/types/speedcontrol/schemas';
import { get as nodecg } from './nodecg';

/**
 * This is where you can declare all your replicant to import easily into other files,
 * and to make sure they have any correct settings on startup.
 */

export const cycles = nodecg().Replicant<Cycles>('cycles');
export const disabled = nodecg().Replicant<Disabled>('disabled');
export const toggle = nodecg().Replicant<Toggle>('toggle');
export const twitchChannelInfo = nodecg().Replicant<TwitchChannelInfo>('twitchChannelInfo', 'nodecg-speedcontrol');
