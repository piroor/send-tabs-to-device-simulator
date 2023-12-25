# Send Tabs to Device Simulator

This is a Firefox addon to send/receive tabs and other messages between devices, based on WebExtensions API's sync storage.

## Motivation

Firefox does not allow addons to send pages to other devices via Firefox Sync (See also [1417183 - Provide a web extensions API-based way to send pages between devices](https://bugzilla.mozilla.org/show_bug.cgi?id=1417183).)
Thus, some addons having demand to simulate Firefox's native features like Tree Style Tab need to simulate the "Send Tabs to Device" feature with `storage.sync`.
But there is a problem: such addons cannot send tabs to Android devices, if the addon does not support Firefox for Android aka Fenix.

Addons for Fenix have many restrictions, so some addons cannot support both Firefox (on desktop PC environments) and Fenix.
This project aims to provide a small addon supporting both Desktop and Android, and providing APIs for other addons to send tabs between devices.

## Do you need to use this addon?

```mermaid
%%{init: {"flowchart": {"htmlLabels": false}} }%%
flowchart TD;
  HasOwnSync{{"Does your addon has
  its own Sync feature?"}}

  BothSupport{{"Does your addon support
  both Desktop and Android?"}}

  ReduceCost{{"Do you want to reduce the cost
  to maintain its own sync feature?"}}

  Need["You should use this addon.
  (Please note that your addon become
  dependeing on this addon.)"]

  NoNeed["You don't need to use this addon."]

  HasOwnSync-->|Yes|BothSupport
  HasOwnSync-->|No|Need

  BothSupport-->|Yes|ReduceCost
  BothSupport-->|No|Need

  ReduceCost-->|Yes|Need
  ReduceCost-->|No|NoNeed
```

## API

### Get devices information

```javascript
const SIMULATOR_ID = 'send-tabs-to-device-simulator@piro.sakura.ne.jp';
const devices = await browser.runtime.sendMessage(SIMULATOR_ID, { type: 'list-devices' });
/*
devices ==
  [
    { id:        "device-1703208629205-41500",
      platform:  "Windows",
      name:      "Firefox on Windows",
      icon:      "device-desktop",
      myself:    true,
      timestamp: 1703492610680 },
    { id:        "device-1703492776144-12236",
      platform:  "Android",
      name:      "Firefox on Android",
      icon:      "device-mobile",
      myself:    false,
      timestamp: 1703492776418 }
  ]
*/
```

### Send a message to a specific device

```javascript
const succeeded = await browser.runtime.sendMessage(SIMULATOR_ID, {
  type: 'send-message',
  to:   'device-1703208629205-41500', // device ID
  body: { // arbitrary JSONable object
    message: 'Hello, world!'
  },
});
/*
succeeded == true (success) or false (failure)
*/
```

Please note that the returned value `true` does not mean the message is successfully sent.
For example it will become `true` even if there is no such device specified with the ID.


### Send tabs to a specific device

```javascript
const multiselectedTabs = await browser.tabs.query({ highlighted: true });
const succeededWithTabs = await browser.runtime.sendMessage(SIMULATOR_ID, {
  type: 'send-tabs',
  to:   'device-1703208629205-41500', // device ID
  tabs: multiselectedTabs,
});
const succeededWithTabIDs = await browser.runtime.sendMessage(SIMULATOR_ID, {
  type: 'send-tabs',
  to:   'device-1703208629205-41500', // device ID
  tabIds: multiselectedTabs.map(tab => tab.id),
});

/*
succeeded == true (success) or false (failure)
*/
```

Please note that the returned value `true` does not mean tabs are successfully sent.
For example it will become `true` even if there is no such device specified with the ID.
