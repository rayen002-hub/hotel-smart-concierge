import { createServer } from "http";
import { AddressInfo } from "net";
import { io as ioc } from "socket.io-client";
import { initSocketIO } from "../src/socket/socket";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";

describe("WebSocket Auth Middleware", () => {
  let server: any;
  let port: number;

  beforeAll((done) => {
    server = createServer();
    initSocketIO(server);
    server.listen(() => {
      const address = server.address() as AddressInfo;
      port = address.port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it("should reject connection when no token is provided", (done) => {
    const clientSocket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
      autoConnect: true,
    });

    clientSocket.on("connect_error", (err) => {
      expect(err.message).toBe("Authentification requise.");
      clientSocket.close();
      done();
    });

    clientSocket.on("connect", () => {
      clientSocket.close();
      done(new Error("Connection should have been rejected"));
    });
  });

  it("should accept connection when valid staff token is provided", (done) => {
    const token = jwt.sign(
      { userId: "staff-123", role: "RECEPTIONIST" },
      env.JWT_SECRET
    );

    const clientSocket = ioc(`http://localhost:${port}`, {
      transports: ["websocket"],
      auth: { token },
    });

    clientSocket.on("connect", () => {
      expect(clientSocket.connected).toBe(true);
      clientSocket.close();
      done();
    });

    clientSocket.on("connect_error", (err) => {
      clientSocket.close();
      done(err);
    });
  });
});
