
// pollingWorker.js
// Este worker se encarga de mantener el ritmo de actualización incluso si la pestaña está inactiva.

let intervalId = null;

self.onmessage = function (e) {
    const { action, interval } = e.data;

    if (action === 'start') {
        if (intervalId) clearInterval(intervalId);
        console.log('[Worker] Polling iniciado cada', interval, 'ms');

        intervalId = setInterval(() => {
            self.postMessage('tick');
        }, interval || 3000);
    } else if (action === 'stop') {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        console.log('[Worker] Polling detenido');
    }
};
