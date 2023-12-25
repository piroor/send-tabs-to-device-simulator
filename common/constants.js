/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const kSHORTHAND_CUSTOM_URI = /^ext\+send-tabs-to-device-simulator:([^:?#]+)(?:[:?]([^#]*))?(#.*)?$/;
export const kSHORTHAND_ABOUT_URI = /^about:send-tabs-to-device-simulator-([^?]+)/;
export const kSHORTHAND_URIS = {
  options: browser.runtime.getURL('options/options.html?independent=true'),
};

export const kNOTIFICATION_DEFAULT_ICON = '/resources/64x64.svg#default-bright';

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync
// Use 6 * 1024 instead of 8 * 1024 (max of the quota) for safety.
export const kSYNC_STORAGE_ITEM_SAFE_QUOTA = 6 * 1024;

export const kAPI_TYPE_PING            = 'ping';
export const kAPI_TYPE_SEND_MESSAGE    = 'send-message';
export const kAPI_TYPE_LIST_DEVICES    = 'list-devices';
export const kAPI_TYPE_REGISTER_SELF   = 'register-self';
export const kAPI_TYPE_UNREGISTER_SELF = 'unregister-self';
export const kAPI_TYPE_SEND_TABS       = 'send-tabs';

export const kAPI_TYPE_NOTIFY_TABS_RECEIVED    = 'tabs-received';
export const kAPI_TYPE_NOTIFY_MESSAGE_RECEIVED = 'message-received';
export const kAPI_TYPE_NOTIFY_DEVICE_ADDED     = 'device-added';
export const kAPI_TYPE_NOTIFY_DEVICE_UPDATED   = 'device-updated';
export const kAPI_TYPE_NOTIFY_DEVICE_REMOVED   = 'device-removed';
