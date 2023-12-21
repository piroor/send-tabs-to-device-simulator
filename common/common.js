/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';
import EventListenerManager from '/extlib/EventListenerManager.js';

import * as Constants from './constants.js';

export const DEVICE_SPECIFIC_CONFIG_KEYS = mapAndFilter(`
  chunkedSyncDataLocal0
  chunkedSyncDataLocal1
  chunkedSyncDataLocal2
  chunkedSyncDataLocal3
  chunkedSyncDataLocal4
  chunkedSyncDataLocal5
  chunkedSyncDataLocal6
  chunkedSyncDataLocal7
  syncAvailableNotified
  syncDeviceInfo
  syncDevicesLocalCache
  syncLastMessageTimestamp
  syncOtherDevicesDetected

  debug
  logTimestamp
`.trim().split('\n'), key => {
  key = key.trim();
  return key && key.indexOf('//') != 0 && key;
});

export const configs = new Configs({
  syncOtherDevicesDetected: false,
  syncAvailableNotified: false,
  syncAvailableNotificationTimeout: 20 * 1000,
  syncDeviceInfo: null,
  syncDevices:    {},
  syncDevicesLocalCache: {},
  syncDeviceExpirationDays: 14,
  syncLastMessageTimestamp: 0,
  chunkedSyncData0: '',
  chunkedSyncData1: '',
  chunkedSyncData2: '',
  chunkedSyncData3: '',
  chunkedSyncData4: '',
  chunkedSyncData5: '',
  chunkedSyncData6: '',
  chunkedSyncData7: '',
  chunkedSyncDataLocal0: '',
  chunkedSyncDataLocal1: '',
  chunkedSyncDataLocal2: '',
  chunkedSyncDataLocal3: '',
  chunkedSyncDataLocal4: '',
  chunkedSyncDataLocal5: '',
  chunkedSyncDataLocal6: '',
  chunkedSyncDataLocal7: '',

  debug:     false,
  logTimestamp: true,

  configsVersion: 0
}, {
  localKeys: DEVICE_SPECIFIC_CONFIG_KEYS,
});

configs.$addLocalLoadedObserver((key, value) => {
  switch (key) {
    default:
      return;
  }
});

// cleanup old data
browser.storage.sync.remove(DEVICE_SPECIFIC_CONFIG_KEYS);

configs.$loaded.then(() => {
  EventListenerManager.debug = configs.debug;
  if (!configs.debug)
    log.logs = [];
});

export function getChunkedConfig(key) {
  const chunks = [];
  let count = 0;
  while (true) {
    const slotKey = `${key}${count}`;
    if (!(slotKey in configs))
      break;
    chunks.push(configs[slotKey]);
    count++;
  }
  return joinChunkedStrings(chunks);
}

export function setChunkedConfig(key, value) {
  let slotsSize = 0;
  while (`${key}${slotsSize}` in configs.$default) {
    slotsSize++;
  }

  const chunks = chunkString(value, Constants.kSYNC_STORAGE_ITEM_SAFE_QUOTA);
  if (chunks.length > slotsSize)
    throw new Error('too large data');

  [...chunks,
    ...Array.from(new Uint8Array(slotsSize), _ => '')]
    .slice(0, slotsSize)
    .forEach((chunk, index) => {
      const slotKey = `${key}${index}`;
      if (slotKey in configs)
        configs[slotKey] = chunk || '';
    });
}

function chunkString(input, maxBytes) {
  let binaryString = btoa(Array.from(new TextEncoder().encode(input), c => String.fromCharCode(c)).join(''));
  const chunks = [];
  while (binaryString.length > 0) {
    chunks.push(binaryString.slice(0, maxBytes));
    binaryString = binaryString.slice(maxBytes);
  }
  return chunks;
}

function joinChunkedStrings(chunks) {
  try {
    const buffer = Uint8Array.from(atob(chunks.join('')).split('').map(bytes => bytes.charCodeAt(0)));
    return new TextDecoder().decode(buffer);
  }
  catch(_error) {
    return '';
  }
}


export function log(message, ...args)
{
  const useConsole = true;//configs && configs.debug;
  if (!useConsole)
    return;

  args = args.map(arg => typeof arg == 'function' ? arg() : arg);

  const nest = (new Error()).stack.split('\n').length;
  let indent = '';
  for (let i = 0; i < nest; i++) {
    indent += ' ';
  }

  const timestamp = configs.logTimestamp ? `${getTimeStamp()} ` : '';
  const line = `tst<${log.context}>: ${timestamp}${indent}${message}`;
  if (useConsole)
    console.log(line, ...args);

  log.logs.push(`${line} ${args.reduce((output, arg, index) => {
    output += `${index == 0 ? '' : ', '}${uneval(arg)}`;
    return output;
  }, '')}`);
  log.logs = log.logs.slice(-log.max);
}
log.context = '?';
log.max  = 2000;
log.logs = [];
log.forceStore = true;

