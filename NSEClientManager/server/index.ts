import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startScheduler } from "./services/nse-scraper";
import { priceUpdateService } from "./services/price-update-service";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "nse-stock-analysis-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Fatal] Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
  console.error('[Fatal] Uncaught Exception:', error);
  // Don't exit immediately - allow cleanup
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  let port = parseInt(process.env.PORT || '5000', 10);
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };
  // SO_REUSEPORT is not supported on Windows; only enable elsewhere
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  let schedulerStarted = false;
  let listening = false;

  const onListening = async () => {
    if (listening) return; // Prevent duplicate callback execution
    listening = true;
    
    log(`serving on port ${port}`);
    if (!schedulerStarted && process.env.NODE_ENV !== "test") {
      schedulerStarted = true;
      log(`Starting NSE scraper scheduler...`);
      startScheduler();
      log(`Starting real-time price update service...`);
      await priceUpdateService.start();
    }
  };

  const startServer = () => {
    if (server.listening) {
      log('server already listening, skipping duplicate start');
      return;
    }
    
    server.listen(listenOptions, onListening);
  };

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`port ${port} in use, retrying on ${port + 1}...`);
      port += 1;
      listenOptions.port = port;
      setTimeout(startServer, 300);
    } else {
      log(`server error: ${err.message}`);
      throw err;
    }
  });

  startServer();
})();
