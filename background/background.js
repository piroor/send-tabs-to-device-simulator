/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  log,
  configs,
  notify,
} from '/common/common.js';
import * as Constants from '/common/constants.js';
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
          type:     Constants.kAPI_TYPE_SEND_MESSAGE,
          senderId: sender.id,
          body:     message.body,
        },
        {
          to: message.to,
        }
      );
      break;

    case Constants.kAPI_TYPE_LIST_DEVICES:
      return configs.$loaded.then(() => {
        return configs.syncDevices;
      });

    case Constants.kAPI_TYPE_REGISTER_SELF:
      return configs.$loaded.then(() => {
        configs.knownExternalAddons = configs.knownExternalAddons.filter(addon => addon.id != sender.id).concat([{
          id:             sender.id,
          internalId:     sender.url.replace(/^moz-extension:\/\/([^\/]+)\/.*$/, '$1'),
          lastRegistered: Date.now(),
        }]);
      });

    case Constants.kAPI_TYPE_UNREGISTER_SELF:
      return configs.$loaded.then(() => {
        configs.knownExternalAddons = configs.knownExternalAddons.filter(addon => addon.id != sender.id);
        return true;
      });

    case Constants.kAPI_TYPE_SEND_TABS:
      sendTabsToDevice({
        tabs:     message.body.tabs || message.body.tabIds || [],
        senderId: sender.id,
        to:       message.to,
      });
      break;
  }
});

Sync.onMessage.addListener(async message => {
  log('Sync.onMessage ', message);

  const body = message.body;
  if (!body) {
    log('fatal: missing message body');
    return;
  }

  switch (body.type) {
    case Constants.kAPI_TYPE_SEND_MESSAGE:
      if (!message.body.senderId) {
        log('fatal: missing message sender ID');
        return;
      }
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
        log('failed to deliver received message: unregister addon ', message.body.senderId, error);
        configs.knownExternalAddons = configs.knownExternalAddons.filter(knownAddon => knownAddon.id != message.body.  senderId);
      }
      break;

    case Constants.kAPI_TYPE_SEND_TABS:
      receiveTabs({
        tabs: body.tabs,
        from: message.from,
      });
      break;
  }

});

async function sendGlobalNotificationMessage(message) {
  await configs.$loaded;
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


async function sendTabsToDevice({ tabs, to, senderId } = {}) {
  tabs = (await Promise.all(tabs.map(tab => {
    if (typeof tab == 'number')
      return browser.tabs.get(tab);
    return tab;
  }))).filter(Sync.isSendableTab);
  if (tabs.length <= 0)
    return;

  Sync.sendMessage(
    {
      type:     Constants.kAPI_TYPE_SEND_TABS,
      senderId,
      tabs:     tabs.map(tab => ({ url: tab.url, cookieStoreId: tab.cookieStoreId })),
    },
    {
      to,
    }
  );

  const multiple = tabs.length > 1 ? '_multiple' : '';
  notify({
    title: browser.i18n.getMessage(
      `sentTabs_notification_title${multiple}`,
      [Sync.getDeviceName(to)]
    ),
    message: browser.i18n.getMessage(
      `sentTabs_notification_message${multiple}`,
      [Sync.getDeviceName(to)]
    ),
    timeout: configs.syncSentTabsNotificationTimeout,
  });
}

async function receiveTabs({ tabs, from } = {}) {
  if (!Array.isArray(tabs))
    return;

  const multiple = tabs.length > 1 ? '_multiple' : '';
  notify({
    title: browser.i18n.getMessage(
      `receiveTabs_notification_title${multiple}`,
      [Sync.getDeviceName(from)]
    ),
    message: browser.i18n.getMessage(
      `receiveTabs_notification_message${multiple}`,
      tabs.length > 1 ?
        [tabs[0].url, tabs.length, tabs.length - 1] :
        [tabs[0].url]
    ),
    timeout: configs.syncReceivedTabsNotificationTimeout,
  });

  const [window, identities] = await Promise.all([
    browser.windows.getCurrent(),
    browser.contextualIdentities.query({}),
  ]);
  const identityIds = new Set(identities.map(identity => identity.cookieStoreId));
  const windowId = window.id;
  const initialIndex = window.tabs.length;
  let index = 0;
  const openedTabs = [];
  for (const tab of tabs) {
    const createParams = {
      windowId,
      url:    tab.url,
      index:  initialIndex + index,
      active: index == 0,
    };
    if (tab.cookieStoreId &&
        tab.cookieStoreId != 'firefox-default' &&
        identityIds.has(tab.cookieStoreId))
      createParams.cookieStoreId = tab.cookieStoreId;
    let openedTab;
    try {
      openedTab = await browser.tabs.create(createParams);
    }
    catch(error) {
      console.log(error);
    }
    if (!openedTab)
      openedTab = await browser.tabs.create({
        ...createParams,
        url: `about:blank?${tab.url}`,
      });
    openedTabs.push(openedTab);
    index++;
  }
}
