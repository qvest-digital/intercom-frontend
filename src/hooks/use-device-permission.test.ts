import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  describeDeviceAccessError,
  useDevicePermissions,
} from "./use-device-permission";

const domError = (name: string) => new DOMException("rejected", name);

const stubGetUserMedia = (impl: () => Promise<MediaStream>) => {
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: { getUserMedia: vi.fn(impl) },
  });
};

describe("describeDeviceAccessError", () => {
  // A machine without an input device rejects without ever prompting; telling
  // that user to reset permissions sends them looking in the wrong place.
  it("reports a missing microphone, not a denied permission", () => {
    expect(describeDeviceAccessError(domError("NotFoundError")).title).toBe(
      "No microphone found"
    );
  });

  it("keeps the permission advice for a refused permission", () => {
    expect(describeDeviceAccessError(domError("NotAllowedError")).title).toBe(
      "Permissions have been denied"
    );
  });

  it("reports a microphone held by another application", () => {
    expect(describeDeviceAccessError(domError("NotReadableError")).title).toBe(
      "Microphone could not be opened"
    );
  });

  it("names an unknown error so it can be looked up", () => {
    expect(describeDeviceAccessError(domError("WeirdError")).text).toContain(
      "WeirdError"
    );
  });
});

describe("useDevicePermissions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes the cause when getUserMedia rejects", async () => {
    stubGetUserMedia(() => Promise.reject(domError("NotFoundError")));

    const { result } = renderHook(() =>
      useDevicePermissions({ continueToApp: true })
    );

    await waitFor(() => expect(result.current.denied).toBe(true));
    expect(result.current.permission).toBe(false);
    expect(result.current.error?.title).toBe("No microphone found");
  });

  // Outside a secure context navigator.mediaDevices is undefined, so the call
  // throws rather than rejects; that must still end in a message.
  it("reports unavailable audio devices when mediaDevices is missing", async () => {
    vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });

    const { result } = renderHook(() =>
      useDevicePermissions({ continueToApp: true })
    );

    await waitFor(() => expect(result.current.denied).toBe(true));
    expect(result.current.error?.title).toBe("Audio devices are not available");
  });

  it("grants permission when getUserMedia resolves", async () => {
    stubGetUserMedia(() => Promise.resolve({} as MediaStream));

    const { result } = renderHook(() =>
      useDevicePermissions({ continueToApp: true })
    );

    await waitFor(() => expect(result.current.permission).toBe(true));
    expect(result.current.error).toBeNull();
  });
});
