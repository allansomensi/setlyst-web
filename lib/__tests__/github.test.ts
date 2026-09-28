import { afterEach, describe, expect, it, vi } from "vitest";
import { getGitHubAvatarUrl } from "@/lib/github";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getGitHubAvatarUrl", () => {
  it("reads the avatar from the account's GitHub profile", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            login: "allansomensi",
            avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getGitHubAvatarUrl("allansomensi")).resolves.toBe(
      "https://avatars.githubusercontent.com/u/1?v=4",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/users/allansomensi",
      expect.anything(),
    );
  });

  it("is null when GitHub fails or answers without an avatar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 403 })),
    );
    await expect(getGitHubAvatarUrl("allansomensi")).resolves.toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ avatar_url: 42 }))),
    );
    await expect(getGitHubAvatarUrl("allansomensi")).resolves.toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network");
      }),
    );
    await expect(getGitHubAvatarUrl("allansomensi")).resolves.toBeNull();
  });
});
