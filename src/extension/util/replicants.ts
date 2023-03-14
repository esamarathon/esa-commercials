/* eslint-disable max-len */

import type NodeCG from '@alvancamp/test-nodecg-types';
import { Cycles, Disabled, Toggle } from '@esa-commercials/types/schemas';
import { TwitchChannelInfo } from 'speedcontrol-util/types/schemas';
import { get as nodecg } from './nodecg';

/**
 * This is where you can declare all your replicant to import easily into other files,
 * and to make sure they have any correct settings on startup.
 */

export const cycles = nodecg().Replicant<Cycles>('cycles') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Cycles>;
export const disabled = nodecg().Replicant<Disabled>('disabled') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Disabled>;
export const toggle = nodecg().Replicant<Toggle>('toggle') as unknown as NodeCG.ServerReplicantWithSchemaDefault<Toggle>;
export const twitchChannelInfo = nodecg().Replicant<TwitchChannelInfo>('twitchChannelInfo', 'nodecg-speedcontrol') as unknown as NodeCG.ServerReplicant<TwitchChannelInfo>;