// uneval() is no more available after https://bugzilla.mozilla.org/show_bug.cgi?id=1565170
function uneval(value) {
  switch (typeof value) {
    case 'undefined':
      return 'undefined';

    case 'function':
      return value.toString();

    case 'object':
      if (!value)
        return 'null';
    default:
      try {
        return JSON.stringify(value);
      }
      catch(e) {
        return `${String(value)} (couldn't be stringified due to an error: ${String(e)})`;
      }
  }
}

function getTimeStamp() {
  const time = new Date();
  const hours = `0${time.getHours()}`.slice(-2);
  const minutes = `0${time.getMinutes()}`.slice(-2);
  const seconds = `0${time.getSeconds()}`.slice(-2);
  const milliseconds = `00${time.getMilliseconds()}`.slice(-3);
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

configs.$logger = log;

export async function wait(task = 0, timeout = 0) {
  if (typeof task != 'function') {
    timeout = task;
    task    = null;
  }
  return new Promise((resolve, _reject) => {
    setTimeout(async () => {
      if (task)
        await task();
      resolve();
    }, timeout);
  });
}

export function nextFrame() {
  return new Promise((resolve, _reject) => {
    window.requestAnimationFrame(resolve);
  });
}

export async function notify({ icon, title, message, timeout, url } = {}) {
  const id = await browser.notifications.create({
    type:    'basic',
    iconUrl: icon || Constants.kNOTIFICATION_DEFAULT_ICON,
    title,
    message
  });

  let onClicked;
  let onClosed;
  return new Promise(async (resolve, _reject) => {
    let resolved = false;

    onClicked = notificationId => {
      if (notificationId != id)
        return;
      if (url) {
        browser.tabs.create({
          url
        });
      }
      resolved = true;
      resolve(true);
    };
    browser.notifications.onClicked.addListener(onClicked);

    onClosed = notificationId => {
      if (notificationId != id)
        return;
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    };
    browser.notifications.onClosed.addListener(onClosed);

    if (typeof timeout != 'number')
      timeout = configs.notificationTimeout;
    if (timeout >= 0) {
      await wait(timeout);
    }
    await browser.notifications.clear(id);
    if (!resolved)
      resolve(false);
  }).then(clicked => {
    browser.notifications.onClicked.removeListener(onClicked);
    onClicked = null;
    browser.notifications.onClosed.removeListener(onClosed);
    onClosed = null;
    return clicked;
  });
}

// Helper functions for optimization
// Originally implemented by @bb010g at
// https://github.com/piroor/treestyletab/pull/2368/commits/9d184c4ac6c9977d2557cd17cec8c2a0f21dd527

// For better performance the callback function must return "undefined"
// when the item should not be included. "null", "false", and other false
// values will be included to the mapped result.
export function mapAndFilter(values, mapper) {
  /* This function logically equals to:
  return values.reduce((mappedValues, value) => {
    value = mapper(value);
    if (value !== undefined)
      mappedValues.push(value);
    return mappedValues;
  }, []);
  */
  const maxi = ('length' in values ? values.length : values.size) >>> 0; // define as unsigned int
  const mappedValues = new Array(maxi); // prepare with enough size at first, to avoid needless re-allocation
  let count = 0,
      value, // this must be defined outside of the loop, to avoid needless re-allocation
      mappedValue; // this must be defined outside of the loop, to avoid needless re-allocation
  for (value of values) {
    mappedValue = mapper(value);
    if (mappedValue !== undefined)
      mappedValues[count++] = mappedValue;
  }
  mappedValues.length = count; // shrink the array at last
  return mappedValues;
}

export function mapAndFilterUniq(values, mapper, options = {}) {
  const mappedValues = new Set();
  let value, // this must be defined outside of the loop, to avoid needless re-allocation
      mappedValue; // this must be defined outside of the loop, to avoid needless re-allocation
  for (value of values) {
    mappedValue = mapper(value);
    if (mappedValue !== undefined)
      mappedValues.add(mappedValue);
  }
  return options.set ? mappedValues : Array.from(mappedValues);
}

export function countMatched(values, matcher) {
  /* This function logically equals to:
  return values.reduce((count, value) => {
    if (matcher(value))
      count++;
    return count;
  }, 0);
  */
  let count = 0,
      value; // this must be defined outside of the loop, to avoid needless re-allocation
  for (value of values) {
    if (matcher(value))
      count++;
  }
  return count;
}

export function sanitizeForHTMLText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


export function isLinux() {
  return /^Linux/i.test(navigator.platform);
}
