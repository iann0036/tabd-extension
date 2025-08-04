# Tab'd Browser Extension

A browser extension that extends on the [Tab'd IDE extension](https://github.com/iann0036/tabd) in two ways:

1. Detect clipboard copy operations on web pages and passes its contents to the Tab'd IDE extension (requires browser helper installed)
2. View the highlighted ranged within online web editors (currently only GitHub PR review pages)

## Installation

You can install this extension from your browsers extension/addon store. Links are as follows:

- [Google Chrome](https://chrome.google.com/webstore/detail/tabd/lemjjpeploikbpmkodmmkdjcjodboidn)
- [Mozilla Firefox](https://addons.mozilla.org/en-GB/firefox/addon/tab-d/) __Publish in progress__
- [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/nhipdcegeolhecgahdhkcgcbgjhcpbpp) __Publish in progress__

Alternatively, you may manually load this extension unpackaed.

### Browser Helper Installation

To support the clipboard operations, you must install the browser helper. To do so, use the `Tab'd: Install browser helper` command from the Command Palette in your IDE.

See [iann0036/tabd-native-host](https://github.com/iann0036/tabd-native-host) for more details.