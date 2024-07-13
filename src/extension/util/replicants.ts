/* eslint-disable max-len */

import { Cycles, Disabled, Toggle } from '@esa-commercials/types/schemas';
import type NodeCG from '@nodecg/types';
import { TwitchChannelInfo } from 'speedcontrol-util/types/schemas';
import { get as nodecg } from './nodecg';

type Opts<T> = NodeCG.Replicant.Options<T>;
// Wrapper for replicants that have a default (based on schema).
function hasDefault<T>(name: string, namespaceOrOpts?: string | Opts<T> | undefined, opts?: Opts<T> | undefined) {
  return nodecg().Replicant<T>(name, namespaceOrOpts, opts) as unknown as NodeCG.ServerReplicantWithSchemaDefault<T>;
}
// Wrapper for replicants that don't have a default (based on schema).
function hasNoDefault<T>(name: string, namespaceOrOpts?: string | Opts<T> | undefined, opts?: Opts<T> | undefined) {
  return nodecg().Replicant<T>(name, namespaceOrOpts, opts) as unknown as NodeCG.ServerReplicant<T>;
}

/**
 * This is where you can declare all your replicant to import easily into other files,
 * and to make sure they have any correct settings on startup.
 */
export const cycles = hasDefault<Cycles>('cycles');
export const disabled = hasDefault<Disabled>('disabled');
export const toggle = hasDefault<Toggle>('toggle');
export const twitchChannelInfo = hasNoDefault<TwitchChannelInfo>('twitchChannelInfo', 'nodecg-speedcontrol');
