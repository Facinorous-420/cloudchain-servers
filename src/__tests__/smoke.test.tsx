import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function ScaffoldProbe() {
  return <span>scaffold ok</span>;
}

describe("Phase 0 scaffold", () => {
  it("renders a component through React Testing Library", () => {
    render(<ScaffoldProbe />);
    expect(screen.getByText("scaffold ok")).toBeInTheDocument();
  });

  it("runs basic assertions", () => {
    expect(1 + 1).toBe(2);
  });
});
