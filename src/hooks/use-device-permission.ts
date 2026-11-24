import { useEffect, useState } from "react";

export type TDeviceAccessError = {
  title: string;
  text: string;
};

// getUserMedia rejects with a DOMException whose name tells why. A browser
// that never asked the user is usually missing a device rather than refusing
// one, so each cause gets its own advice instead of one "denied" message.
export const describeDeviceAccessError = (
  error: unknown
): TDeviceAccessError => {
  const name = error instanceof Error ? error.name : "";

  switch (name) {
    case "NotFoundError":
    case "OverconstrainedError":
      return {
        title: "No microphone found",
        text: "No audio input device is available. Connect a microphone, or enable it in the operating system's sound settings, and reload the page.",
      };
    case "NotAllowedError":
      return {
        title: "Permissions have been denied",
        text: "To use this application it has to be granted access to audio devices. Reload browser and/or reset permissions to try again. If the browser never asked, the operating system may block microphone access for it.",
      };
    case "NotReadableError":
    case "AbortError":
      return {
        title: "Microphone could not be opened",
        text: "The microphone is in use by another application or was blocked by the operating system. Close the other application and reload the page.",
      };
    case "SecurityError":
    case "TypeError":
      return {
        title: "Audio devices are not available",
        text: "The browser does not offer audio devices to this page. The page has to be opened over HTTPS.",
      };
    default:
      return {
        title: "Audio devices are not available",
        text: `The browser refused access to audio devices${
          name ? ` (${name})` : ""
        }. Reload the page to try again.`,
      };
  }
};

export const useDevicePermissions = ({
  continueToApp,
}: {
  continueToApp: boolean;
}) => {
  const [permission, setPermission] = useState(false);
  const [error, setError] = useState<TDeviceAccessError | null>(null);

  useEffect(() => {
    if (!continueToApp) return;

    // navigator.mediaDevices is undefined outside a secure context, and the
    // call would throw synchronously instead of rejecting.
    Promise.resolve()
      .then(() =>
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      )
      .then(() => {
        setError(null);
        setPermission(true);
      })
      .catch((e: unknown) => {
        setError(describeDeviceAccessError(e));
        setPermission(false);
      });
  }, [continueToApp]);

  return { permission, denied: error !== null, error };
};
