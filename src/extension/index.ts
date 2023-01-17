/* eslint-disable @typescript-eslint/no-var-requires, global-require */

// This must go first so we can use module aliases!
/* eslint-disable import/first */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('module-alias').addAlias('@esa-commercials', require('path').join(__dirname, '.'));

import type NodeCGTypes from '@alvancamp/test-nodecg-types';
import type { Configschema } from '@esa-commercials/types/schemas';
import { set } from './util/nodecg';

export = async (nodecg: NodeCGTypes.ServerAPI<Configschema>): Promise<void> => {
  /**
   * Because of how `import`s work, it helps to use `require`s to force
   * things to be loaded *after* the NodeCG context is set.
   */
  set(nodecg);
  await require('./server').setup();
  require('./commercial');
};
