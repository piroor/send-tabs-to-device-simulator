/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Options from '/extlib/Options.js';
import '/extlib/l10n.js';

import {
  DEVICE_SPECIFIC_CONFIG_KEYS,
  log,
  configs,
  sanitizeForHTMLText,
} from '/common/common.js';

import * as Sync from '/common/sync.js';

log.context = 'Options';

const options = new Options(configs, {
  steps: {
  },
  onImporting(values) {
    for (const key of DEVICE_SPECIFIC_CONFIG_KEYS) {
      if (JSON.stringify(configs[key]) != JSON.stringify(configs.$default[key]))
        values[key] = configs[key];
      else
        delete values[key];
    }
    return values;
  },
  onExporting(values) {
    for (const key of DEVICE_SPECIFIC_CONFIG_KEYS) {
      delete values[key];
    }
    return values;
  },
});

document.title = browser.i18n.getMessage('config_title');

function onConfigChanged(key) {
  //const value = configs[key];
  switch (key) {
    case 'syncDeviceInfo': {
      const name = (configs.syncDeviceInfo || {}).name || '';
      const nameField = document.querySelector('#syncDeviceInfoName');
      if (name != nameField.value)
        nameField.value = name;
      const icon = (configs.syncDeviceInfo || {}).icon || '';
      const iconRadio = document.querySelector(`#syncDeviceInfoIcon input[type="radio"][value=${JSON.stringify(sanitizeForHTMLText(icon))}]`);
      if (iconRadio && !iconRadio.checked)
        iconRadio.checked = true;
    }; break;

    case 'syncDevices':
      initOtherDevices();
      break;

    default:
      break;
  }
}

async function initOtherDevices() {
  await Sync.waitUntilDeviceInfoInitialized();
  const container = document.querySelector('#otherDevices');
  const range = document.createRange();
  range.selectNodeContents(container);
  range.deleteContents();
  for (const device of Sync.getOtherDevices()) {
    const icon = device.icon ? `<img src="/resources/icons/${sanitizeForHTMLText(device.icon)}.svg">` : '';
    const contents = range.createContextualFragment(`
      <li id="otherDevice:${sanitizeForHTMLText(String(device.id))}"
         ><label>${icon}${sanitizeForHTMLText(String(device.name))}
                 <button title=${JSON.stringify(sanitizeForHTMLText(browser.i18n.getMessage('config_removeDeviceButton_label')))}
                        >${sanitizeForHTMLText(browser.i18n.getMessage('config_removeDeviceButton_label'))}</button></label></li>
    `.trim());
    range.insertNode(contents);
  }
  range.detach();
}

function removeOtherDevice(id) {
  const devices = JSON.parse(JSON.stringify(configs.syncDevices));
  if (!(id in devices))
    return;
  delete devices[id];
  configs.syncDevices = devices;
}

configs.$addObserver(onConfigChanged);
window.addEventListener('DOMContentLoaded', async () => {
  await configs.$loaded;

  try {
    initSync();
  }
  catch(error) {
    console.error(error);
  }

  try {
    options.buildUIForAllConfigs(document.querySelector('#group-allConfigs'));
    onConfigChanged('syncDeviceInfo');
  }
  catch(error) {
    console.error(error);
  }

  document.documentElement.classList.add('initialized');
}, { once: true });

function initSync() {
  const deviceInfoNameField = document.querySelector('#syncDeviceInfoName');
  deviceInfoNameField.addEventListener('input', () => {
    if (deviceInfoNameField.$throttling)
      clearTimeout(deviceInfoNameField.$throttling);
    deviceInfoNameField.$throttling = setTimeout(async () => {
      delete deviceInfoNameField.$throttling;
      configs.syncDeviceInfo = JSON.parse(JSON.stringify({
        ...(configs.syncDeviceInfo || await Sync.generateDeviceInfo()),
        name: deviceInfoNameField.value
      }));
    }, 250);
  });

  const deviceInfoIconRadiogroup = document.querySelector('#syncDeviceInfoIcon');
  deviceInfoIconRadiogroup.addEventListener('change', _event => {
    if (deviceInfoIconRadiogroup.$throttling)
      clearTimeout(deviceInfoIconRadiogroup.$throttling);
    deviceInfoIconRadiogroup.$throttling = setTimeout(async () => {
      delete deviceInfoIconRadiogroup.$throttling;
      const checkedRadio = deviceInfoIconRadiogroup.querySelector('input[type="radio"]:checked');
      configs.syncDeviceInfo = JSON.parse(JSON.stringify({
        ...(configs.syncDeviceInfo || await Sync.generateDeviceInfo()),
        icon: checkedRadio.value
      }));
    }, 250);
  });

  initOtherDevices();

  const otherDevices = document.querySelector('#otherDevices');
  otherDevices.addEventListener('click', event => {
    if (event.target.localName != 'button')
      return;
    const item = event.target.closest('li');
    removeOtherDevice(item.id.replace(/^otherDevice:/, ''));
  });
  otherDevices.addEventListener('keydown', event => {
    if (event.key != 'Enter' ||
        event.target.localName != 'button')
      return;
    const item = event.target.closest('li');
    removeOtherDevice(item.id.replace(/^otherDevice:/, ''));
  });
}
