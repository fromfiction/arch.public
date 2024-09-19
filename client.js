//const endpoint = "ws://localhost/ws";
const endpoint = 'wss://frimfram-arch.deno.dev/ws';
let initialReconnectDelay = 1000;
let currentReconnectDelay = initialReconnectDelay;
let maxReconnectDelay = 16000;

//const roomId = 'ajweclisfn';

class WebSocketHandler {

    constructor(endpoint, initRecDelay = 1000, curRecDelay = 1000, maxRecDelay = 16000) {
        console.log(endpoint);
        this._endpoint = endpoint;
        this._initialReconnectDelay = initRecDelay;
        this._currentReconnectDelay = curRecDelay;
        this._maxReconnectDelay = maxRecDelay;
        this.connect();
    }

    connect() {
        this._ws = new WebSocket(this._endpoint);

        this._ws.onopen = () => {
            console.log("Connected to WebSocket server");
            this.send('field');
        };
        
        this._ws.onmessage = (request) => {
            console.log(request.data);
            const data = JSON.parse(request.data);

            const discard = (card) => {
                console.log(card);
                //const name = card.querySelector('.cardname').innerText;
                if (!card || !card.hasAttribute('name')) return;
                const name = card.getAttribute('name');
                this.sendEvent('discard', name);
            }
        
            if (data.event === 'cardlist' || data.event === 'createRandomDeck') {
                const container = document.querySelector('#container');
                if (!container) return;
                //container.innerText = data.message;
            }

            if (data.event === 'prepareReset') {
                const root = document.createElement('div');
                root.setAttribute('id', 'popup');
                const sets = data.message;
                for (const key in sets) {
                    console.log(sets[key]);
                    const parent = document.createElement('div');
                    parent.setAttribute('class', 'sets');
                    const input = document.createElement('input');
                    input.setAttribute('class', 'expantion_checkbox');
                    input.setAttribute('type', 'checkbox');
                    input.setAttribute('id', key);
                    input.setAttribute('name', sets[key]);
                    input.checked = true;
                    const label = document.createElement('label');
                    label.setAttribute('for', key);
                    label.textContent = sets[key];
                    parent.append(input);
                    parent.append(label);
                    root.append(parent);
                }
                const buttonParent = document.createElement('div');
                buttonParent.setAttribute('class', 'button_block');
                const submit = document.createElement('button');
                submit.textContent = 'submit';
                submit.setAttribute('class', 'execute_reset');
                submit.addEventListener('click', () => {
                    const sets = document.getElementsByClassName('expantion_checkbox');
                    const keys = [];
                    for (const set of sets) {
                        if (set.checked)
                            keys.push(set.name);
                    }
                    //const message = JSON.stringify(keys);
                    ws.sendEvent('reset', keys);
                    pop.style.display = 'none';
                });
                buttonParent.append(submit);
                root.append(buttonParent);
                const pop = document.getElementById('popup_overlay');
                pop.append(root);
                pop.style.display = 'block';
            }

            if (data.event === 'shuffle') {
                const container = document.getElementById('container');
                if (!container) return;
                if (data.message == '') {
                    container.innerHTML = '';
                    return;
                }
            }

            if (data.event === 'reset') {
                const container = document.getElementById('container');
                const legals = document.getElementById('legal_sets');
                if (!container) return;
                if (!legals) return;
                legals.textContent = data.message;
                container.innerHTML = '';
            }

            if (data.event === 'field') {
                const container = document.querySelector('#container');
                if (!container) return;
                const legals = document.getElementById('legal_sets');
                if (!legals) return;
                if (data.message[1]) {
                    const sets = data.message[1];
                    console.log(sets);
                    if (sets[0] == null) {
                        legals.textContent = 'No Card in Deck. Please Reset Deck.';
                    } else {
                        legals.textContent = sets[1];
                    }
                }
                if (data.message[0] == '') {
                    container.innerHTML = '';
                    return;
                }
                const elm = document.createElement('div');
                elm.innerHTML = data.message[0];
                const children = elm.querySelectorAll('.card');
                for (let child of children) {
                    if (child.classList.contains('ongoing')) {
                        const name = elm.firstElementChild.querySelector('.cardname').innerText;
                        elm.firstElementChild.addEventListener('click', function () {
                            discard(this);
                        });
                    }
                    container.append(child);
                }
            }

            if (data.event === 'draw') {
                const container = document.querySelector('#container');
                if (!container) return;
                if (data.message == null) return;
                console.log(data.message);
                const elm = document.createElement('div');
                elm.innerHTML = data.message;
                const active = container.getElementsByClassName('active');
                if (active.length > 2) {
                    //if (container.lastElementChild && !container.lastElementChild.classList.contains('ongoing')) {
                    const card = active[active.length - 1];
                    card.parentNode.removeChild(card);
                    //discard(card);
                    //}
                }
                if (elm.firstElementChild.classList.contains('ongoing')) {
                    const name = elm.firstElementChild.querySelector('.cardname').innerText;
                    elm.firstElementChild.addEventListener('click', function () {
                        discard(this);
                    });
                }
                container.prepend(elm.firstElementChild);
            }

            if (data.event === 'discard') {
                const name = data.message;
                const cards = document.querySelectorAll('.card');
                for (let card of cards) {
                    if (!card || !card.hasAttribute('name')) continue;
                    if (card.getAttribute('name') == name) {
                        card.parentNode.removeChild(card);
                        break;
                    }
                }
            }
        };
        
        this._ws.onclose = () => {
            console.log("Disconnected from WebSocket server");

            setTimeout( () => {
                this.reconnect();
            }, this._currentReconnectDelay);
        };
    }

