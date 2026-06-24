#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/cmd/cmd.ts
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// src/server/transport.ts
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/logging/logging.ts
import { pino } from "pino";
import { stderr } from "process";
var logger = pino(pino.destination(stderr));

// src/server/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// package.json
var package_default = {
  name: "@mane-tv2/argocd-mcp",
  version: "0.0.2",
  description: "Argo CD MCP Server",
  packageManager: "pnpm@10.34.1",
  repository: {
    type: "git",
    url: "git+https://github.com/mane-tv2/mcp-for-argocd.git"
  },
  publishConfig: {
    registry: "https://npm.pkg.github.com"
  },
  keywords: [
    "mcp",
    "argocd",
    "argocd-mcp",
    "argocd-mcp-server",
    "argo-cd",
    "argo-cd-mcp",
    "argo-cd-mcp-server",
    "cicd",
    "cicd-mcp",
    "cicd-mcp-server",
    "gitops",
    "gitops-mcp",
    "gitops-mcp-server",
    "kubernetes",
    "kubernetes-mcp",
    "kubernetes-mcp-server"
  ],
  main: "dist/index.js",
  type: "module",
  bin: {
    "argocd-mcp": "dist/index.js"
  },
  files: [
    "dist",
    "images",
    "README.md",
    "LICENSE"
  ],
  scripts: {
    dev: "tsx watch src/index.ts http",
    "dev-sse": "tsx watch src/index.ts sse",
    lint: "eslint src/**/*.ts --no-warn-ignored",
    "lint:fix": "eslint src/**/*.ts --fix",
    build: "tsup",
    "build:watch": "tsup --watch",
    test: 'node --import tsx --test "src/**/*.test.ts"',
    "generate-types": "dtsgen -c dtsgen.json -o src/types/argocd.d.ts swagger.json"
  },
  author: "Argo Proj Contributors.",
  license: "Apache-2.0",
  dependencies: {
    "@modelcontextprotocol/sdk": "^1.29.0",
    dotenv: "^16.5.0",
    express: "^5.1.0",
    pino: "^9.6.0",
    yargs: "^17.7.2",
    zod: "^3.25.0"
  },
  devDependencies: {
    "@dtsgenerator/replace-namespace": "^1.7.0",
    "@eslint/js": "^9.25.0",
    "@types/express": "^5.0.1",
    "@types/node": "^22.14.1",
    "@types/yargs": "^17.0.33",
    dtsgenerator: "^3.19.2",
    eslint: "^9.25.0",
    "eslint-config-prettier": "^10.1.2",
    "eslint-plugin-prettier": "^5.2.6",
    prettier: "3.5.3",
    tsup: "^8.4.0",
    tsx: "^4.19.3",
    typescript: "^5.8.3",
    "typescript-eslint": "^8.30.1"
  }
};

// src/argocd/http.ts
var HttpClient = class {
  constructor(baseUrl, apiToken) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.tokenProvider = typeof apiToken === "function" ? apiToken : () => __async(this, null, function* () {
      return apiToken;
    });
  }
  // Build the request headers, resolving the (possibly refreshed) bearer token
  // at call time so SSO token rotation is picked up transparently.
  buildHeaders() {
    return __async(this, null, function* () {
      return {
        Authorization: `Bearer ${yield this.tokenProvider()}`,
        "Content-Type": "application/json"
      };
    });
  }
  request(url, params, init) {
    return __async(this, null, function* () {
      const urlObject = this.absUrl(url);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          urlObject.searchParams.set(key, (value == null ? void 0 : value.toString()) || "");
        });
      }
      const headers = yield this.buildHeaders();
      const response = yield fetch(urlObject, __spreadProps(__spreadValues({}, init), {
        headers: __spreadValues(__spreadValues({}, init == null ? void 0 : init.headers), headers)
      }));
      const body = yield response.json();
      return {
        status: response.status,
        headers: response.headers,
        body
      };
    });
  }
  requestStream(url, params, cb, init) {
    return __async(this, null, function* () {
      var _a;
      const urlObject = this.absUrl(url);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          urlObject.searchParams.set(key, (value == null ? void 0 : value.toString()) || "");
        });
      }
      const headers = yield this.buildHeaders();
      const response = yield fetch(urlObject, __spreadProps(__spreadValues({}, init), {
        headers: __spreadValues(__spreadValues({}, init == null ? void 0 : init.headers), headers)
      }));
      const reader = (_a = response.body) == null ? void 0 : _a.getReader();
      if (!reader) {
        throw new Error("response body is not readable");
      }
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      while (true) {
        const { done, value } = yield reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) {
            const json = JSON.parse(line);
            cb == null ? void 0 : cb(json["result"]);
          }
        }
      }
    });
  }
  absUrl(url) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return new URL(url);
    }
    return new URL(url, this.baseUrl);
  }
  get(url, params) {
    return __async(this, null, function* () {
      const response = yield this.request(url, params);
      return response;
    });
  }
  getStream(url, params, cb) {
    return __async(this, null, function* () {
      yield this.requestStream(url, params, cb);
    });
  }
  post(url, params, body) {
    return __async(this, null, function* () {
      const response = yield this.request(url, params, {
        method: "POST",
        body: body ? JSON.stringify(body) : void 0
      });
      return response;
    });
  }
  put(url, params, body) {
    return __async(this, null, function* () {
      const response = yield this.request(url, params, {
        method: "PUT",
        body: body ? JSON.stringify(body) : void 0
      });
      return response;
    });
  }
  delete(url, params) {
    return __async(this, null, function* () {
      const response = yield this.request(url, params, {
        method: "DELETE"
      });
      return response;
    });
  }
};

