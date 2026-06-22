import request from "supertest";
import app from "../src/app";

describe("GET /api/health", () => {
  it("should return 200 ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("service", "backend");
  });
});
