import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HEADER_ACTIONS_ID } from "../header";
import { UserSettingsButton } from "./user-settings-button";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("UserSettingsButton", () => {
  // Pinned to the page's corner, the button covered the signed-in user and
  // the sign-out button in the header. In the header's row it sits beside them.
  it("renders in the header's row when the header is on the page", () => {
    const slot = document.createElement("div");
    slot.id = HEADER_ACTIONS_ID;
    document.body.appendChild(slot);

    render(<UserSettingsButton />);

    expect(slot).toContainElement(screen.getByText("Guest"));
  });

  it("renders in place without a header", () => {
    const { container } = render(<UserSettingsButton />);

    expect(container).toContainElement(screen.getByText("Guest"));
  });
});