// src/argocd/client.ts
var ArgoCDClient = class {
  constructor(baseUrl, apiToken) {
    this.baseUrl = baseUrl;
    this.apiToken = apiToken;
    this.client = new HttpClient(this.baseUrl, this.apiToken);
  }
  listApplications(params) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const { body } = yield this.client.get(
        `/api/v1/applications`,
        (params == null ? void 0 : params.search) ? { search: params.search } : void 0
      );
      const strippedItems = (_b = (_a = body.items) == null ? void 0 : _a.map((app) => {
        var _a2, _b2, _c2, _d2, _e, _f, _g, _h, _i, _j;
        return {
          metadata: {
            name: (_a2 = app.metadata) == null ? void 0 : _a2.name,
            namespace: (_b2 = app.metadata) == null ? void 0 : _b2.namespace,
            labels: (_c2 = app.metadata) == null ? void 0 : _c2.labels,
            creationTimestamp: (_d2 = app.metadata) == null ? void 0 : _d2.creationTimestamp
          },
          spec: {
            project: (_e = app.spec) == null ? void 0 : _e.project,
            source: (_f = app.spec) == null ? void 0 : _f.source,
            destination: (_g = app.spec) == null ? void 0 : _g.destination
          },
          status: {
            sync: (_h = app.status) == null ? void 0 : _h.sync,
            health: (_i = app.status) == null ? void 0 : _i.health,
            summary: (_j = app.status) == null ? void 0 : _j.summary
          }
        };
      })) != null ? _b : [];
      const start = (_c = params == null ? void 0 : params.offset) != null ? _c : 0;
      const end = (params == null ? void 0 : params.limit) ? start + params.limit : strippedItems.length;
      const items = strippedItems.slice(start, end);
      return {
        items,
        metadata: {
          resourceVersion: (_d = body.metadata) == null ? void 0 : _d.resourceVersion,
          totalItems: strippedItems.length,
          returnedItems: items.length,
          hasMore: end < strippedItems.length
        }
      };
    });
  }
  listClusters(params) {
    return __async(this, null, function* () {
      const queryParams = {};
      if (params == null ? void 0 : params.server) queryParams.server = params.server;
      if (params == null ? void 0 : params.name) queryParams.name = params.name;
      const { body } = yield this.client.get(
        `/api/v1/clusters`,
        Object.keys(queryParams).length > 0 ? queryParams : void 0
      );
      return body;
    });
  }
  getApplication(applicationName, appNamespace) {
    return __async(this, null, function* () {
      const queryParams = appNamespace ? { appNamespace } : void 0;
      const { body } = yield this.client.get(
        `/api/v1/applications/${applicationName}`,
        queryParams
      );
      return body;
    });
  }
  createApplication(application) {
    return __async(this, null, function* () {
      const { body } = yield this.client.post(
        `/api/v1/applications`,
        null,
        application
      );
      return body;
    });
  }
  updateApplication(applicationName, application) {
    return __async(this, null, function* () {
      const { body } = yield this.client.put(
        `/api/v1/applications/${applicationName}`,
        null,
        application
      );
      return body;
    });
  }
  deleteApplication(applicationName, options) {
    return __async(this, null, function* () {
      const queryParams = {};
      if (options == null ? void 0 : options.appNamespace) {
        queryParams.appNamespace = options.appNamespace;
      }
      if ((options == null ? void 0 : options.cascade) !== void 0) {
        queryParams.cascade = options.cascade;
      }
      if (options == null ? void 0 : options.propagationPolicy) {
        queryParams.propagationPolicy = options.propagationPolicy;
      }
      const { body } = yield this.client.delete(
        `/api/v1/applications/${applicationName}`,
        Object.keys(queryParams).length > 0 ? queryParams : void 0
      );
      return body;
    });
  }
  syncApplication(applicationName, options) {
    return __async(this, null, function* () {
      const syncRequest = {};
      if (options == null ? void 0 : options.appNamespace) {
        syncRequest.appNamespace = options.appNamespace;
      }
      if ((options == null ? void 0 : options.dryRun) !== void 0) {
        syncRequest.dryRun = options.dryRun;
      }
      if ((options == null ? void 0 : options.prune) !== void 0) {
        syncRequest.prune = options.prune;
      }
      if (options == null ? void 0 : options.revision) {
        syncRequest.revision = options.revision;
      }
      if (options == null ? void 0 : options.syncOptions) {
        syncRequest.syncOptions = options.syncOptions;
      }
      const { body } = yield this.client.post(
        `/api/v1/applications/${applicationName}/sync`,
        null,
        Object.keys(syncRequest).length > 0 ? syncRequest : void 0
      );
      return body;
    });
  }
  getApplicationResourceTree(applicationName, appNamespace) {
    return __async(this, null, function* () {
      const queryParams = appNamespace ? { appNamespace } : void 0;
      const { body } = yield this.client.get(
        `/api/v1/applications/${applicationName}/resource-tree`,
        queryParams
      );
      return body;
    });
  }
  getApplicationManagedResources(applicationName, filters) {
    return __async(this, null, function* () {
      const { body } = yield this.client.get(
        `/api/v1/applications/${applicationName}/managed-resources`,
        filters
      );
      return body;
    });
  }
  getApplicationLogs(applicationName) {
    return __async(this, null, function* () {
      const logs = [];
      yield this.client.getStream(
        `/api/v1/applications/${applicationName}/logs`,
        {
          follow: false,
          tailLines: 100
        },
        (chunk) => logs.push(chunk)
      );
      return logs;
    });
  }
  getWorkloadLogs(applicationName, applicationNamespace, resourceRef, container) {
    return __async(this, null, function* () {
      const logs = [];
      yield this.client.getStream(
        `/api/v1/applications/${applicationName}/logs`,
        {
          appNamespace: applicationNamespace,
          namespace: resourceRef.namespace,
          resourceName: resourceRef.name,
          group: resourceRef.group,
          kind: resourceRef.kind,
          version: resourceRef.version,
          follow: false,
          tailLines: 100,
          container
        },
        (chunk) => logs.push(chunk)
      );
      return logs;
    });
  }
  getPodLogs(applicationName, podName) {
    return __async(this, null, function* () {
      const logs = [];
      yield this.client.getStream(
        `/api/v1/applications/${applicationName}/pods/${podName}/logs`,
        {
          follow: false,
          tailLines: 100
        },
        (chunk) => logs.push(chunk)
      );
      return logs;
    });
  }
  getApplicationEvents(applicationName, appNamespace) {
    return __async(this, null, function* () {
      const queryParams = appNamespace ? { appNamespace } : void 0;
      const { body } = yield this.client.get(
        `/api/v1/applications/${applicationName}/events`,
        queryParams
      );
      return body;
    });
  }
  getResource(applicationName, applicationNamespace, resourceRef) {
    return __async(this, null, function* () {
      const { body } = yield this.client.get(
        `/api/v1/applications/${applicationName}/resource`,
        {
          appNamespace: applicationNamespace,
          namespace: resourceRef.namespace,
          resourceName: resourceRef.name,
          group: resourceRef.group,
          kind: resourceRef.kind,
          version: resourceRef.version
        }
      );
      return body.manifest;
    });
  }
  getResourceEvents(applicationName, applicationNamespace, resourceUID, resourceNamespace, resourceName) {
    return __async(this, null, function* () {
      const { body } = yield this.client.get(
        `/api/v1/applications/${applicationName}/events`,
        {
          appNamespace: applicationNamespace,
          resourceNamespace,
          resourceUID,
          resourceName
        }
      );
      return body;
    });
  }
  getResourceActions(applicationName, applicationNamespace, resourceRef) {
    return __async(this, null, function* () {
      const { body } = yield this.client.get(
        `/api/v1/applications/${applicationName}/resource/actions`,
        {
          appNamespace: applicationNamespace,
          namespace: resourceRef.namespace,
          resourceName: resourceRef.name,
          group: resourceRef.group,
          kind: resourceRef.kind,
          version: resourceRef.version
        }
      );
      return body;
    });
  }
  runResourceAction(applicationName, applicationNamespace, resourceRef, action) {
    return __async(this, null, function* () {
      const { body } = yield this.client.post(
        `/api/v1/applications/${applicationName}/resource/actions`,
        {
          appNamespace: applicationNamespace,
          namespace: resourceRef.namespace,
          resourceName: resourceRef.name,
          group: resourceRef.group,
          kind: resourceRef.kind,
          version: resourceRef.version
        },
        action
      );
      return body;
    });
  }
};

