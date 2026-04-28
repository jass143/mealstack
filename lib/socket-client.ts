import { io } from "socket.io-client";

const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:4001";

export async function emitToTenant(tenantId: string, event: string, payload: unknown) {
  const socket = io(SOCKET_URL, { transports: ["websocket"], forceNew: true });

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Socket emit timeout"));
    }, 5000);

    socket.on("connect", () => {
      socket.emit(event, { tenantId, ...payload as object });
      clearTimeout(timeout);
      socket.disconnect();
      resolve();
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
