const { token, seshid } = process.env;

if (!token) {
    new Error("token not defined")
    process.exit() // Safe messures
}

if (!seshid) {
    new Error("seshid not defined")
    process.exit() // Safe messures
}

const WebSocket = require("ws");
const wss = new WebSocket.WebSocketServer({ port: 3000 });

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
        }, 10000);
    };

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.event === "hr_update") {
            broadcastMessage(data.payload);
        }
    };

    ws.onclose = () => {
        setTimeout(connectToHyperateWebSocket, 1000);
    };
}

connectToHyperateWebSocket();

wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
        clients.delete(ws);
    });
});

function broadcastMessage(message) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        } else {
            clients.delete(client);
        }
    }
}
