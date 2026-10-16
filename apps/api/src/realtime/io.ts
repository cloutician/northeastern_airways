import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import type { Env } from "../config/env.js";

let ioSingleton: SocketIOServer | null = null;

export function attachSocketIO(httpServer: HttpServer, env: Env): SocketIOServer {
  const corsOrigin =
    env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : env.NODE_ENV === "development" ? true : false;

  const io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.on("connection", (socket) => {
    void socket.join("flight-status");
  });

  ioSingleton = io;
  return io;
}

export function getSocketIOServer(): SocketIOServer | null {
  return ioSingleton;
}

export function emitFlightStatusUpdate(payload: unknown): void {
  ioSingleton?.to("flight-status").emit("flightStatusUpdate", payload);
}

export async function shutdownSocketIO(): Promise<void> {
  if (!ioSingleton) return;
  const io = ioSingleton;
  ioSingleton = null;
  await io.close();
}
