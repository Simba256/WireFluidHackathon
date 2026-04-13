export interface ApiErrorPayload {
  error: string;
  code?: string;
}

export class ApiClientError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

interface ApiFetchInit extends Omit<RequestInit, "body"> {
  json?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(
  input: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.token) {
    headers.set("authorization", `Bearer ${init.token}`);
  }

  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    body,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text.length > 0 ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object"
        ? (payload as Partial<ApiErrorPayload>)
        : null;

    throw new ApiClientError(
      errorPayload?.error ?? `Request failed with status ${response.status}`,
      response.status,
      errorPayload?.code,
    );
  }

  return payload as T;
}
