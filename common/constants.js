/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const kSHORTHAND_CUSTOM_URI = /^ext\+we-sync-messenger:([^:?#]+)(?:[:?]([^#]*))?(#.*)?$/;
export const kSHORTHAND_ABOUT_URI = /^about:we-sync-messenger-([^?]+)/;
export const kSHORTHAND_URIS = {
  options: browser.runtime.getURL('options/options.html?independent=true'),
};

export const kNOTIFICATION_DEFAULT_ICON = '/resources/64x64.svg#default-bright';

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync
// Use 6 * 1024 instead of 8 * 1024 (max of the quota) for safety.
// For example, 6 * 8 = 48KB is the max size of the user style rules.
export const kSYNC_STORAGE_SAFE_QUOTA = 6 * 1024;

