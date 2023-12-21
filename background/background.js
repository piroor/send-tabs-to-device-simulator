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
    case Constants.kAPI_TYPE_PING:
      return Promise.resolve(true);

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

    case Constants.kAPI_TYPE_REGISTER_SELF:
      return (async () => {
        configs.knownExternalAddons = configs.knownExternalAddons.filter(addon => addon.id != sender.id).concat([{
          id:             sender.id,
          internalId:     sender.url.replace(/^moz-extension:\/\/([^\/]+)\/.*$/, '$1'),
          lastRegistered: Date.now(),
        }]);
      })();

    case Constants.kAPI_TYPE_UNREGISTER_SELF:
      return (async () => {
        configs.knownExternalAddons = configs.knownExternalAddons.filter(addon => addon.id != sender.id);
        return true;
      })();

  }
});

Sync.onMessage.addListener(async message => {
  log('Sync.onMessage ', message);

  if (message.body &&
      message.body.senderId) {
    try {
      await browser.runtime.sendMessage(message.body.senderId, {
        type:      Constants.kAPI_TYPE_NOTIFY_MESSAGE_RECEIVED,
        timestamp: message.timestamp,
        from:      message.from,
        to:        message.to,
        body:      message.body.body,
      });
    }
    catch(error) {
      log('failed to send message: unregister addon ', message.body.senderId, error);
      configs.knownExternalAddons = configs.knownExternalAddons.filter(knownAddon => knownAddon.id != message.body.senderId);
    }
  }
});

async function sendGlobalNotificationMessage(message) {
  for (const addon of configs.knownExternalAddons) {
    try {
     await browser.runtime.sendMessage(addon.id, message);
    }
    catch(error) {
      log('failed to send global notification: unregister addon ', addon.id, error);
      configs.knownExternalAddons = configs.knownExternalAddons.filter(knownAddon => knownAddon.id != addon.id);
    }
  }
}

Sync.onNewDevice.addListener(info => {
  log('Sync.onNewDevice ', info);
  sendGlobalNotificationMessage({
    type:   Constants.kAPI_TYPE_NOTIFY_DEVICE_ADDED,
    device: info,
  });
});

Sync.onUpdatedDevice.addListener(info => {
  log('Sync.onUpdatedDevice ', info);
  sendGlobalNotificationMessage({
    type:   Constants.kAPI_TYPE_NOTIFY_DEVICE_UPDATED,
    device: info,
  });
});

Sync.onObsoleteDevice.addListener(info => {
  log('Sync.onObsoleteDevice ', info);
  sendGlobalNotificationMessage({
    type:   Constants.kAPI_TYPE_NOTIFY_DEVICE_REMOVED,
    device: info,
  });
});