// src/server/server.ts
import { z as z2 } from "zod";

// src/shared/models/schema.ts
import { z } from "zod";
var ApplicationNamespaceSchema = z.string().min(1).describe(
  `The namespace where the ArgoCD application resource will be created.
     This is the namespace of the Application resource itself, not the destination namespace for the application's resources.
     You can specify any valid Kubernetes namespace (e.g., 'argocd', 'argocd-apps', 'my-namespace', etc.).
     The default ArgoCD namespace is typically 'argocd', but you can use any namespace you prefer.`
);
var ResourceRefSchema = z.object({
  uid: z.string(),
  kind: z.string(),
  namespace: z.string(),
  name: z.string(),
  version: z.string(),
  group: z.string()
});
var ApplicationSchema = z.object({
  metadata: z.object({
    name: z.string(),
    namespace: ApplicationNamespaceSchema
  }),
  spec: z.object({
    project: z.string(),
    source: z.object({
      repoURL: z.string(),
      path: z.string(),
      targetRevision: z.string()
    }),
    syncPolicy: z.object({
      syncOptions: z.array(z.string()),
      automated: z.object({
        prune: z.boolean(),
        selfHeal: z.boolean()
      }).optional(),
      retry: z.object({
        limit: z.number(),
        backoff: z.object({
          duration: z.string(),
          maxDuration: z.string(),
          factor: z.number()
        })
      })
    }),
    destination: z.object({
      server: z.string().optional(),
      namespace: z.string().optional(),
      name: z.string().optional()
    }).refine(
      (data) => !data.server && !!data.name || !!data.server && !data.name,
      {
        message: "Only one of server or name must be specified in destination"
      }
    ).describe(
      `The destination of the application.
         Only one of server or name must be specified.`
    )
  })
});

