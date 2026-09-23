import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RETRIES,
  MAX_RETRY_WAIT_MS,
  statusRetryDelayMs,
} from "@/lib/api-retry";

vi.mock("server-only", () => ({}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "pt-BR" }));
vi.mock("@/lib/server/api-token", () => ({ getApiToken: async () => "t" }));
vi.mock("@/lib/server/internal-api", () => ({
  getInternalApiHeaders: async () => ({}),
}));

describe("statusRetryDelayMs", () => {
  it("never retries non-idempotent methods, even on 429", () => {
    for (const method of ["POST", "PATCH", "post"]) {
      expect(statusRetryDelayMs(method, 429, null, 1)).toBeNull();
      expect(statusRetryDelayMs(method, 503, "1", 1)).toBeNull();
    }
  });

  it("retries idempotent methods on transient statuses only", () => {
    expect(statusRetryDelayMs("GET", 429, null, 1)).toBe(300);
    expect(statusRetryDelayMs(undefined, 502, null, 2)).toBe(600);
    expect(statusRetryDelayMs("DELETE", 503, null, 1)).toBe(300);
    expect(statusRetryDelayMs("GET", 500, null, 1)).toBeNull();
    expect(statusRetryDelayMs("GET", 404, null, 1)).toBeNull();
    expect(statusRetryDelayMs("GET", 429, null, MAX_RETRIES + 1)).toBeNull();
  });

  it("honours a short Retry-After and gives up on a long one", () => {
    expect(statusRetryDelayMs("GET", 429, "2", 1)).toBe(2000);
    expect(statusRetryDelayMs("GET", 503, "0", 1)).toBe(0);
    expect(
      statusRetryDelayMs("GET", 429, String(MAX_RETRY_WAIT_MS / 1000 + 1), 1),
    ).toBeNull();
    // A 15 minute lockout is surfaced, not waited for.
    expect(statusRetryDelayMs("GET", 429, "900", 1)).toBeNull();
  });
});

describe("fetchServerApi retries", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.API_URL = "http://api.test";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const reply = (status: number, body: unknown, headers = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    });

  it("does not resend a POST answered with a business-rule 429", async () => {
    const { fetchServerApi, ApiError } = await import("@/lib/api-server");
    fetchMock.mockResolvedValue(
      reply(
        429,
        {
          code: "TOO_MANY_ATTEMPTS",
          message: "Too many attempts.",
          meta: { retry_after_seconds: 60 },
        },
        { "retry-after": "60" },
      ),
    );
    const error = await fetchServerApi("/users/me/email/verification", {
      method: "POST",
    }).catch((e: unknown) => e);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).code).toBe(
      "TOO_MANY_ATTEMPTS",
    );
    expect((error as InstanceType<typeof ApiError>).retryAfterMs).toBe(60_000);
  });

  it("retries a GET after the server's Retry-After", async () => {
    const { fetchServerApi } = await import("@/lib/api-server");
    fetchMock
      .mockResolvedValueOnce(
        reply(503, { code: "SERVICE_BUSY" }, { "retry-after": "0" }),
      )
      .mockResolvedValueOnce(reply(200, { ok: true }));
    await expect(fetchServerApi("/status")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not hold a GET for a long Retry-After", async () => {
    const { fetchServerApi } = await import("@/lib/api-server");
    fetchMock.mockResolvedValue(
      reply(429, { code: "ACCOUNT_LOCKED" }, { "retry-after": "900" }),
    );
    await expect(fetchServerApi("/users/me")).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 900_000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
