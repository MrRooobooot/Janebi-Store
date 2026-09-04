import { EventEmitter } from "events";
import http from "http";

interface MockResponse {
  status: number;
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  header: Record<string, string>;
  text: string;
}

class TestRequest implements PromiseLike<MockResponse> {
  private _headers: Record<string, string> = { host: "localhost:3000" };
  private _body: any = undefined;
  private _query: Record<string, string> = {};

  constructor(
    private app: any,
    private method: string,
    private url: string
  ) {}

  set(key: string | Record<string, string>, val?: string): this {
    if (typeof key === "object") {
      for (const [k, v] of Object.entries(key)) {
        this._headers[k.toLowerCase()] = v;
      }
    } else if (val !== undefined) {
      this._headers[key.toLowerCase()] = val;
    }
    return this;
  }

  send(data: any): this {
    this._body = data;
    return this;
  }

  query(q: Record<string, any>): this {
    for (const [k, v] of Object.entries(q)) {
      this._query[k] = String(v);
    }
    return this;
  }

  then<TResult1 = MockResponse, TResult2 = never>(
    onfulfilled?: ((value: MockResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<MockResponse> {
    return new Promise((resolve) => {
      const [path, queryStr] = this.url.split("?");
      const queryObj: Record<string, any> = { ...this._query };
      if (queryStr) {
        new URLSearchParams(queryStr).forEach((v, k) => {
          queryObj[k] = v;
        });
      }

      const req = Object.assign(new EventEmitter(), {
        method: this.method,
        url: this.url,
        originalUrl: this.url,
        path: path,
        headers: { ...this._headers },
        body: this._body,
        query: queryObj,
        params: {},
        ip: "127.0.0.1",
        connection: { remoteAddress: "127.0.0.1", encrypted: false },
        socket: { remoteAddress: "127.0.0.1", encrypted: false },
        get(header: string) {
          return this.headers[header.toLowerCase()];
        },
        header(header: string) {
          return this.headers[header.toLowerCase()];
        }
      }) as any;

      const resHeaders: Record<string, string> = {};
      let responseBody: any = undefined;
      let rawText = "";
      let isResolved = false;

      const res = Object.assign(new EventEmitter(), {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        setHeader(k: string, v: any) {
          resHeaders[k.toLowerCase()] = String(v);
        },
        getHeader(k: string) {
          return resHeaders[k.toLowerCase()];
        },
        removeHeader(k: string) {
          delete resHeaders[k.toLowerCase()];
        },
        set(k: any, v?: any) {
          if (typeof k === "object") {
            for (const [key, val] of Object.entries(k)) {
              this.setHeader(key, val);
            }
          } else {
            this.setHeader(k, v);
          }
          return this;
        },
        header(k: any, v?: any) {
          return this.set(k, v);
        },
        json(data: any) {
          responseBody = data;
          rawText = JSON.stringify(data);
          resolveResponse();
        },
        send(data: any) {
          if (typeof data === "object" && data !== null) {
            responseBody = data;
            rawText = JSON.stringify(data);
          } else {
            rawText = String(data);
            try {
              responseBody = JSON.parse(data);
            } catch {
              responseBody = data;
            }
          }
          resolveResponse();
        },
        redirect(statusOrUrl: number | string, url?: string) {
          const redirectUrl = typeof statusOrUrl === "string" ? statusOrUrl : url || "/";
          const statusCode = typeof statusOrUrl === "number" ? statusOrUrl : 302;
          this.statusCode = statusCode;
          resHeaders["location"] = redirectUrl;
          resolveResponse();
        },
        end(data?: any) {
          if (data) {
            rawText = String(data);
          }
          resolveResponse();
        }
      }) as any;

      function resolveResponse() {
        if (isResolved) return;
        isResolved = true;
        resolve({
          status: res.statusCode,
          statusCode: res.statusCode,
          body: responseBody,
          text: rawText,
          headers: resHeaders,
          header: resHeaders,
        });
      }

      this.app(req, res, (err: any) => {
        if (err) {
          resolve({
            status: err.status || 500,
            statusCode: err.status || 500,
            body: { error: err.message || "Internal Error" },
            text: err.message || "",
            headers: resHeaders,
            header: resHeaders,
          });
        }
      });
    });
  }
}

export default function request(app: any) {
  return {
    get: (url: string) => new TestRequest(app, "GET", url),
    post: (url: string) => new TestRequest(app, "POST", url),
    put: (url: string) => new TestRequest(app, "PUT", url),
    delete: (url: string) => new TestRequest(app, "DELETE", url),
  };
}
