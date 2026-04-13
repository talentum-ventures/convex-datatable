import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OptionBadge } from "./option-badge";

describe("OptionBadge", () => {
  it("applies inline color styles when provided", () => {
    render(
      <OptionBadge
        option={{
          value: "owner",
          label: "Owner",
          colorStyle: {
            backgroundColor: "rgb(255, 0, 0)",
            color: "rgb(255, 255, 255)",
            borderColor: "rgb(0, 0, 0)"
          }
        }}
        isSelected={false}
        isActive={false}
      />
    );

    const badge = screen.getByText("Owner");
    expect(badge.getAttribute("style")).toContain("background-color: rgb(255, 0, 0);");
    expect(badge.getAttribute("style")).toContain("color: rgb(255, 255, 255);");
    expect(badge.getAttribute("style")).toContain("border-color: rgb(0, 0, 0);");
  });
});
