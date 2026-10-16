import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthShell } from "../src/components/AuthShell";
import { Layout } from "../src/components/Layout";

vi.mock("../src/context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));

describe("consistent header brand placement", () => {
  it.each([
    ["app-header", Layout],
    ["auth-header", AuthShell],
  ] as [string, ComponentType<{ children: ReactNode }>][])("uses the same container and brand markup in %s", (className, Shell) => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Shell, { children: "Page content" })));
    expect(html).toContain(`<header class="${className}"><div class="shell header-inner"><a class="brand" aria-label="Northeastern Airways home"`);
    expect(html).toContain('<img src="/img/brand-mark.png" alt="" width="42" height="42"');
    expect(html).toContain("Page content");
  });
});
