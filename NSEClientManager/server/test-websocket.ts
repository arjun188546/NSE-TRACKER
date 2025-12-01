import { io } from "socket.io-client";

const ports = [5000, 5001, 5002];

async function testPort(port: number) {
    return new Promise((resolve) => {
        console.log(`Testing connection to http://localhost:${port}...`);
        const socket = io(`http://localhost:${port}`, {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            reconnection: false,
            timeout: 5000
        });

        socket.on("connect", () => {
            console.log(`✅ Connected to WebSocket server on port ${port}`);

            const symbol = "RELIANCE";
            console.log(`Subscribing to ${symbol}...`);
            socket.emit("subscribe", [symbol]);

            socket.on("price_update", (data) => {
                console.log("🚀 Received price update:", JSON.stringify(data, null, 2));
                socket.disconnect();
                resolve(true);
            });
        });

        socket.on("connect_error", (err) => {
            console.log(`❌ Connection failed on port ${port}: ${err.message}`);
            socket.disconnect();
            resolve(false);
        });
    });
}

async function runTests() {
    for (const port of ports) {
        const success = await testPort(port);
        if (success) {
            console.log("Test passed!");
            process.exit(0);
        }
    }
    console.log("All ports failed.");
    process.exit(1);
}

runTests();
