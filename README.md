# iframe-comm
Lightweight but powerful library to send data between iframes.

Avoid all complexity of sending and capturing data using postMessage by hidding all setup and exposing simple methods to send and receive data in a standard interface.

## Usage
Import this library directly from our CDN:

`https://cdn.jsdelivr.net/gh/arleneio/iframe-comm@0.0.1/iframecom.min.js`

This library will expose a global window variable: `window.iframecom`


### Sending Data:
Use from any iframe or parent where you want to send data:

`window.iframecom.sendEvent('your-event-name', {...yourObjectData})`


### Receiving Data:
Add a standard event listener to receive data:

`window.addEventListener('your-event-name', yourListenerFunction)`