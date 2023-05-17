/**
 * iframecom.js
 *
 * A lightweight library to implement a simple but powerful way to send data between iframes.
 * 
 * This library is exposed as global variable: window.iframecom
 * 
 **/
const iframecomObj_Init = () => {
  let timeoutIframeObj = null;

  function randomUUID() {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + new Date().getTime()
    );
  }

  const iframecomObj = {
    parentId: null,
    children: [],
    parentId: null,
    ready: false,
    sendToChildren: (sender, data, id) => {
      iframecomObj.children.forEach((child) => {
        child.source.postMessage(
          {
            sender,
            id: id || iframecomObj.frameId,
            data,
          },
          '*',
        );
      });
    },
    getChildById: (id) => {
      return iframecomObj.children.find((child) => child.id === id);
    },
    amIParent: () => {
      return iframecomObj.parentId === iframecomObj.frameId;
    },
    listener: function (e) {
      try {
        //console.log('IFRAME COM ON MESSAGE', e.data, iframecomObj.frameId)
        if (e.data.sender === 'iframecom-ready') {
          iframecomObj.ready = true;
          window.dispatchEvent(new CustomEvent('iframecom-ready', { detail: e.data.id }));
        }

        if (e.data.sender === 'iframecomObj-register-from-parent') {
          iframecomObj.parentId = e.data.id;
          clearTimeout(timeoutIframeObj);
          iframecomObj.ready = true;
          //iframecomObj.print();
        }

        //if the message comes from arleneEmbeddedIframe it means that this js script is loaded in a
        //page that is embedding a 360 experience in an inner iframe
        if (e.data.sender === 'iframecomObj-register' && e.data.id !== iframecomObj.frameId) {
          //console.log('Register children',iframecomObj.frameId,e,e.source,iframecomObj.amIParent());

          iframecomObj.children.push({
            source: e.source,
            id: e.data.id,
          });

          e.source.postMessage(
            {
              sender: 'iframecomObj-register-from-parent',
              id: iframecomObj.frameId,
            },
            '*',
          );

          //console.log('Comparison 360',iframecomObj.parentId, iframecomObj.frameId);
          if (iframecomObj.amIParent()) {
            //console.log('SEND READY TO CHILD',e.data.id)
            e.source.postMessage(
              {
                sender: 'iframecom-ready',
              },
              '*',
            );
          }
        }

        if (e.data.sender === 'iframecomObj-message') {
          if (iframecomObj.amIParent()) {
            //console.log('process from parent',e.data);
            const { eventName, data } = JSON.parse(e.data.message);
            iframecomObj.sendToChildren('iframecomObj-event-from-parent', { eventName, data }, e.data.id);
            //if (e.data.id !== iframecomObj.frameId) {
            window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
            //}
            //console.log('I AM PARENT', eventName, data);
          }
        }

        if (e.data.sender === 'iframecomObj-event-from-parent') {
          //console.log('received by',iframecomObj.frameId, e.data);
          if (!iframecomObj.amIParent() && e.data.id !== iframecomObj.frameId) {
            const { eventName, data } = e.data.data;
            //console.log('eventName, data',eventName, data);
            window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
          }
        }

        if (e.data.sender === 'iframecomObj-get-local-storage') {
          if (iframecomObj.amIParent()) {
            iframecomObj.getChildById(e.data.id).source.postMessage(
              {
                sender: 'iframecomObj-get-local-storage-response',
                id: iframecomObj.frameId,
                data: localStorage.getItem(e.data.key),
              },
              '*',
            );
          }
        }

        if (e.data.sender === 'iframecomObj-set-local-storage') {
          if (iframecomObj.amIParent()) {
            //console.log('receives for local', e.data);
            localStorage.setItem(e.data.key, e.data.value);
          }
        }

        if (e.data.sender === 'iframecomObj-get-local-storage-response') {
          window.dispatchEvent(new CustomEvent('iframecomObj-get-local-storage-response', { detail: e.data.data }));
        }
      } catch (err) {
        console.error(err);
      }
    },
    init: () => {
      iframecomObj.frameId = randomUUID();

      //console.log('IFRAME COM INIT', iframecomObj.frameId)
      window.top.postMessage(
        {
          sender: 'iframecomObj-register',
          id: iframecomObj.frameId,
        },
        '*',
      );

      window.addEventListener('message', iframecomObj.listener);

      timeoutIframeObj = setTimeout(() => {
        //console.log('I AM PARENT', iframecomObj.children.length,'360');
        iframecomObj.sendToChildren('iframecom-ready');
        window.dispatchEvent(new CustomEvent('iframecom-ready', { detail: iframecomObj.frameId }));
        iframecomObj.parentId = iframecomObj.frameId;
        iframecomObj.ready = true;
      }, 700);
    },

    onReady: (callback) => {
      if (iframecomObj.ready) {
        callback();
        return;
      }

      const callbackCaller = () => {
        window.removeEventListener('iframecom-ready', callbackCaller);
        callback();
      };

      window.addEventListener('iframecom-ready', callbackCaller);
    },
    sendEvent: (eventName, data) => {
      if (iframecomObj.amIParent()) {
        iframecomObj.listener({
          data: {
            sender: 'iframecomObj-message',
            message: JSON.stringify({ eventName, data }),
            id: iframecomObj.frameId,
          },
        });
        return;
      }

      window.top.postMessage(
        {
          sender: 'iframecomObj-message',
          message: JSON.stringify({ eventName, data }),
          id: iframecomObj.frameId,
        },
        '*',
      );
      //console.log('sent by',iframecomObj.frameId);
    },

    localStorage: {
      getItem: (key) => {
        return new Promise(async (resolve) => {
          if (!iframecomObj.ready) {
            await new Promise((resolve) => setTimeout(resolve, 700));
          }

          if (iframecomObj.amIParent()) {
            resolve(localStorage.getItem(key));
            return;
          }

          window.top.postMessage(
            {
              sender: 'iframecomObj-get-local-storage',
              key,
              id: iframecomObj.frameId,
            },
            '*',
          );

          window.addEventListener('iframecomObj-get-local-storage-response', (e) => {
            resolve(e.detail);
          });
        });
      },
      setItem: async (key, value) => {
        if (!iframecomObj.ready) {
          await new Promise((resolve) => setTimeout(resolve, 700));
        }

        //console.log('iframecomObj-set-local-storage',key,value);
        if (iframecomObj.amIParent()) {
          localStorage.setItem(key, value);
          return;
        }

        window.top.postMessage(
          {
            sender: 'iframecomObj-set-local-storage',
            key,
            value,
            id: iframecomObj.frameId,
          },
          '*',
        );
      },
    },
  };

  window.iframecom = iframecomObj;
  window.iframecom.init();
};

if (!window.iframecom) {
  iframecomObj_Init();
}
