/* eslint-disable max-len */

import type { Disabled, Toggle } from '@esa-commercials/types/schemas';
import { get as nodecg } from './nodecg';

/**
 * This is where you can declare all your replicant to import easily into other files,
 * and to make sure they have any correct settings on startup.
 */

export const disabled = nodecg().Replicant<Disabled>('disabled');
export const toggle = nodecg().Replicant<Toggle>('toggle');
