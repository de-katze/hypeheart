const { token, seshid } = process.env;

if (!token) {
    return new Error("token not defined")
}

if (!seshid) {
    return new Error("seshid not defined")
}

const WebSocket = require("ws");
const wss = new WebSocket.WebSocketServer({ port: 3000 });

let hr = 0
const numbers = [];

const clients = new Set();

function connectToHyperateWebSocket() {
    const ws = new WebSocket(`wss://app.hyperate.io/socket/websocket?token=${token}`);

    ws.onopen = () => {
        ws.send(JSON.stringify({
            "topic": `hr:${seshid}`,
            "event": "phx_join",
            "payload": {},
            "ref": 0
        }));

        setInterval(() => {
            ws.send(JSON.stringify({
                "topic": "phoenix",
                "event": "heartbeat",
                "payload": {},
                "ref": 0
            }));
        }, 8000);
    };

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.event === "hr_update") {
            hr = data.payload.hr;
            numbers.push(data.payload.hr)
            broadcastMessage();
        }
    };

    ws.onclose = () => {
        setTimeout(connectToHyperateWebSocket, 1000);
    };
}

connectToHyperateWebSocket();

wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify(hr))

    ws.on('close', () => {
        clients.delete(ws);
    });
});

function broadcastMessage() {
    const avg = Math.floor(numbers.reduce((acc, num) => acc + num, 0) / numbers.length)

    const message = { hr, avg }
    console.log(message)
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        } else {
            clients.delete(client);
        }
    }
}


const clearDaily = () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));

    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
        numbers = [];
    }
};

clearDaily();

setInterval(clearDaily, 60 * 1000);