    reconnect() {
        if (this._currentReconnectDelay < this._maxReconnectDelay) {
            this._currentReconnectDelay *= 2;
            console.log('reconnecting...');
            this.connect();
        }
    }

    getState() {
        return this._ws.readyState;
    }

    send(event) {
        const data = {
            event: event,
            message: ''
        };
        console.log(data);
        this._ws.send(JSON.stringify(data));
    }

    sendEvent(event, message) {
        const data = {
            event: event,
            message: message
        };
        this._ws.send(JSON.stringify(data));
    }
}

ws = null;//new WebSocketHandler(endpoint + "/" + roomId);

const join = () => {

    const data = sessionStorage.getItem('roomId');
    if (data != null) {
        ws = new WebSocketHandler(endpoint + "/" + data);
        initPopupOverlay();
        return;
    }

    const root = document.createElement('div');
    root.setAttribute('id', 'popup');

    const formdiv = document.createElement('div');
    formdiv.setAttribute('class', 'popup_form');

    const label = document.createElement('label');
    label.textContent = 'Room ID';
    const form = document.createElement('input');
    form.setAttribute('type', 'text');
    form.setAttribute('id', 'room_id');
    form.setAttribute('minlength', '4');
    form.setAttribute('maxlength', '16');

    const br = document.createElement('br');

    formdiv.append(label);
    formdiv.append(br);
    formdiv.append(form);
    root.append(formdiv);
    
    const buttonParent = document.createElement('div');
    buttonParent.setAttribute('class', 'button_block');
    const submit = document.createElement('button');
    submit.textContent = 'submit';
    submit.setAttribute('class', 'execute_reset');

    buttonParent.append(submit);
    root.append(buttonParent);
    const pop = document.getElementById('popup_overlay');
    pop.append(root);
    pop.style.display = 'block';


    submit.addEventListener('click', () => {
        const form = document.getElementById('room_id');
        if (!form) return;
        const roomId = form.value;

        ws = new WebSocketHandler(endpoint + "/" + roomId);

        sessionStorage.setItem('roomId', roomId);

        initPopupOverlay();
    });
}

const initPopupOverlay = () => {
    const popup_overlay = document.getElementById('popup_overlay');
    if (!popup_overlay) return false;
    popup_overlay.addEventListener('click', (event) => {
        if (event.target == popup_overlay) {
            popup_overlay.innerHTML = '';
            popup_overlay.style.display = 'none';
        }
    });
    
    popup_overlay.style.display = 'none';
}

onload = (event) => {
    const interval = 500;
    let active = true;

    join();

    const button_draw = document.querySelector('.button_draw');
    if (!button_draw) return false;
    button_draw.addEventListener('click', () => {
        if (ws.getState() === 3) {
            return;
        }
        if (active) {
            active = false;
            ws.send('draw');
            setTimeout( () => {
                active = true;
            }, interval);
        }
    });

    const button_shuffle = document.querySelector('.button_shuffle');
    if (!button_shuffle) return false;
    button_shuffle.addEventListener('click', () => {
        if (ws.getState() === 3) {
            return;
        }
        ws.send('shuffle');
    });

    const button_reset = document.querySelector('.button_reset');
    if (!button_reset) return false;
    button_reset.addEventListener('click', () => {
        if (ws.getState() === 3) {
            return;
        }

        ws.send('prepareReset');
    });
};
