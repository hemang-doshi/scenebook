import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import SettingsIntegrationsPage from "@/app/settings/integrations/page";

describe("settings integrations page", () => {
  test("settings integrations page renders disabled coming-soon cards", () => {
    render(<SettingsIntegrationsPage />);

    for (const name of ["Google Drive", "Google Calendar", "YouTube", "Instagram", "Notion"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    expect(screen.getAllByText("coming soon")).toHaveLength(5);
    expect(screen.getAllByText(/Connection management will be enabled in the Nango bridge phase/i)).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: /connection unavailable until the Nango bridge phase/i }))
      .toHaveLength(5);
  });
});
