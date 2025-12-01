import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server;

// Track active subscriptions: symbol -> Set of socket IDs
const subscriptions = new Map<string, Set<string>>();

export function setupWebSocket(httpServer: HttpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all origins for development
            methods: ["GET", "POST"]
        },
        path: "/socket.io"
    });

    io.on("connection", (socket) => {
        console.log(`[WebSocket] Client connected: ${socket.id}`);

        // Handle subscription to stock updates
        socket.on("subscribe", (symbols: string[]) => {
            if (!Array.isArray(symbols)) return;

            console.log(`[WebSocket] Client ${socket.id} subscribed to: ${symbols.join(", ")}`);

            symbols.forEach(symbol => {
                const upperSymbol = symbol.toUpperCase();
                if (!subscriptions.has(upperSymbol)) {
                    subscriptions.set(upperSymbol, new Set());
                }
                subscriptions.get(upperSymbol)!.add(socket.id);

                // Join a room for this stock for efficient broadcasting
                socket.join(`stock:${upperSymbol}`);
            });
        });

        // Handle unsubscription
        socket.on("unsubscribe", (symbols: string[]) => {
            if (!Array.isArray(symbols)) return;

            symbols.forEach(symbol => {
                const upperSymbol = symbol.toUpperCase();
                if (subscriptions.get(upperSymbol)) {
                    subscriptions.get(upperSymbol)!.delete(socket.id);
                    if (subscriptions.get(upperSymbol)!.size === 0) {
                        subscriptions.delete(upperSymbol);
                    }
                }
                socket.leave(`stock:${upperSymbol}`);
            });
        });

        socket.on("disconnect", () => {
            console.log(`[WebSocket] Client disconnected: ${socket.id}`);
            // Cleanup subscriptions
            subscriptions.forEach((subscribers, symbol) => {
                if (subscribers.has(socket.id)) {
                    subscribers.delete(socket.id);
                    if (subscribers.size === 0) {
                        subscriptions.delete(symbol);
                    }
                }
            });
        });
    });

    console.log("[WebSocket] Server initialized");
    return io;
}

// Function to broadcast price updates to subscribed clients
export function broadcastPriceUpdate(symbol: string, data: any) {
    if (!io) {
        // console.log("[WebSocket] Warning: io not initialized during broadcast");
        return;
    }

    const upperSymbol = symbol.toUpperCase();
    // Emit to the specific room for this stock
    // console.log(`[WebSocket] Broadcasting update for ${upperSymbol}`);
    io.to(`stock:${upperSymbol}`).emit("price_update", {
        symbol: upperSymbol,
        data: data,
        timestamp: new Date().toISOString()
    });
}

// Get list of currently subscribed stocks (for priority queue)
export function getSubscribedStocks(): string[] {
    return Array.from(subscriptions.keys());
}