// src/server/tokenRegistry.ts
import { readFileSync } from "node:fs";
var TokenRegistry = class _TokenRegistry {
  constructor(entries = []) {
    this.tokensByBaseUrl = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if (!entry.baseUrl || !entry.token) {
        throw new Error("ArgoCD token registry entry is missing baseUrl or token");
      }
      this.tokensByBaseUrl.set(_TokenRegistry.normalize(entry.baseUrl), entry.token);
    }
  }
  // Returns the configured token for the given base URL, or undefined when the
  // base URL is not registered.
  getToken(baseUrl) {
    if (!baseUrl) return void 0;
    return this.tokensByBaseUrl.get(_TokenRegistry.normalize(baseUrl));
  }
  getSize() {
    return this.tokensByBaseUrl.size;
  }
  // Normalize a base URL for stable lookups: lowercase the scheme+host and drop
  // any trailing slashes. Falls back to a trimmed, de-slashed string when the
  // value is not a parseable URL. Public so callers can compare base URLs
  // against the registry using the exact same normalization the lookup uses.
  static normalize(baseUrl) {
    const trimmed = baseUrl.trim();
    try {
      const url = new URL(trimmed);
      const origin = url.origin.toLowerCase();
      const path = url.pathname.replace(/\/+$/, "");
      return `${origin}${path}`;
    } catch (e) {
      return trimmed.replace(/\/+$/, "");
    }
  }
};
var parseTokenRegistry = (raw) => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `ArgoCD token registry file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error("ArgoCD token registry file must contain a JSON array");
  }
  return new TokenRegistry(parsed);
};
var tokenRegistryFromEnv = (registryPath = process.env.ARGOCD_TOKEN_REGISTRY_PATH) => {
  if (!registryPath || !registryPath.trim()) {
    return new TokenRegistry();
  }
  let raw;
  try {
    raw = readFileSync(registryPath.trim(), "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read ArgoCD token registry file at "${registryPath}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const registry = parseTokenRegistry(raw);
  logger.info(
    `Loaded ArgoCD token registry from "${registryPath}" with ${registry.getSize()} entr${registry.getSize() === 1 ? "y" : "ies"}`
  );
  return registry;
};

// src/server/server.ts
var argoCDArgsSchema = {
  argocdBaseUrl: z2.string().optional().describe(
    'ArgoCD base URL to use for this call (e.g. "https://argocd.example.com"). Overrides the server default. Optional if the server is configured with a default base URL (x-argocd-base-url header or ARGOCD_BASE_URL env var); otherwise required.'
  )
};
var Server = class extends McpServer {
  constructor(serverInfo) {
    var _a, _b, _c;
    super({
      name: package_default.name,
      version: package_default.version
    });
    // Cache per-credential clients to avoid rebuilding the HttpClient on every
    // call. Keyed by baseUrl + token, since the same base URL may resolve to
    // different tokens (request token vs. registry token vs. default).
    this.clientCache = /* @__PURE__ */ new Map();
    this.defaultBaseUrl = serverInfo.argocdBaseUrl;
    this.defaultApiToken = serverInfo.argocdApiToken;
    this.tokenProvider = serverInfo.tokenProvider;
    this.tokenRegistry = (_a = serverInfo.tokenRegistry) != null ? _a : tokenRegistryFromEnv();
    this.argocdClient = new ArgoCDClient(
      serverInfo.argocdBaseUrl,
      (_b = this.tokenProvider) != null ? _b : serverInfo.argocdApiToken
    );
    const isReadOnly = String((_c = process.env.MCP_READ_ONLY) != null ? _c : "").trim().toLowerCase() === "true";
    this.addJsonOutputTool(
      "list_applications",
      "list_applications returns list of applications",
      {
        search: z2.string().optional().describe(
          'Search applications by name. This is a partial match on the application name and does not support glob patterns (e.g. "*"). Optional.'
        ),
        limit: z2.number().int().positive().optional().describe(
          "Maximum number of applications to return. Use this to reduce token usage when there are many applications. Optional."
        ),
        offset: z2.number().int().min(0).optional().describe(
          "Number of applications to skip before returning results. Use with limit for pagination. Optional."
        )
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ search, limit, offset }, client) {
        return yield client.listApplications({
          search: search != null ? search : void 0,
          limit,
          offset
        });
      })
    );
    this.addJsonOutputTool(
      "list_clusters",
      "list_clusters returns list of clusters registered with ArgoCD",
      {
        server: z2.string().optional().describe("Filter clusters by server URL. Optional."),
        name: z2.string().optional().describe("Filter clusters by name. Optional.")
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ server, name }, client) {
        return yield client.listClusters({
          server: server != null ? server : void 0,
          name: name != null ? name : void 0
        });
      })
    );
    this.addJsonOutputTool(
      "get_application",
      "get_application returns application by application name. Optionally specify the application namespace to get applications from non-default namespaces.",
      {
        applicationName: z2.string(),
        applicationNamespace: ApplicationNamespaceSchema.optional()
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace }, client) {
        return yield client.getApplication(applicationName, applicationNamespace);
      })
    );
    this.addJsonOutputTool(
      "get_application_resource_tree",
      "get_application_resource_tree returns resource tree for application by application name. Optionally specify the application namespace to get resource tree from applications in non-default namespaces.",
      {
        applicationName: z2.string(),
        applicationNamespace: ApplicationNamespaceSchema.optional().describe(
          "The namespace where the application is located. Required if application is not in the default namespace."
        )
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace }, client) {
        return yield client.getApplicationResourceTree(applicationName, applicationNamespace);
      })
    );
    this.addJsonOutputTool(
      "get_application_managed_resources",
      'get_application_managed_resources returns managed resources for application by application name with optional filtering. Use filters to avoid token limits with large applications. Examples: kind="ConfigMap" for config maps only, namespace="production" for specific namespace, or combine multiple filters.',
      {
        applicationName: z2.string(),
        kind: z2.string().optional().describe(
          'Filter by Kubernetes resource kind (e.g., "ConfigMap", "Secret", "Deployment")'
        ),
        namespace: z2.string().optional().describe("Filter by Kubernetes namespace"),
        name: z2.string().optional().describe("Filter by resource name"),
        version: z2.string().optional().describe("Filter by resource API version"),
        group: z2.string().optional().describe("Filter by API group"),
        appNamespace: z2.string().optional().describe("Filter by Argo CD application namespace"),
        project: z2.string().optional().describe("Filter by Argo CD project")
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, kind, namespace, name, version, group, appNamespace, project }, client) {
        const filters = __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, kind && { kind }), namespace && { namespace }), name && { name }), version && { version }), group && { group }), appNamespace && { appNamespace }), project && { project });
        return yield client.getApplicationManagedResources(
          applicationName,
          Object.keys(filters).length > 0 ? filters : void 0
        );
      })
    );
    this.addJsonOutputTool(
      "get_application_workload_logs",
      "get_application_workload_logs returns logs for application workload (Deployment, StatefulSet, Pod, etc.) by application name and resource ref and optionally container name",
      {
        applicationName: z2.string(),
        applicationNamespace: ApplicationNamespaceSchema,
        resourceRef: ResourceRefSchema,
        container: z2.string()
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace, resourceRef, container }, client) {
        return yield client.getWorkloadLogs(
          applicationName,
          applicationNamespace,
          resourceRef,
          container
        );
      })
    );
    this.addJsonOutputTool(
      "get_application_events",
      "get_application_events returns events for application by application name. Optionally specify the application namespace to get events from applications in non-default namespaces.",
      {
        applicationName: z2.string(),
        applicationNamespace: ApplicationNamespaceSchema.optional().describe(
          "The namespace where the application is located. Required if application is not in the default namespace."
        )
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace }, client) {
        return yield client.getApplicationEvents(applicationName, applicationNamespace);
      })
    );
    this.addJsonOutputTool(
      "get_resource_events",
      "get_resource_events returns events for a resource that is managed by an application",
      {
        applicationName: z2.string(),
        applicationNamespace: ApplicationNamespaceSchema,
        resourceUID: z2.string(),
        resourceNamespace: z2.string(),
        resourceName: z2.string()
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace, resourceUID, resourceNamespace, resourceName }, client) {
        return yield client.getResourceEvents(
          applicationName,
          applicationNamespace,
          resourceUID,
          resourceNamespace,
          resourceName
        );
      })
    );
    this.addJsonOutputTool(
      "get_resources",
      "get_resources return manifests for resources specified by resourceRefs. If resourceRefs is empty or not provided, fetches all resources managed by the application.",
      {
        applicationName: z2.string(),
        applicationNamespace: ApplicationNamespaceSchema,
        resourceRefs: ResourceRefSchema.array().optional()
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace, resourceRefs }, client) {
        var _a2;
        let refs = resourceRefs || [];
        if (refs.length === 0) {
          const tree = yield client.getApplicationResourceTree(applicationName);
          refs = ((_a2 = tree.nodes) == null ? void 0 : _a2.map((node) => ({
            uid: node.uid,
            version: node.version,
            group: node.group,
            kind: node.kind,
            name: node.name,
            namespace: node.namespace
          }))) || [];
        }
        return Promise.all(
          refs.map((ref) => client.getResource(applicationName, applicationNamespace, ref))
        );
      })
    );
    this.addJsonOutputTool(
      "get_resource_actions",
      "get_resource_actions returns actions for a resource that is managed by an application",
      {
        applicationName: z2.string(),
        applicationNamespace: ApplicationNamespaceSchema,
        resourceRef: ResourceRefSchema
      },
      (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace, resourceRef }, client) {
        return yield client.getResourceActions(
          applicationName,
          applicationNamespace,
          resourceRef
        );
      })
    );
    if (!isReadOnly) {
      this.addJsonOutputTool(
        "create_application",
        'create_application creates a new ArgoCD application in the specified namespace. The application.metadata.namespace field determines where the Application resource will be created (e.g., "argocd", "argocd-apps", or any custom namespace).',
        { application: ApplicationSchema },
        (_0, _1) => __async(this, [_0, _1], function* ({ application }, client) {
          return yield client.createApplication(application);
        })
      );
      this.addJsonOutputTool(
        "update_application",
        "update_application updates application",
        { applicationName: z2.string(), application: ApplicationSchema },
        (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, application }, client) {
          return yield client.updateApplication(applicationName, application);
        })
      );
      this.addJsonOutputTool(
        "delete_application",
        "delete_application deletes application. Specify applicationNamespace if the application is in a non-default namespace to avoid permission errors.",
        {
          applicationName: z2.string(),
          applicationNamespace: ApplicationNamespaceSchema.optional().describe(
            "The namespace where the application is located. Required if application is not in the default namespace."
          ),
          cascade: z2.boolean().optional().describe("Whether to cascade the deletion to child resources"),
          propagationPolicy: z2.string().optional().describe('Deletion propagation policy (e.g., "Foreground", "Background", "Orphan")')
        },
        (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace, cascade, propagationPolicy }, client) {
          const options = {};
          if (applicationNamespace) options.appNamespace = applicationNamespace;
          if (cascade !== void 0) options.cascade = cascade;
          if (propagationPolicy) options.propagationPolicy = propagationPolicy;
          return yield client.deleteApplication(
            applicationName,
            Object.keys(options).length > 0 ? options : void 0
          );
        })
      );
      this.addJsonOutputTool(
        "sync_application",
        "sync_application syncs application. Specify applicationNamespace if the application is in a non-default namespace to avoid permission errors.",
        {
          applicationName: z2.string(),
          applicationNamespace: ApplicationNamespaceSchema.optional().describe(
            "The namespace where the application is located. Required if application is not in the default namespace."
          ),
          dryRun: z2.boolean().optional().describe("Perform a dry run sync without applying changes"),
          prune: z2.boolean().optional().describe("Remove resources that are no longer defined in the source"),
          revision: z2.string().optional().describe("Sync to a specific revision instead of the latest"),
          syncOptions: z2.array(z2.string()).optional().describe(
            'Additional sync options (e.g., ["CreateNamespace=true", "PrunePropagationPolicy=foreground"])'
          )
        },
        (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace, dryRun, prune, revision, syncOptions }, client) {
          const options = {};
          if (applicationNamespace) options.appNamespace = applicationNamespace;
          if (dryRun !== void 0) options.dryRun = dryRun;
          if (prune !== void 0) options.prune = prune;
          if (revision) options.revision = revision;
          if (syncOptions) options.syncOptions = syncOptions;
          return yield client.syncApplication(
            applicationName,
            Object.keys(options).length > 0 ? options : void 0
          );
        })
      );
      this.addJsonOutputTool(
        "run_resource_action",
        "run_resource_action runs an action on a resource",
        {
          applicationName: z2.string(),
          applicationNamespace: ApplicationNamespaceSchema,
          resourceRef: ResourceRefSchema,
          action: z2.string()
        },
        (_0, _1) => __async(this, [_0, _1], function* ({ applicationName, applicationNamespace, resourceRef, action }, client) {
          return yield client.runResourceAction(
            applicationName,
            applicationNamespace,
            resourceRef,
            action
          );
        })
      );
    }
  }
  // Resolve the ArgoCD client to use for a single tool call. The base URL may be
  // overridden per call via the argocdBaseUrl argument; the API token is never a
  // tool argument and is resolved by the following precedence:
  //
  //   1. Request token  — the session token from the x-argocd-api-token header /
  //      ARGOCD_API_TOKEN env var. If the caller supplied one, it ALWAYS wins.
  //   2. Registry token — when no request token was supplied, look the resolved
  //      base URL up in the configured token registry (ARGOCD_TOKEN_REGISTRY)
  //      and use its token if the base URL is registered.
  //
  // This lets a single server target multiple ArgoCD instances, each with its
  // own token, without the token ever appearing in a tool-call payload: callers
  // pass only the (non-secret) base URL and the server pairs it with the token.
  resolveClient(args) {
    const baseUrl = args.argocdBaseUrl || this.defaultBaseUrl;
    if (!baseUrl) {
      throw new Error(
        "Missing required ArgoCD base URL: argocdBaseUrl. Provide it as a tool argument, or configure the server via the x-argocd-base-url header or ARGOCD_BASE_URL env var."
      );
    }
    const isDefaultBaseUrl = TokenRegistry.normalize(baseUrl) === TokenRegistry.normalize(this.defaultBaseUrl);
    if (isDefaultBaseUrl && this.tokenProvider) {
      return this.argocdClient;
    }
    const apiToken = isDefaultBaseUrl ? this.defaultApiToken || this.tokenRegistry.getToken(baseUrl) : this.tokenRegistry.getToken(baseUrl);
    if (!apiToken) {
      throw new Error(
        `Missing required ArgoCD API token for base URL "${baseUrl}". Provide it via the x-argocd-api-token header / ARGOCD_API_TOKEN env var, or register a token for this base URL in ARGOCD_TOKEN_REGISTRY.`
      );
    }
    if (baseUrl === this.defaultBaseUrl && apiToken === this.defaultApiToken) {
      return this.argocdClient;
    }
    const cacheKey = `${baseUrl}\0${apiToken}`;
    let client = this.clientCache.get(cacheKey);
    if (!client) {
      client = new ArgoCDClient(baseUrl, apiToken);
      this.clientCache.set(cacheKey, client);
    }
    return client;
  }
  addJsonOutputTool(name, description, paramsSchema, cb) {
    const mergedSchema = __spreadValues(__spreadValues({}, paramsSchema), argoCDArgsSchema);
    this.tool(name, description, mergedSchema, (...args) => __async(this, null, function* () {
      try {
        const [allArgs, extra] = args;
        const _a = allArgs, { argocdBaseUrl } = _a, toolArgs = __objRest(_a, ["argocdBaseUrl"]);
        const client = this.resolveClient({ argocdBaseUrl });
        const result = yield cb.call(
          this,
          toolArgs,
          client,
          extra
        );
        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(result) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }]
        };
      }
    }));
  }
};
var createServer = (serverInfo) => {
  return new Server(serverInfo);
};

// src/server/transport.ts
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

// src/auth/sso.ts
import { createHash, randomBytes } from "node:crypto";
import { createServer as createServer2 } from "node:http";
import { spawn } from "node:child_process";
import { URL as URL2 } from "node:url";
var DEFAULT_SSO_PORT = 8085;
var DEFAULT_SCOPES = ["openid", "profile", "email", "groups"];
var DEX_CLI_CLIENT_ID = "argo-cd-cli";
var fetchArgoCdOidcConfig = (baseUrl) => __async(void 0, null, function* () {
  var _a, _b;
  const settingsUrl = new URL2("/api/v1/settings", baseUrl).toString();
  const response = yield fetch(settingsUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ArgoCD settings from ${settingsUrl}: ${response.status} ${response.statusText}`
    );
  }
  const settings = yield response.json();
  if ((_a = settings.oidcConfig) == null ? void 0 : _a.issuer) {
    const oidc = settings.oidcConfig;
    const clientId = oidc.cliClientID || oidc.clientID;
    if (!clientId) {
      throw new Error("ArgoCD oidcConfig is missing a clientID/cliClientID");
    }
    return {
      issuer: oidc.issuer,
      clientId,
      scopes: withOfflineAccess(
        oidc.scopes && oidc.scopes.length > 0 ? oidc.scopes : DEFAULT_SCOPES
      )
    };
  }
  if (((_b = settings.dexConfig) == null ? void 0 : _b.connectors) && settings.dexConfig.connectors.length > 0) {
    return {
      issuer: new URL2("/api/dex", baseUrl).toString(),
      clientId: DEX_CLI_CLIENT_ID,
      scopes: withOfflineAccess(DEFAULT_SCOPES)
    };
  }
  throw new Error(
    `ArgoCD instance at ${baseUrl} does not have SSO (OIDC or Dex) configured. Use API-token authentication instead.`
  );
});
var discoverOidcEndpoints = (issuer) => __async(void 0, null, function* () {
  const discoveryUrl = new URL2(
    ".well-known/openid-configuration",
    issuer.endsWith("/") ? issuer : `${issuer}/`
  ).toString();
  const response = yield fetch(discoveryUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OIDC discovery document from ${discoveryUrl}: ${response.status} ${response.statusText}`
    );
  }
  const doc = yield response.json();
  if (!doc.authorization_endpoint || !doc.token_endpoint) {
    throw new Error(
      `OIDC discovery document at ${discoveryUrl} is missing authorization_endpoint or token_endpoint`
    );
  }
  return {
    authorizationEndpoint: doc.authorization_endpoint,
    tokenEndpoint: doc.token_endpoint
  };
});
var generatePkce = () => {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
};
var generateState = () => base64UrlEncode(randomBytes(32));
var performSsoLogin = (options) => __async(void 0, null, function* () {
  var _a, _b;
  const { baseUrl } = options;
  const ssoPort = (_a = options.ssoPort) != null ? _a : DEFAULT_SSO_PORT;
  const launchBrowser = (_b = options.launchBrowser) != null ? _b : true;
  const oidcConfig = yield fetchArgoCdOidcConfig(baseUrl);
  const endpoints = yield discoverOidcEndpoints(oidcConfig.issuer);
  const { verifier, challenge } = generatePkce();
  const state = generateState();
  const redirectUri = `http://localhost:${ssoPort}/auth/callback`;
  const authUrl = new URL2(endpoints.authorizationEndpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", oidcConfig.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", oidcConfig.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "offline");
  const code = yield waitForAuthorizationCode(ssoPort, state, authUrl.toString(), launchBrowser);
  return exchangeCodeForTokens({
    tokenEndpoint: endpoints.tokenEndpoint,
    clientId: oidcConfig.clientId,
    code,
    redirectUri,
    codeVerifier: verifier
  });
});
var refreshSsoTokens = (params) => __async(void 0, null, function* () {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId
  });
  const response = yield fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!response.ok) {
    throw new Error(`Failed to refresh SSO token: ${response.status} ${response.statusText}`);
  }
  return parseTokenResponse(yield response.json(), params.refreshToken);
});
var waitForAuthorizationCode = (ssoPort, expectedState, authUrl, launchBrowser) => {
  return new Promise((resolve, reject) => {
    const server = createServer2((req, res) => {
      var _a, _b;
      const requestUrl = new URL2((_a = req.url) != null ? _a : "", `http://localhost:${ssoPort}`);
      if (requestUrl.pathname !== "/auth/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const error = requestUrl.searchParams.get("error");
      if (error) {
        const description = (_b = requestUrl.searchParams.get("error_description")) != null ? _b : "";
        respondAndClose(
          res,
          400,
          `Authentication failed: ${escapeHtml(error)} ${escapeHtml(description)}`
        );
        finish(new Error(`SSO authentication failed: ${error} ${description}`.trim()));
        return;
      }
      const state = requestUrl.searchParams.get("state");
      if (state !== expectedState) {
        respondAndClose(res, 400, "Authentication failed: invalid state nonce.");
        finish(new Error("SSO authentication failed: state nonce mismatch"));
        return;
      }
      const code = requestUrl.searchParams.get("code");
      if (!code) {
        respondAndClose(res, 400, "Authentication failed: no authorization code in response.");
        finish(new Error("SSO authentication failed: no authorization code returned"));
        return;
      }
      respondAndClose(
        res,
        200,
        "Authentication successful! You can now return to your terminal. This window can be closed."
      );
      finish(null, code);
    });
    let settled = false;
    const finish = (err, code) => {
      if (settled) return;
      settled = true;
      server.close();
      if (err) reject(err);
      else resolve(code);
    };
    server.on("error", (err) => finish(err));
    server.listen(ssoPort, "localhost", () => {
      if (launchBrowser) {
        logger.info("Opening system default browser for ArgoCD SSO authentication");
        openBrowser(authUrl);
      } else {
        logger.info(`To authenticate, open the following URL in your browser:
${authUrl}`);
      }
    });
  });
};
var exchangeCodeForTokens = (params) => __async(void 0, null, function* () {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier
  });
  const response = yield fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!response.ok) {
    throw new Error(
      `Failed to exchange authorization code for tokens: ${response.status} ${response.statusText}`
    );
  }
  return parseTokenResponse(yield response.json());
});
var parseTokenResponse = (raw, fallbackRefresh = "") => {
  var _a;
  const data = raw;
  if (!data.id_token) {
    throw new Error("Token response did not contain an id_token");
  }
  const refreshToken = (_a = data.refresh_token) != null ? _a : fallbackRefresh;
  if (!refreshToken) {
    throw new Error(
      "Token response did not contain a refresh_token. Ensure the offline_access scope is permitted."
    );
  }
  return {
    idToken: data.id_token,
    refreshToken,
    expiresAt: resolveExpiry(data.id_token, data.expires_in)
  };
};
var resolveExpiry = (idToken, expiresIn) => {
  const claimExp = decodeJwtExp(idToken);
  if (claimExp !== void 0) {
    return claimExp * 1e3;
  }
  if (expiresIn !== void 0) {
    return Date.now() + expiresIn * 1e3;
  }
  return Date.now();
};
var decodeJwtExp = (jwt) => {
  const parts = jwt.split(".");
  if (parts.length !== 3) return void 0;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : void 0;
  } catch (e) {
    return void 0;
  }
};
var withOfflineAccess = (scopes) => scopes.includes("offline_access") ? scopes : [...scopes, "offline_access"];
var base64UrlEncode = (buffer) => buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
var respondAndClose = (res, status, message) => {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    `<!doctype html><html><head><meta charset="utf-8"><title>ArgoCD MCP</title></head><body style="font-family:sans-serif;text-align:center;margin-top:60px"><p>${message}</p></body></html>`
  );
};
var escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var openBrowser = (url) => {
  let command;
  let args;
  switch (process.platform) {
    case "darwin":
      command = "open";
      args = [url];
      break;
    case "win32":
      command = "cmd";
      args = ["/c", "start", "", url];
      break;
    default:
      command = "xdg-open";
      args = [url];
      break;
  }
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", (err) => {
      logger.warn(`Failed to open browser automatically: ${err.message}. URL: ${url}`);
    });
    child.unref();
  } catch (err) {
    logger.warn(
      `Failed to open browser automatically: ${err instanceof Error ? err.message : String(err)}. URL: ${url}`
    );
  }
};

