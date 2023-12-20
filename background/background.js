/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import * as Sync from '/common/sync.js';

Sync.init();

Sync.onMessage.addListener(message => {
  console.log('Sync.onMessage ', message);
});

Sync.onNewDevice.addListener(info => {
  console.log('Sync.onNewDevice ', info);
});

Sync.onUpdatedDevice.addListener(info => {
  console.log('Sync.onUpdatedDevice ', info);
});

Sync.onObsoleteDevice.addListener(info => {
  console.log('Sync.onObsoleteDevice ', info);
});


