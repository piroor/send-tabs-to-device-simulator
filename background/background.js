/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  log,
} from './common.js';
import * as Constants from './constants.js';
import * as Sync from '/common/sync.js';

Sync.init();

browser.runtime.onMessageExternal.addListener((message, sender) => {
  if (!message ||
      typeof message != 'object' ||
      typeof message.type != 'string')
    return;

  switch (message.type) {
    case Constants.kAPI_TYPE_SEND_MESSAGE:
      Sync.sendMessage(
        {
          senderId: sender.id,
          body:     message.body,
        },
        {
          to: message.to,
        }
      );
      break;
  }
});

Sync.onMessage.addListener(message => {
  log('Sync.onMessage ', message);

  if (message.body &&
      message.body.senderId) {
    browser.runtime.sendMessage(message.body.senderId, {
      type:      Constants.kAPI_TYPE_RECEIVE_MESSAGE,
      timestamp: message.timestamp,
      from:      message.from,
      to:        message.to,
      body:      message.body.body,
    });
  }
});

Sync.onNewDevice.addListener(info => {
  log('Sync.onNewDevice ', info);
});

Sync.onUpdatedDevice.addListener(info => {
  log('Sync.onUpdatedDevice ', info);
});

Sync.onObsoleteDevice.addListener(info => {
  log('Sync.onObsoleteDevice ', info);
});