// src/auth/tokenStore.ts
import { readFileSync as readFileSync2, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
var cachePath = () => {
  var _a, _b;
  const override = (_a = process.env.ARGOCD_MCP_SSO_CACHE) == null ? void 0 : _a.trim();
  if (override) return override;
  const configHome = ((_b = process.env.XDG_CONFIG_HOME) == null ? void 0 : _b.trim()) || join(homedir(), ".config");
  return join(configHome, "argocd-mcp", "sso-tokens.json");
};
var readCacheFile = () => {
  try {
    const raw = readFileSync2(cachePath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
};
var loadCachedTokens = (baseUrl) => {
  const entry = readCacheFile()[TokenRegistry.normalize(baseUrl)];
  if (!entry || !entry.idToken || !entry.refreshToken) return void 0;
  return entry;
};
var saveCachedTokens = (baseUrl, tokens) => {
  const path = cachePath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    const file = readCacheFile();
    file[TokenRegistry.normalize(baseUrl)] = tokens;
    writeFileSync(path, JSON.stringify(file, null, 2), { mode: 384 });
    chmodSync(path, 384);
  } catch (error) {
    logger.warn(
      `Failed to write ArgoCD SSO token cache at ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

// src/auth/ssoSession.ts
var REFRESH_THRESHOLD_MS = 6e4;
var SsoSession = class {
  constructor(options) {
    this.tokens = null;
    this.tokenEndpoint = "";
    this.clientId = "";
    // Serialises acquisition so concurrent calls never open two browser windows.
    this.acquireInFlight = null;
    // Return a valid id token, acquiring one interactively only if no cached or
    // refreshable token is available. Bound so it can be passed directly as a
    // token provider.
    this.getToken = () => __async(this, null, function* () {
      yield this.ensureToken(true);
      if (!this.tokens) {
        throw new Error("ArgoCD SSO login did not produce a token");
      }
      return this.tokens.idToken;
    });
    this.options = options;
  }
  // Proactively acquire a token WITHOUT opening a browser (cache + silent
  // refresh only). Safe to call once after the transport connects so the first
  // tool call is fast when a cached token exists; never triggers an interactive
  // login on its own.
  prime() {
    void this.ensureToken(false).catch((error) => {
      logger.warn(
        `ArgoCD SSO token priming failed: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  }
  // Ensure a valid token is available. When allowInteractive is false, the
  // browser login is skipped and the method returns false if no token could be
  // obtained silently.
  ensureToken(allowInteractive) {
    return __async(this, null, function* () {
      if (this.tokens && !this.isExpiring(this.tokens)) {
        return true;
      }
      if (this.acquireInFlight) {
        yield this.acquireInFlight;
        if (this.tokens && !this.isExpiring(this.tokens)) {
          return true;
        }
      }
      this.acquireInFlight = this.acquire(allowInteractive);
      try {
        return yield this.acquireInFlight;
      } finally {
        this.acquireInFlight = null;
      }
    });
  }
  acquire(allowInteractive) {
    return __async(this, null, function* () {
      var _a;
      if (!this.tokens) {
        const cached = loadCachedTokens(this.options.baseUrl);
        if (cached) {
          this.tokens = cached;
          logger.info("Loaded cached ArgoCD SSO token");
        }
      }
      if (this.tokens && !this.isExpiring(this.tokens)) {
        return true;
      }
      if ((_a = this.tokens) == null ? void 0 : _a.refreshToken) {
        try {
          yield this.resolveOidcMeta();
          yield this.refresh();
          return true;
        } catch (error) {
          logger.warn(
            `ArgoCD SSO silent refresh failed, falling back to interactive login: ${error instanceof Error ? error.message : String(error)}`
          );
          this.tokens = null;
        }
      }
      if (!allowInteractive) {
        return false;
      }
      yield this.resolveOidcMeta();
      const tokens = yield performSsoLogin(this.options);
      this.tokens = tokens;
      saveCachedTokens(this.options.baseUrl, tokens);
      logger.info("ArgoCD SSO login successful");
      return true;
    });
  }
  // Resolve and memoise the token endpoint and client id needed for refresh and
  // interactive login.
  resolveOidcMeta() {
    return __async(this, null, function* () {
      if (this.tokenEndpoint && this.clientId) return;
      const oidcConfig = yield fetchArgoCdOidcConfig(this.options.baseUrl);
      const endpoints = yield discoverOidcEndpoints(oidcConfig.issuer);
      this.tokenEndpoint = endpoints.tokenEndpoint;
      this.clientId = oidcConfig.clientId;
    });
  }
  refresh() {
    return __async(this, null, function* () {
      logger.info("Refreshing ArgoCD SSO token");
      const tokens = yield refreshSsoTokens({
        tokenEndpoint: this.tokenEndpoint,
        clientId: this.clientId,
        refreshToken: this.tokens.refreshToken
      });
      this.tokens = tokens;
      saveCachedTokens(this.options.baseUrl, tokens);
    });
  }
  isExpiring(tokens) {
    return Date.now() >= tokens.expiresAt - REFRESH_THRESHOLD_MS;
  }
};

// src/server/transport.ts
var tokenRegistry = tokenRegistryFromEnv();
var connectStdioTransport = (..._0) => __async(void 0, [..._0], function* (options = {}) {
  var _a, _b;
  const useSso = (_b = options.sso) != null ? _b : String((_a = process.env.ARGOCD_AUTH_METHOD) != null ? _a : "").toLowerCase() === "sso";
  const argocdBaseUrl = process.env.ARGOCD_BASE_URL || "";
  let tokenProvider;
  let ssoSession;
  if (useSso) {
    if (!argocdBaseUrl) {
      throw new Error("SSO login requires a base URL. Set the ARGOCD_BASE_URL env var.");
    }
    ssoSession = new SsoSession({
      baseUrl: argocdBaseUrl,
      ssoPort: options.ssoPort,
      launchBrowser: options.ssoLaunchBrowser
    });
    tokenProvider = ssoSession.getToken;
  }
  const server = createServer({
    argocdBaseUrl,
    argocdApiToken: useSso ? "" : process.env.ARGOCD_API_TOKEN || "",
    tokenProvider,
    tokenRegistry
  });
  logger.info("Connecting to stdio transport");
  yield server.connect(new StdioServerTransport());
  ssoSession == null ? void 0 : ssoSession.prime();
});
var connectSSETransport = (port) => {
  const app = express();
  const transports = {};
  app.get("/sse", (req, res) => __async(void 0, null, function* () {
    const server = createServer({
      argocdBaseUrl: req.headers["x-argocd-base-url"] || "",
      argocdApiToken: req.headers["x-argocd-api-token"] || "",
      tokenRegistry
    });
    const transport = new SSEServerTransport("/messages", res);
    transports[transport.sessionId] = transport;
    res.on("close", () => {
      delete transports[transport.sessionId];
    });
    yield server.connect(transport);
  }));
  app.post("/messages", (req, res) => __async(void 0, null, function* () {
    const sessionId = req.query.sessionId;
    const transport = transports[sessionId];
    if (transport) {
      yield transport.handlePostMessage(req, res);
    } else {
      res.status(400).send(`No transport found for sessionId: ${sessionId}`);
    }
  }));
  logger.info(`Connecting to SSE transport on port: ${port}`);
  app.listen(port);
};
var resolveCredentials = (req, res) => {
  const argocdBaseUrl = req.headers["x-argocd-base-url"] || process.env.ARGOCD_BASE_URL || "";
  const argocdApiToken = req.headers["x-argocd-api-token"] || process.env.ARGOCD_API_TOKEN || "";
  if (!argocdApiToken && tokenRegistry.getSize() === 0) {
    res.status(400).send(
      "x-argocd-api-token must be provided in the request header (or the ARGOCD_API_TOKEN env var), or a token registry must be configured via ARGOCD_TOKEN_REGISTRY_PATH."
    );
    return null;
  }
  return { argocdBaseUrl, argocdApiToken };
};
var connectHttpTransport = (port, stateless = false) => {
  const app = express();
  app.use(express.json());
  app.get("/healthz", (_, res) => {
    res.status(200).json({ status: "ok" });
  });
  const httpTransports = {};
  app.post("/mcp", (req, res) => __async(void 0, null, function* () {
    var _a;
    const sessionIdFromHeader = req.headers["mcp-session-id"];
    let transport;
    if (!stateless && sessionIdFromHeader && httpTransports[sessionIdFromHeader]) {
      transport = httpTransports[sessionIdFromHeader];
    } else if (stateless || !sessionIdFromHeader && isInitializeRequest(req.body)) {
      const credentials = resolveCredentials(req, res);
      if (!credentials) return;
      transport = new StreamableHTTPServerTransport(
        stateless ? { sessionIdGenerator: void 0 } : {
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            httpTransports[newSessionId] = transport;
          }
        }
      );
      if (!stateless) {
        transport.onclose = () => {
          if (transport.sessionId) delete httpTransports[transport.sessionId];
        };
      }
      const server = createServer(__spreadProps(__spreadValues({}, credentials), { tokenRegistry }));
      yield server.connect(transport);
    } else {
      const errorMsg = sessionIdFromHeader ? `Invalid or expired session ID: ${sessionIdFromHeader}` : "Bad Request: Not an initialization request and no valid session ID provided.";
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32e3, message: errorMsg },
        id: ((_a = req.body) == null ? void 0 : _a.id) !== void 0 ? req.body.id : null
      });
      return;
    }
    yield transport.handleRequest(req, res, req.body);
  }));
  const handleSessionRequest = (req, res) => __async(void 0, null, function* () {
    if (stateless) {
      res.status(405).send("Method Not Allowed in stateless mode");
      return;
    }
    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId || !httpTransports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    yield httpTransports[sessionId].handleRequest(req, res);
  });
  app.get("/mcp", handleSessionRequest);
  app.delete("/mcp", handleSessionRequest);
  logger.info(
    `Connecting to Http Stream transport on port: ${port}${stateless ? " (stateless mode)" : ""}`
  );
  app.listen(port);
};

