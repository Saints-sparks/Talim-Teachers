import "@testing-library/jest-dom";

// The API config reads the base URL at module load time.
process.env.NEXT_PUBLIC_API_BASE_URL ??= "http://api.test";

// jsdom implements neither of these; ThemeProvider and the state components need them.
if (typeof window !== "undefined") {
  // React 18 only batches updates inside act() when this is set.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

// jsdom ships no fetch primitives. Tests stub `global.fetch` themselves; this
// provides just enough of `Headers` and `Response` for the API client to parse
// what a stub hands back.
if (typeof globalThis.Headers === "undefined") {
  class TestHeaders {
    private readonly map = new Map<string, string>();

    constructor(init?: Record<string, string>) {
      for (const [key, value] of Object.entries(init ?? {})) this.map.set(key.toLowerCase(), value);
    }

    get(name: string): string | null {
      return this.map.get(name.toLowerCase()) ?? null;
    }

    set(name: string, value: string): void {
      this.map.set(name.toLowerCase(), value);
    }

    has(name: string): boolean {
      return this.map.has(name.toLowerCase());
    }
  }
  (globalThis as unknown as { Headers: unknown }).Headers = TestHeaders;
}

if (typeof globalThis.Response === "undefined") {
  class TestResponse {
    readonly status: number;
    readonly ok: boolean;
    readonly headers: Headers;
    private readonly bodyText: string;

    constructor(body?: string | null, init?: { status?: number; headers?: Record<string, string> }) {
      this.bodyText = body ?? "";
      this.status = init?.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new Headers(init?.headers);
    }

    async text(): Promise<string> {
      return this.bodyText;
    }

    async json(): Promise<unknown> {
      return JSON.parse(this.bodyText);
    }

    async blob(): Promise<Blob> {
      return new Blob([this.bodyText]);
    }
  }
  (globalThis as unknown as { Response: unknown }).Response = TestResponse;
}
