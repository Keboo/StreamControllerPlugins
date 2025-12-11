const TimerStore = { setTimeout: {}, setInterval: {} };

self.addEventListener('message', function ({ data }) {
    switch (data.event) {
        case 'setTimeout':
            TimerStore.setTimeout[data.id] = setTimeout(() => {
                self.postMessage({ event: 'setTimeout', id: data.id });
            }, data.delay);
            break;
        case 'clearTimeout':
            clearTimeout(TimerStore.setTimeout[data.id]);
            delete TimerStore.setTimeout[data.id];
            break;
        case 'setInterval':
            TimerStore.setInterval[data.id] = setInterval(() => {
                self.postMessage({ event: 'setInterval', id: data.id });
            }, data.delay);
            break;
        case 'clearInterval':
            clearInterval(TimerStore.setInterval[data.id]);
            delete TimerStore.setInterval[data.id];
            break;
    }
});