// src/cmd/cmd.ts
var cmd = () => {
  const exe = yargs(hideBin(process.argv));
  exe.command(
    "stdio",
    "Start ArgoCD MCP server using stdio.",
    (yargs2) => {
      return yargs2.option("sso", {
        type: "boolean",
        default: false,
        description: "Authenticate via interactive SSO (OAuth2 PKCE), like `argocd login --sso`, instead of a static API token. Requires ARGOCD_BASE_URL."
      }).option("sso-port", {
        type: "number",
        default: DEFAULT_SSO_PORT,
        description: "Local port for the OAuth2 callback server used during SSO login."
      }).option("sso-launch-browser", {
        type: "boolean",
        default: true,
        description: "Automatically open the system default browser during SSO login. Use --no-sso-launch-browser to print the URL instead."
      });
    },
    ({ sso, ssoPort, ssoLaunchBrowser }) => connectStdioTransport({ sso, ssoPort, ssoLaunchBrowser })
  );
  exe.command(
    "sse",
    "Start ArgoCD MCP server using SSE.",
    (yargs2) => {
      return yargs2.option("port", {
        type: "number",
        default: 3e3
      });
    },
    ({ port }) => connectSSETransport(port)
  );
  exe.command(
    "http",
    "Start ArgoCD MCP server using Http Stream.",
    (yargs2) => {
      return yargs2.option("port", {
        type: "number",
        default: 3e3
      }).option("stateless", {
        type: "boolean",
        default: false,
        description: "Run in stateless mode"
      });
    },
    ({ port, stateless }) => connectHttpTransport(port, stateless)
  );
  exe.demandCommand().parseAsync();
};

// src/index.ts
import dotenv from "dotenv";
dotenv.config();
cmd();
//# sourceMappingURL=index.js.map