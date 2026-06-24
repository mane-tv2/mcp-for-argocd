export interface HttpResponse<T> {
  status: number;
  headers: Headers;
  body: T;
}

type SearchParams = Record<string, string | number | boolean | undefined | null> | null;

// A dynamic source of ArgoCD API tokens. Used for SSO, where the bearer token
// (an OIDC id token) is refreshed over time and therefore must be resolved per
// request rather than captured once.
export type TokenProvider = () => Promise<string>;

export class HttpClient {
  public readonly baseUrl: string;
  // The original token value as supplied. For the static (API-token) case this
  // is the token string; for SSO it is the dynamic provider function. Retained
  // for inspection/diagnostics — requests always resolve the token via
  // tokenProvider so refreshed SSO tokens are honoured.
  public readonly apiToken: string | TokenProvider;
  private readonly tokenProvider: TokenProvider;

  constructor(baseUrl: string, apiToken: string | TokenProvider) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.tokenProvider = typeof apiToken === 'function' ? apiToken : async () => apiToken;
  }

  // Build the request headers, resolving the (possibly refreshed) bearer token
  // at call time so SSO token rotation is picked up transparently.
  private async buildHeaders(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${await this.tokenProvider()}`,
      'Content-Type': 'application/json'
    };
  }

  private async request<R>(
    url: string,
    params?: SearchParams,
    init?: RequestInit
  ): Promise<HttpResponse<R>> {
    const urlObject = this.absUrl(url);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        urlObject.searchParams.set(key, value?.toString() || '');
      });
    }
    const headers = await this.buildHeaders();
    const response = await fetch(urlObject, {
      ...init,
      headers: { ...init?.headers, ...headers }
    });
    const body = await response.json();
    return {
      status: response.status,
      headers: response.headers,
      body: body as R
    };
  }

  private async requestStream<R>(
    url: string,
    params?: SearchParams,
    cb?: (chunk: R) => void,
    init?: RequestInit
  ) {
    const urlObject = this.absUrl(url);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        urlObject.searchParams.set(key, value?.toString() || '');
      });
    }
    const headers = await this.buildHeaders();
    const response = await fetch(urlObject, {
      ...init,
      headers: { ...init?.headers, ...headers }
    });
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('response body is not readable');
    }
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          const json = JSON.parse(line);
          cb?.(json['result']);
        }
      }
    }
  }

  absUrl(url: string): URL {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new URL(url);
    }
    return new URL(url, this.baseUrl);
  }

  async get<R>(url: string, params?: SearchParams): Promise<HttpResponse<R>> {
    const response = await this.request<R>(url, params);
    return response;
  }

  async getStream<R>(url: string, params?: SearchParams, cb?: (chunk: R) => void): Promise<void> {
    await this.requestStream<R>(url, params, cb);
  }

  async post<T, R>(url: string, params?: SearchParams, body?: T): Promise<HttpResponse<R>> {
    const response = await this.request<R>(url, params, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
    return response;
  }

  async put<T, R>(url: string, params?: SearchParams, body?: T): Promise<HttpResponse<R>> {
    const response = await this.request<R>(url, params, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
    return response;
  }

  async delete<R>(url: string, params?: SearchParams): Promise<HttpResponse<R>> {
    const response = await this.request<R>(url, params, {
      method: 'DELETE'
    });
    return response;
  }
}
