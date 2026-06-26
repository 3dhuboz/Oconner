var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except2, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except2)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/compose.js
var compose;
var init_compose = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/compose.js"() {
    compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
      return (context, next) => {
        let index = -1;
        return dispatch(0);
        async function dispatch(i) {
          if (i <= index) {
            throw new Error("next() called multiple times");
          }
          index = i;
          let res;
          let isError = false;
          let handler;
          if (middleware[i]) {
            handler = middleware[i][0][0];
            context.req.routeIndex = i;
          } else {
            handler = i === middleware.length && next || void 0;
          }
          if (handler) {
            try {
              res = await handler(context, () => dispatch(i + 1));
            } catch (err) {
              if (err instanceof Error && onError) {
                context.error = err;
                res = await onError(err, context);
                isError = true;
              } else {
                throw err;
              }
            }
          } else {
            if (context.finalized === false && onNotFound) {
              res = await onNotFound(context);
            }
          }
          if (res && (context.finalized === false || isError)) {
            context.res = res;
          }
          return context;
        }
        __name(dispatch, "dispatch");
      };
    }, "compose");
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/http-exception.js
var init_http_exception = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/http-exception.js"() {
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT;
var init_constants = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/request/constants.js"() {
    GET_MATCH_RESULT = /* @__PURE__ */ Symbol();
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/utils/body.js
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var parseBody, handleParsingAllValues, handleParsingNestedValues;
var init_body = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/utils/body.js"() {
    init_request();
    parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
      const { all = false, dot = false } = options;
      const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
      const contentType = headers.get("Content-Type");
      if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
        return parseFormData(request, { all, dot });
      }
      return {};
    }, "parseBody");
    __name(parseFormData, "parseFormData");
    __name(convertFormDataToBodyData, "convertFormDataToBodyData");
    handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
      if (form[key] !== void 0) {
        if (Array.isArray(form[key])) {
          ;
          form[key].push(value);
        } else {
          form[key] = [form[key], value];
        }
      } else {
        if (!key.endsWith("[]")) {
          form[key] = value;
        } else {
          form[key] = [value];
        }
      }
    }, "handleParsingAllValues");
    handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
      if (/(?:^|\.)__proto__\./.test(key)) {
        return;
      }
      let nestedForm = form;
      const keys = key.split(".");
      keys.forEach((key2, index) => {
        if (index === keys.length - 1) {
          nestedForm[key2] = value;
        } else {
          if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
            nestedForm[key2] = /* @__PURE__ */ Object.create(null);
          }
          nestedForm = nestedForm[key2];
        }
      });
    }, "handleParsingNestedValues");
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/utils/url.js
var splitPath, splitRoutingPath, extractGroupsFromPath, replaceGroupMarks, patternCache, getPattern, tryDecode, tryDecodeURI, getPath, getPathNoStrict, mergePath, checkOptionalParameter, _decodeURI, _getQueryParam, getQueryParam, getQueryParams, decodeURIComponent_;
var init_url = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/utils/url.js"() {
    splitPath = /* @__PURE__ */ __name((path) => {
      const paths = path.split("/");
      if (paths[0] === "") {
        paths.shift();
      }
      return paths;
    }, "splitPath");
    splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
      const { groups, path } = extractGroupsFromPath(routePath);
      const paths = splitPath(path);
      return replaceGroupMarks(paths, groups);
    }, "splitRoutingPath");
    extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
      const groups = [];
      path = path.replace(/\{[^}]+\}/g, (match3, index) => {
        const mark = `@${index}`;
        groups.push([mark, match3]);
        return mark;
      });
      return { groups, path };
    }, "extractGroupsFromPath");
    replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
      for (let i = groups.length - 1; i >= 0; i--) {
        const [mark] = groups[i];
        for (let j = paths.length - 1; j >= 0; j--) {
          if (paths[j].includes(mark)) {
            paths[j] = paths[j].replace(mark, groups[i][1]);
            break;
          }
        }
      }
      return paths;
    }, "replaceGroupMarks");
    patternCache = {};
    getPattern = /* @__PURE__ */ __name((label, next) => {
      if (label === "*") {
        return "*";
      }
      const match3 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      if (match3) {
        const cacheKey = `${label}#${next}`;
        if (!patternCache[cacheKey]) {
          if (match3[2]) {
            patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match3[1], new RegExp(`^${match3[2]}(?=/${next})`)] : [label, match3[1], new RegExp(`^${match3[2]}$`)];
          } else {
            patternCache[cacheKey] = [label, match3[1], true];
          }
        }
        return patternCache[cacheKey];
      }
      return null;
    }, "getPattern");
    tryDecode = /* @__PURE__ */ __name((str, decoder) => {
      try {
        return decoder(str);
      } catch {
        return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match3) => {
          try {
            return decoder(match3);
          } catch {
            return match3;
          }
        });
      }
    }, "tryDecode");
    tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
    getPath = /* @__PURE__ */ __name((request) => {
      const url = request.url;
      const start = url.indexOf("/", url.indexOf(":") + 4);
      let i = start;
      for (; i < url.length; i++) {
        const charCode = url.charCodeAt(i);
        if (charCode === 37) {
          const queryIndex = url.indexOf("?", i);
          const hashIndex = url.indexOf("#", i);
          const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
          const path = url.slice(start, end);
          return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
        } else if (charCode === 63 || charCode === 35) {
          break;
        }
      }
      return url.slice(start, i);
    }, "getPath");
    getPathNoStrict = /* @__PURE__ */ __name((request) => {
      const result = getPath(request);
      return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
    }, "getPathNoStrict");
    mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
      if (rest.length) {
        sub = mergePath(sub, ...rest);
      }
      return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
    }, "mergePath");
    checkOptionalParameter = /* @__PURE__ */ __name((path) => {
      if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
        return null;
      }
      const segments = path.split("/");
      const results = [];
      let basePath = "";
      segments.forEach((segment) => {
        if (segment !== "" && !/\:/.test(segment)) {
          basePath += "/" + segment;
        } else if (/\:/.test(segment)) {
          if (/\?/.test(segment)) {
            if (results.length === 0 && basePath === "") {
              results.push("/");
            } else {
              results.push(basePath);
            }
            const optionalSegment = segment.replace("?", "");
            basePath += "/" + optionalSegment;
            results.push(basePath);
          } else {
            basePath += "/" + segment;
          }
        }
      });
      return results.filter((v, i, a) => a.indexOf(v) === i);
    }, "checkOptionalParameter");
    _decodeURI = /* @__PURE__ */ __name((value) => {
      if (!/[%+]/.test(value)) {
        return value;
      }
      if (value.indexOf("+") !== -1) {
        value = value.replace(/\+/g, " ");
      }
      return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
    }, "_decodeURI");
    _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
      let encoded;
      if (!multiple && key && !/[%+]/.test(key)) {
        let keyIndex2 = url.indexOf("?", 8);
        if (keyIndex2 === -1) {
          return void 0;
        }
        if (!url.startsWith(key, keyIndex2 + 1)) {
          keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
        }
        while (keyIndex2 !== -1) {
          const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
          if (trailingKeyCode === 61) {
            const valueIndex = keyIndex2 + key.length + 2;
            const endIndex = url.indexOf("&", valueIndex);
            return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
          } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
            return "";
          }
          keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
        }
        encoded = /[%+]/.test(url);
        if (!encoded) {
          return void 0;
        }
      }
      const results = {};
      encoded ??= /[%+]/.test(url);
      let keyIndex = url.indexOf("?", 8);
      while (keyIndex !== -1) {
        const nextKeyIndex = url.indexOf("&", keyIndex + 1);
        let valueIndex = url.indexOf("=", keyIndex);
        if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
          valueIndex = -1;
        }
        let name2 = url.slice(
          keyIndex + 1,
          valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
        );
        if (encoded) {
          name2 = _decodeURI(name2);
        }
        keyIndex = nextKeyIndex;
        if (name2 === "") {
          continue;
        }
        let value;
        if (valueIndex === -1) {
          value = "";
        } else {
          value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
          if (encoded) {
            value = _decodeURI(value);
          }
        }
        if (multiple) {
          if (!(results[name2] && Array.isArray(results[name2]))) {
            results[name2] = [];
          }
          ;
          results[name2].push(value);
        } else {
          results[name2] ??= value;
        }
      }
      return key ? results[key] : results;
    }, "_getQueryParam");
    getQueryParam = _getQueryParam;
    getQueryParams = /* @__PURE__ */ __name((url, key) => {
      return _getQueryParam(url, key, true);
    }, "getQueryParams");
    decodeURIComponent_ = decodeURIComponent;
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/request.js
var tryDecodeURIComponent, HonoRequest;
var init_request = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/request.js"() {
    init_http_exception();
    init_constants();
    init_body();
    init_url();
    tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
    HonoRequest = class {
      static {
        __name(this, "HonoRequest");
      }
      /**
       * `.raw` can get the raw Request object.
       *
       * @see {@link https://hono.dev/docs/api/request#raw}
       *
       * @example
       * ```ts
       * // For Cloudflare Workers
       * app.post('/', async (c) => {
       *   const metadata = c.req.raw.cf?.hostMetadata?
       *   ...
       * })
       * ```
       */
      raw;
      #validatedData;
      // Short name of validatedData
      #matchResult;
      routeIndex = 0;
      /**
       * `.path` can get the pathname of the request.
       *
       * @see {@link https://hono.dev/docs/api/request#path}
       *
       * @example
       * ```ts
       * app.get('/about/me', (c) => {
       *   const pathname = c.req.path // `/about/me`
       * })
       * ```
       */
      path;
      bodyCache = {};
      constructor(request, path = "/", matchResult = [[]]) {
        this.raw = request;
        this.path = path;
        this.#matchResult = matchResult;
        this.#validatedData = {};
      }
      param(key) {
        return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
      }
      #getDecodedParam(key) {
        const paramKey = this.#matchResult[0][this.routeIndex][1][key];
        const param2 = this.#getParamValue(paramKey);
        return param2 && /\%/.test(param2) ? tryDecodeURIComponent(param2) : param2;
      }
      #getAllDecodedParams() {
        const decoded = {};
        const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
        for (const key of keys) {
          const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
          if (value !== void 0) {
            decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
          }
        }
        return decoded;
      }
      #getParamValue(paramKey) {
        return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
      }
      query(key) {
        return getQueryParam(this.url, key);
      }
      queries(key) {
        return getQueryParams(this.url, key);
      }
      header(name2) {
        if (name2) {
          return this.raw.headers.get(name2) ?? void 0;
        }
        const headerData = {};
        this.raw.headers.forEach((value, key) => {
          headerData[key] = value;
        });
        return headerData;
      }
      async parseBody(options) {
        return this.bodyCache.parsedBody ??= await parseBody(this, options);
      }
      #cachedBody = /* @__PURE__ */ __name((key) => {
        const { bodyCache, raw: raw2 } = this;
        const cachedBody = bodyCache[key];
        if (cachedBody) {
          return cachedBody;
        }
        const anyCachedKey = Object.keys(bodyCache)[0];
        if (anyCachedKey) {
          return bodyCache[anyCachedKey].then((body) => {
            if (anyCachedKey === "json") {
              body = JSON.stringify(body);
            }
            return new Response(body)[key]();
          });
        }
        return bodyCache[key] = raw2[key]();
      }, "#cachedBody");
      /**
       * `.json()` can parse Request body of type `application/json`
       *
       * @see {@link https://hono.dev/docs/api/request#json}
       *
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.json()
       * })
       * ```
       */
      json() {
        return this.#cachedBody("text").then((text2) => JSON.parse(text2));
      }
      /**
       * `.text()` can parse Request body of type `text/plain`
       *
       * @see {@link https://hono.dev/docs/api/request#text}
       *
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.text()
       * })
       * ```
       */
      text() {
        return this.#cachedBody("text");
      }
      /**
       * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
       *
       * @see {@link https://hono.dev/docs/api/request#arraybuffer}
       *
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.arrayBuffer()
       * })
       * ```
       */
      arrayBuffer() {
        return this.#cachedBody("arrayBuffer");
      }
      /**
       * Parses the request body as a `Blob`.
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.blob();
       * });
       * ```
       * @see https://hono.dev/docs/api/request#blob
       */
      blob() {
        return this.#cachedBody("blob");
      }
      /**
       * Parses the request body as `FormData`.
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.formData();
       * });
       * ```
       * @see https://hono.dev/docs/api/request#formdata
       */
      formData() {
        return this.#cachedBody("formData");
      }
      /**
       * Adds validated data to the request.
       *
       * @param target - The target of the validation.
       * @param data - The validated data to add.
       */
      addValidatedData(target, data) {
        this.#validatedData[target] = data;
      }
      valid(target) {
        return this.#validatedData[target];
      }
      /**
       * `.url()` can get the request url strings.
       *
       * @see {@link https://hono.dev/docs/api/request#url}
       *
       * @example
       * ```ts
       * app.get('/about/me', (c) => {
       *   const url = c.req.url // `http://localhost:8787/about/me`
       *   ...
       * })
       * ```
       */
      get url() {
        return this.raw.url;
      }
      /**
       * `.method()` can get the method name of the request.
       *
       * @see {@link https://hono.dev/docs/api/request#method}
       *
       * @example
       * ```ts
       * app.get('/about/me', (c) => {
       *   const method = c.req.method // `GET`
       * })
       * ```
       */
      get method() {
        return this.raw.method;
      }
      get [GET_MATCH_RESULT]() {
        return this.#matchResult;
      }
      /**
       * `.matchedRoutes()` can return a matched route in the handler
       *
       * @deprecated
       *
       * Use matchedRoutes helper defined in "hono/route" instead.
       *
       * @see {@link https://hono.dev/docs/api/request#matchedroutes}
       *
       * @example
       * ```ts
       * app.use('*', async function logger(c, next) {
       *   await next()
       *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
       *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
       *     console.log(
       *       method,
       *       ' ',
       *       path,
       *       ' '.repeat(Math.max(10 - path.length, 0)),
       *       name,
       *       i === c.req.routeIndex ? '<- respond from here' : ''
       *     )
       *   })
       * })
       * ```
       */
      get matchedRoutes() {
        return this.#matchResult[0].map(([[, route]]) => route);
      }
      /**
       * `routePath()` can retrieve the path registered within the handler
       *
       * @deprecated
       *
       * Use routePath helper defined in "hono/route" instead.
       *
       * @see {@link https://hono.dev/docs/api/request#routepath}
       *
       * @example
       * ```ts
       * app.get('/posts/:id', (c) => {
       *   return c.json({ path: c.req.routePath })
       * })
       * ```
       */
      get routePath() {
        return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase, raw, resolveCallback;
var init_html = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/utils/html.js"() {
    HtmlEscapedCallbackPhase = {
      Stringify: 1,
      BeforeStream: 2,
      Stream: 3
    };
    raw = /* @__PURE__ */ __name((value, callbacks) => {
      const escapedString = new String(value);
      escapedString.isEscaped = true;
      escapedString.callbacks = callbacks;
      return escapedString;
    }, "raw");
    resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
      if (typeof str === "object" && !(str instanceof String)) {
        if (!(str instanceof Promise)) {
          str = str.toString();
        }
        if (str instanceof Promise) {
          str = await str;
        }
      }
      const callbacks = str.callbacks;
      if (!callbacks?.length) {
        return Promise.resolve(str);
      }
      if (buffer) {
        buffer[0] += str;
      } else {
        buffer = [str];
      }
      const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
        (res) => Promise.all(
          res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
        ).then(() => buffer[0])
      );
      if (preserveCallbacks) {
        return raw(await resStr, callbacks);
      } else {
        return resStr;
      }
    }, "resolveCallback");
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/context.js
var TEXT_PLAIN, setDefaultContentType, createResponseInstance, Context;
var init_context = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/context.js"() {
    init_request();
    init_html();
    TEXT_PLAIN = "text/plain; charset=UTF-8";
    setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
      return {
        "Content-Type": contentType,
        ...headers
      };
    }, "setDefaultContentType");
    createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
    Context = class {
      static {
        __name(this, "Context");
      }
      #rawRequest;
      #req;
      /**
       * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
       *
       * @see {@link https://hono.dev/docs/api/context#env}
       *
       * @example
       * ```ts
       * // Environment object for Cloudflare Workers
       * app.get('*', async c => {
       *   const counter = c.env.COUNTER
       * })
       * ```
       */
      env = {};
      #var;
      finalized = false;
      /**
       * `.error` can get the error object from the middleware if the Handler throws an error.
       *
       * @see {@link https://hono.dev/docs/api/context#error}
       *
       * @example
       * ```ts
       * app.use('*', async (c, next) => {
       *   await next()
       *   if (c.error) {
       *     // do something...
       *   }
       * })
       * ```
       */
      error;
      #status;
      #executionCtx;
      #res;
      #layout;
      #renderer;
      #notFoundHandler;
      #preparedHeaders;
      #matchResult;
      #path;
      /**
       * Creates an instance of the Context class.
       *
       * @param req - The Request object.
       * @param options - Optional configuration options for the context.
       */
      constructor(req, options) {
        this.#rawRequest = req;
        if (options) {
          this.#executionCtx = options.executionCtx;
          this.env = options.env;
          this.#notFoundHandler = options.notFoundHandler;
          this.#path = options.path;
          this.#matchResult = options.matchResult;
        }
      }
      /**
       * `.req` is the instance of {@link HonoRequest}.
       */
      get req() {
        this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
        return this.#req;
      }
      /**
       * @see {@link https://hono.dev/docs/api/context#event}
       * The FetchEvent associated with the current request.
       *
       * @throws Will throw an error if the context does not have a FetchEvent.
       */
      get event() {
        if (this.#executionCtx && "respondWith" in this.#executionCtx) {
          return this.#executionCtx;
        } else {
          throw Error("This context has no FetchEvent");
        }
      }
      /**
       * @see {@link https://hono.dev/docs/api/context#executionctx}
       * The ExecutionContext associated with the current request.
       *
       * @throws Will throw an error if the context does not have an ExecutionContext.
       */
      get executionCtx() {
        if (this.#executionCtx) {
          return this.#executionCtx;
        } else {
          throw Error("This context has no ExecutionContext");
        }
      }
      /**
       * @see {@link https://hono.dev/docs/api/context#res}
       * The Response object for the current request.
       */
      get res() {
        return this.#res ||= createResponseInstance(null, {
          headers: this.#preparedHeaders ??= new Headers()
        });
      }
      /**
       * Sets the Response object for the current request.
       *
       * @param _res - The Response object to set.
       */
      set res(_res) {
        if (this.#res && _res) {
          _res = createResponseInstance(_res.body, _res);
          for (const [k, v] of this.#res.headers.entries()) {
            if (k === "content-type") {
              continue;
            }
            if (k === "set-cookie") {
              const cookies = this.#res.headers.getSetCookie();
              _res.headers.delete("set-cookie");
              for (const cookie of cookies) {
                _res.headers.append("set-cookie", cookie);
              }
            } else {
              _res.headers.set(k, v);
            }
          }
        }
        this.#res = _res;
        this.finalized = true;
      }
      /**
       * `.render()` can create a response within a layout.
       *
       * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
       *
       * @example
       * ```ts
       * app.get('/', (c) => {
       *   return c.render('Hello!')
       * })
       * ```
       */
      render = /* @__PURE__ */ __name((...args) => {
        this.#renderer ??= (content) => this.html(content);
        return this.#renderer(...args);
      }, "render");
      /**
       * Sets the layout for the response.
       *
       * @param layout - The layout to set.
       * @returns The layout function.
       */
      setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
      /**
       * Gets the current layout for the response.
       *
       * @returns The current layout function.
       */
      getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
      /**
       * `.setRenderer()` can set the layout in the custom middleware.
       *
       * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
       *
       * @example
       * ```tsx
       * app.use('*', async (c, next) => {
       *   c.setRenderer((content) => {
       *     return c.html(
       *       <html>
       *         <body>
       *           <p>{content}</p>
       *         </body>
       *       </html>
       *     )
       *   })
       *   await next()
       * })
       * ```
       */
      setRenderer = /* @__PURE__ */ __name((renderer) => {
        this.#renderer = renderer;
      }, "setRenderer");
      /**
       * `.header()` can set headers.
       *
       * @see {@link https://hono.dev/docs/api/context#header}
       *
       * @example
       * ```ts
       * app.get('/welcome', (c) => {
       *   // Set headers
       *   c.header('X-Message', 'Hello!')
       *   c.header('Content-Type', 'text/plain')
       *
       *   return c.body('Thank you for coming')
       * })
       * ```
       */
      header = /* @__PURE__ */ __name((name2, value, options) => {
        if (this.finalized) {
          this.#res = createResponseInstance(this.#res.body, this.#res);
        }
        const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
        if (value === void 0) {
          headers.delete(name2);
        } else if (options?.append) {
          headers.append(name2, value);
        } else {
          headers.set(name2, value);
        }
      }, "header");
      status = /* @__PURE__ */ __name((status) => {
        this.#status = status;
      }, "status");
      /**
       * `.set()` can set the value specified by the key.
       *
       * @see {@link https://hono.dev/docs/api/context#set-get}
       *
       * @example
       * ```ts
       * app.use('*', async (c, next) => {
       *   c.set('message', 'Hono is hot!!')
       *   await next()
       * })
       * ```
       */
      set = /* @__PURE__ */ __name((key, value) => {
        this.#var ??= /* @__PURE__ */ new Map();
        this.#var.set(key, value);
      }, "set");
      /**
       * `.get()` can use the value specified by the key.
       *
       * @see {@link https://hono.dev/docs/api/context#set-get}
       *
       * @example
       * ```ts
       * app.get('/', (c) => {
       *   const message = c.get('message')
       *   return c.text(`The message is "${message}"`)
       * })
       * ```
       */
      get = /* @__PURE__ */ __name((key) => {
        return this.#var ? this.#var.get(key) : void 0;
      }, "get");
      /**
       * `.var` can access the value of a variable.
       *
       * @see {@link https://hono.dev/docs/api/context#var}
       *
       * @example
       * ```ts
       * const result = c.var.client.oneMethod()
       * ```
       */
      // c.var.propName is a read-only
      get var() {
        if (!this.#var) {
          return {};
        }
        return Object.fromEntries(this.#var);
      }
      #newResponse(data, arg, headers) {
        const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
        if (typeof arg === "object" && "headers" in arg) {
          const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
          for (const [key, value] of argHeaders) {
            if (key.toLowerCase() === "set-cookie") {
              responseHeaders.append(key, value);
            } else {
              responseHeaders.set(key, value);
            }
          }
        }
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            if (typeof v === "string") {
              responseHeaders.set(k, v);
            } else {
              responseHeaders.delete(k);
              for (const v2 of v) {
                responseHeaders.append(k, v2);
              }
            }
          }
        }
        const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
        return createResponseInstance(data, { status, headers: responseHeaders });
      }
      newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
      /**
       * `.body()` can return the HTTP response.
       * You can set headers with `.header()` and set HTTP status code with `.status`.
       * This can also be set in `.text()`, `.json()` and so on.
       *
       * @see {@link https://hono.dev/docs/api/context#body}
       *
       * @example
       * ```ts
       * app.get('/welcome', (c) => {
       *   // Set headers
       *   c.header('X-Message', 'Hello!')
       *   c.header('Content-Type', 'text/plain')
       *   // Set HTTP status code
       *   c.status(201)
       *
       *   // Return the response body
       *   return c.body('Thank you for coming')
       * })
       * ```
       */
      body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
      /**
       * `.text()` can render text as `Content-Type:text/plain`.
       *
       * @see {@link https://hono.dev/docs/api/context#text}
       *
       * @example
       * ```ts
       * app.get('/say', (c) => {
       *   return c.text('Hello!')
       * })
       * ```
       */
      text = /* @__PURE__ */ __name((text2, arg, headers) => {
        return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text2) : this.#newResponse(
          text2,
          arg,
          setDefaultContentType(TEXT_PLAIN, headers)
        );
      }, "text");
      /**
       * `.json()` can render JSON as `Content-Type:application/json`.
       *
       * @see {@link https://hono.dev/docs/api/context#json}
       *
       * @example
       * ```ts
       * app.get('/api', (c) => {
       *   return c.json({ message: 'Hello!' })
       * })
       * ```
       */
      json = /* @__PURE__ */ __name((object, arg, headers) => {
        return this.#newResponse(
          JSON.stringify(object),
          arg,
          setDefaultContentType("application/json", headers)
        );
      }, "json");
      html = /* @__PURE__ */ __name((html, arg, headers) => {
        const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
        return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
      }, "html");
      /**
       * `.redirect()` can Redirect, default status code is 302.
       *
       * @see {@link https://hono.dev/docs/api/context#redirect}
       *
       * @example
       * ```ts
       * app.get('/redirect', (c) => {
       *   return c.redirect('/')
       * })
       * app.get('/redirect-permanently', (c) => {
       *   return c.redirect('/', 301)
       * })
       * ```
       */
      redirect = /* @__PURE__ */ __name((location, status) => {
        const locationString = String(location);
        this.header(
          "Location",
          // Multibyes should be encoded
          // eslint-disable-next-line no-control-regex
          !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
        );
        return this.newResponse(null, status ?? 302);
      }, "redirect");
      /**
       * `.notFound()` can return the Not Found Response.
       *
       * @see {@link https://hono.dev/docs/api/context#notfound}
       *
       * @example
       * ```ts
       * app.get('/notfound', (c) => {
       *   return c.notFound()
       * })
       * ```
       */
      notFound = /* @__PURE__ */ __name(() => {
        this.#notFoundHandler ??= () => createResponseInstance();
        return this.#notFoundHandler(this);
      }, "notFound");
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router.js
var METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE, METHODS, MESSAGE_MATCHER_IS_ALREADY_BUILT, UnsupportedPathError;
var init_router = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router.js"() {
    METHOD_NAME_ALL = "ALL";
    METHOD_NAME_ALL_LOWERCASE = "all";
    METHODS = ["get", "post", "put", "delete", "options", "patch"];
    MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
    UnsupportedPathError = class extends Error {
      static {
        __name(this, "UnsupportedPathError");
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER;
var init_constants2 = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/utils/constants.js"() {
    COMPOSED_HANDLER = "__COMPOSED_HANDLER";
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/hono-base.js
var notFoundHandler, errorHandler, Hono;
var init_hono_base = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/hono-base.js"() {
    init_compose();
    init_context();
    init_router();
    init_constants2();
    init_url();
    notFoundHandler = /* @__PURE__ */ __name((c) => {
      return c.text("404 Not Found", 404);
    }, "notFoundHandler");
    errorHandler = /* @__PURE__ */ __name((err, c) => {
      if ("getResponse" in err) {
        const res = err.getResponse();
        return c.newResponse(res.body, res);
      }
      console.error(err);
      return c.text("Internal Server Error", 500);
    }, "errorHandler");
    Hono = class _Hono {
      static {
        __name(this, "_Hono");
      }
      get;
      post;
      put;
      delete;
      options;
      patch;
      all;
      on;
      use;
      /*
        This class is like an abstract class and does not have a router.
        To use it, inherit the class and implement router in the constructor.
      */
      router;
      getPath;
      // Cannot use `#` because it requires visibility at JavaScript runtime.
      _basePath = "/";
      #path = "/";
      routes = [];
      constructor(options = {}) {
        const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
        allMethods.forEach((method) => {
          this[method] = (args1, ...args) => {
            if (typeof args1 === "string") {
              this.#path = args1;
            } else {
              this.#addRoute(method, this.#path, args1);
            }
            args.forEach((handler) => {
              this.#addRoute(method, this.#path, handler);
            });
            return this;
          };
        });
        this.on = (method, path, ...handlers) => {
          for (const p of [path].flat()) {
            this.#path = p;
            for (const m of [method].flat()) {
              handlers.map((handler) => {
                this.#addRoute(m.toUpperCase(), this.#path, handler);
              });
            }
          }
          return this;
        };
        this.use = (arg1, ...handlers) => {
          if (typeof arg1 === "string") {
            this.#path = arg1;
          } else {
            this.#path = "*";
            handlers.unshift(arg1);
          }
          handlers.forEach((handler) => {
            this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
          });
          return this;
        };
        const { strict, ...optionsWithoutStrict } = options;
        Object.assign(this, optionsWithoutStrict);
        this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
      }
      #clone() {
        const clone = new _Hono({
          router: this.router,
          getPath: this.getPath
        });
        clone.errorHandler = this.errorHandler;
        clone.#notFoundHandler = this.#notFoundHandler;
        clone.routes = this.routes;
        return clone;
      }
      #notFoundHandler = notFoundHandler;
      // Cannot use `#` because it requires visibility at JavaScript runtime.
      errorHandler = errorHandler;
      /**
       * `.route()` allows grouping other Hono instance in routes.
       *
       * @see {@link https://hono.dev/docs/api/routing#grouping}
       *
       * @param {string} path - base Path
       * @param {Hono} app - other Hono instance
       * @returns {Hono} routed Hono instance
       *
       * @example
       * ```ts
       * const app = new Hono()
       * const app2 = new Hono()
       *
       * app2.get("/user", (c) => c.text("user"))
       * app.route("/api", app2) // GET /api/user
       * ```
       */
      route(path, app21) {
        const subApp = this.basePath(path);
        app21.routes.map((r) => {
          let handler;
          if (app21.errorHandler === errorHandler) {
            handler = r.handler;
          } else {
            handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app21.errorHandler)(c, () => r.handler(c, next))).res, "handler");
            handler[COMPOSED_HANDLER] = r.handler;
          }
          subApp.#addRoute(r.method, r.path, handler);
        });
        return this;
      }
      /**
       * `.basePath()` allows base paths to be specified.
       *
       * @see {@link https://hono.dev/docs/api/routing#base-path}
       *
       * @param {string} path - base Path
       * @returns {Hono} changed Hono instance
       *
       * @example
       * ```ts
       * const api = new Hono().basePath('/api')
       * ```
       */
      basePath(path) {
        const subApp = this.#clone();
        subApp._basePath = mergePath(this._basePath, path);
        return subApp;
      }
      /**
       * `.onError()` handles an error and returns a customized Response.
       *
       * @see {@link https://hono.dev/docs/api/hono#error-handling}
       *
       * @param {ErrorHandler} handler - request Handler for error
       * @returns {Hono} changed Hono instance
       *
       * @example
       * ```ts
       * app.onError((err, c) => {
       *   console.error(`${err}`)
       *   return c.text('Custom Error Message', 500)
       * })
       * ```
       */
      onError = /* @__PURE__ */ __name((handler) => {
        this.errorHandler = handler;
        return this;
      }, "onError");
      /**
       * `.notFound()` allows you to customize a Not Found Response.
       *
       * @see {@link https://hono.dev/docs/api/hono#not-found}
       *
       * @param {NotFoundHandler} handler - request handler for not-found
       * @returns {Hono} changed Hono instance
       *
       * @example
       * ```ts
       * app.notFound((c) => {
       *   return c.text('Custom 404 Message', 404)
       * })
       * ```
       */
      notFound = /* @__PURE__ */ __name((handler) => {
        this.#notFoundHandler = handler;
        return this;
      }, "notFound");
      /**
       * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
       *
       * @see {@link https://hono.dev/docs/api/hono#mount}
       *
       * @param {string} path - base Path
       * @param {Function} applicationHandler - other Request Handler
       * @param {MountOptions} [options] - options of `.mount()`
       * @returns {Hono} mounted Hono instance
       *
       * @example
       * ```ts
       * import { Router as IttyRouter } from 'itty-router'
       * import { Hono } from 'hono'
       * // Create itty-router application
       * const ittyRouter = IttyRouter()
       * // GET /itty-router/hello
       * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
       *
       * const app = new Hono()
       * app.mount('/itty-router', ittyRouter.handle)
       * ```
       *
       * @example
       * ```ts
       * const app = new Hono()
       * // Send the request to another application without modification.
       * app.mount('/app', anotherApp, {
       *   replaceRequest: (req) => req,
       * })
       * ```
       */
      mount(path, applicationHandler, options) {
        let replaceRequest;
        let optionHandler;
        if (options) {
          if (typeof options === "function") {
            optionHandler = options;
          } else {
            optionHandler = options.optionHandler;
            if (options.replaceRequest === false) {
              replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
            } else {
              replaceRequest = options.replaceRequest;
            }
          }
        }
        const getOptions = optionHandler ? (c) => {
          const options2 = optionHandler(c);
          return Array.isArray(options2) ? options2 : [options2];
        } : (c) => {
          let executionContext = void 0;
          try {
            executionContext = c.executionCtx;
          } catch {
          }
          return [c.env, executionContext];
        };
        replaceRequest ||= (() => {
          const mergedPath = mergePath(this._basePath, path);
          const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
          return (request) => {
            const url = new URL(request.url);
            url.pathname = url.pathname.slice(pathPrefixLength) || "/";
            return new Request(url, request);
          };
        })();
        const handler = /* @__PURE__ */ __name(async (c, next) => {
          const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
          if (res) {
            return res;
          }
          await next();
        }, "handler");
        this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
        return this;
      }
      #addRoute(method, path, handler) {
        method = method.toUpperCase();
        path = mergePath(this._basePath, path);
        const r = { basePath: this._basePath, path, method, handler };
        this.router.add(method, path, [handler, r]);
        this.routes.push(r);
      }
      #handleError(err, c) {
        if (err instanceof Error) {
          return this.errorHandler(err, c);
        }
        throw err;
      }
      #dispatch(request, executionCtx, env, method) {
        if (method === "HEAD") {
          return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
        }
        const path = this.getPath(request, { env });
        const matchResult = this.router.match(method, path);
        const c = new Context(request, {
          path,
          matchResult,
          env,
          executionCtx,
          notFoundHandler: this.#notFoundHandler
        });
        if (matchResult[0].length === 1) {
          let res;
          try {
            res = matchResult[0][0][0][0](c, async () => {
              c.res = await this.#notFoundHandler(c);
            });
          } catch (err) {
            return this.#handleError(err, c);
          }
          return res instanceof Promise ? res.then(
            (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
          ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
        }
        const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
        return (async () => {
          try {
            const context = await composed(c);
            if (!context.finalized) {
              throw new Error(
                "Context is not finalized. Did you forget to return a Response object or `await next()`?"
              );
            }
            return context.res;
          } catch (err) {
            return this.#handleError(err, c);
          }
        })();
      }
      /**
       * `.fetch()` will be entry point of your app.
       *
       * @see {@link https://hono.dev/docs/api/hono#fetch}
       *
       * @param {Request} request - request Object of request
       * @param {Env} Env - env Object
       * @param {ExecutionContext} - context of execution
       * @returns {Response | Promise<Response>} response of request
       *
       */
      fetch = /* @__PURE__ */ __name((request, ...rest) => {
        return this.#dispatch(request, rest[1], rest[0], request.method);
      }, "fetch");
      /**
       * `.request()` is a useful method for testing.
       * You can pass a URL or pathname to send a GET request.
       * app will return a Response object.
       * ```ts
       * test('GET /hello is ok', async () => {
       *   const res = await app.request('/hello')
       *   expect(res.status).toBe(200)
       * })
       * ```
       * @see https://hono.dev/docs/api/hono#request
       */
      request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
        if (input instanceof Request) {
          return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
        }
        input = input.toString();
        return this.fetch(
          new Request(
            /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
            requestInit
          ),
          Env,
          executionCtx
        );
      }, "request");
      /**
       * `.fire()` automatically adds a global fetch event listener.
       * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
       * @deprecated
       * Use `fire` from `hono/service-worker` instead.
       * ```ts
       * import { Hono } from 'hono'
       * import { fire } from 'hono/service-worker'
       *
       * const app = new Hono()
       * // ...
       * fire(app)
       * ```
       * @see https://hono.dev/docs/api/hono#fire
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
       * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
       */
      fire = /* @__PURE__ */ __name(() => {
        addEventListener("fetch", (event) => {
          event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
        });
      }, "fire");
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/matcher.js
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match22 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match22;
  return match22(method, path);
}
var emptyParam;
var init_matcher = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/matcher.js"() {
    init_router();
    emptyParam = [];
    __name(match, "match");
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/node.js
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var LABEL_REG_EXP_STR, ONLY_WILDCARD_REG_EXP_STR, TAIL_WILDCARD_REG_EXP_STR, PATH_ERROR, regExpMetaChars, Node;
var init_node = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/node.js"() {
    LABEL_REG_EXP_STR = "[^/]+";
    ONLY_WILDCARD_REG_EXP_STR = ".*";
    TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
    PATH_ERROR = /* @__PURE__ */ Symbol();
    regExpMetaChars = new Set(".\\+*[^]$()");
    __name(compareKey, "compareKey");
    Node = class _Node {
      static {
        __name(this, "_Node");
      }
      #index;
      #varIndex;
      #children = /* @__PURE__ */ Object.create(null);
      insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
        if (tokens.length === 0) {
          if (this.#index !== void 0) {
            throw PATH_ERROR;
          }
          if (pathErrorCheckOnly) {
            return;
          }
          this.#index = index;
          return;
        }
        const [token, ...restTokens] = tokens;
        const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
        let node;
        if (pattern) {
          const name2 = pattern[1];
          let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
          if (name2 && pattern[2]) {
            if (regexpStr === ".*") {
              throw PATH_ERROR;
            }
            regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
            if (/\((?!\?:)/.test(regexpStr)) {
              throw PATH_ERROR;
            }
          }
          node = this.#children[regexpStr];
          if (!node) {
            if (Object.keys(this.#children).some(
              (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
            )) {
              throw PATH_ERROR;
            }
            if (pathErrorCheckOnly) {
              return;
            }
            node = this.#children[regexpStr] = new _Node();
            if (name2 !== "") {
              node.#varIndex = context.varIndex++;
            }
          }
          if (!pathErrorCheckOnly && name2 !== "") {
            paramMap.push([name2, node.#varIndex]);
          }
        } else {
          node = this.#children[token];
          if (!node) {
            if (Object.keys(this.#children).some(
              (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
            )) {
              throw PATH_ERROR;
            }
            if (pathErrorCheckOnly) {
              return;
            }
            node = this.#children[token] = new _Node();
          }
        }
        node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
      }
      buildRegExpStr() {
        const childKeys = Object.keys(this.#children).sort(compareKey);
        const strList = childKeys.map((k) => {
          const c = this.#children[k];
          return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
        });
        if (typeof this.#index === "number") {
          strList.unshift(`#${this.#index}`);
        }
        if (strList.length === 0) {
          return "";
        }
        if (strList.length === 1) {
          return strList[0];
        }
        return "(?:" + strList.join("|") + ")";
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie;
var init_trie = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/trie.js"() {
    init_node();
    Trie = class {
      static {
        __name(this, "Trie");
      }
      #context = { varIndex: 0 };
      #root = new Node();
      insert(path, index, pathErrorCheckOnly) {
        const paramAssoc = [];
        const groups = [];
        for (let i = 0; ; ) {
          let replaced = false;
          path = path.replace(/\{[^}]+\}/g, (m) => {
            const mark = `@\\${i}`;
            groups[i] = [mark, m];
            i++;
            replaced = true;
            return mark;
          });
          if (!replaced) {
            break;
          }
        }
        const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
        for (let i = groups.length - 1; i >= 0; i--) {
          const [mark] = groups[i];
          for (let j = tokens.length - 1; j >= 0; j--) {
            if (tokens[j].indexOf(mark) !== -1) {
              tokens[j] = tokens[j].replace(mark, groups[i][1]);
              break;
            }
          }
        }
        this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
        return paramAssoc;
      }
      buildRegExp() {
        let regexp = this.#root.buildRegExpStr();
        if (regexp === "") {
          return [/^$/, [], []];
        }
        let captureIndex = 0;
        const indexReplacementMap = [];
        const paramReplacementMap = [];
        regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
          if (handlerIndex !== void 0) {
            indexReplacementMap[++captureIndex] = Number(handlerIndex);
            return "$()";
          }
          if (paramIndex !== void 0) {
            paramReplacementMap[Number(paramIndex)] = ++captureIndex;
            return "";
          }
          return "";
        });
        return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/router.js
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var nullMatcher, wildcardRegExpCache, RegExpRouter;
var init_router2 = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/router.js"() {
    init_router();
    init_url();
    init_matcher();
    init_node();
    init_trie();
    nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
    wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
    __name(buildWildcardRegExp, "buildWildcardRegExp");
    __name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
    __name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
    __name(findMiddleware, "findMiddleware");
    RegExpRouter = class {
      static {
        __name(this, "RegExpRouter");
      }
      name = "RegExpRouter";
      #middleware;
      #routes;
      constructor() {
        this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
        this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
      }
      add(method, path, handler) {
        const middleware = this.#middleware;
        const routes = this.#routes;
        if (!middleware || !routes) {
          throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
        }
        if (!middleware[method]) {
          ;
          [middleware, routes].forEach((handlerMap) => {
            handlerMap[method] = /* @__PURE__ */ Object.create(null);
            Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
              handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
            });
          });
        }
        if (path === "/*") {
          path = "*";
        }
        const paramCount = (path.match(/\/:/g) || []).length;
        if (/\*$/.test(path)) {
          const re = buildWildcardRegExp(path);
          if (method === METHOD_NAME_ALL) {
            Object.keys(middleware).forEach((m) => {
              middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
            });
          } else {
            middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
          }
          Object.keys(middleware).forEach((m) => {
            if (method === METHOD_NAME_ALL || method === m) {
              Object.keys(middleware[m]).forEach((p) => {
                re.test(p) && middleware[m][p].push([handler, paramCount]);
              });
            }
          });
          Object.keys(routes).forEach((m) => {
            if (method === METHOD_NAME_ALL || method === m) {
              Object.keys(routes[m]).forEach(
                (p) => re.test(p) && routes[m][p].push([handler, paramCount])
              );
            }
          });
          return;
        }
        const paths = checkOptionalParameter(path) || [path];
        for (let i = 0, len = paths.length; i < len; i++) {
          const path2 = paths[i];
          Object.keys(routes).forEach((m) => {
            if (method === METHOD_NAME_ALL || method === m) {
              routes[m][path2] ||= [
                ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
              ];
              routes[m][path2].push([handler, paramCount - len + i + 1]);
            }
          });
        }
      }
      match = match;
      buildAllMatchers() {
        const matchers = /* @__PURE__ */ Object.create(null);
        Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
          matchers[method] ||= this.#buildMatcher(method);
        });
        this.#middleware = this.#routes = void 0;
        clearWildcardRegExpCache();
        return matchers;
      }
      #buildMatcher(method) {
        const routes = [];
        let hasOwnRoute = method === METHOD_NAME_ALL;
        [this.#middleware, this.#routes].forEach((r) => {
          const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
          if (ownRoute.length !== 0) {
            hasOwnRoute ||= true;
            routes.push(...ownRoute);
          } else if (method !== METHOD_NAME_ALL) {
            routes.push(
              ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
            );
          }
        });
        if (!hasOwnRoute) {
          return null;
        } else {
          return buildMatcherFromPreprocessedRoutes(routes);
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/prepared-router.js
var init_prepared_router = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/prepared-router.js"() {
    init_router();
    init_matcher();
    init_router2();
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/index.js
var init_reg_exp_router = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/reg-exp-router/index.js"() {
    init_router2();
    init_prepared_router();
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter;
var init_router3 = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/smart-router/router.js"() {
    init_router();
    SmartRouter = class {
      static {
        __name(this, "SmartRouter");
      }
      name = "SmartRouter";
      #routers = [];
      #routes = [];
      constructor(init) {
        this.#routers = init.routers;
      }
      add(method, path, handler) {
        if (!this.#routes) {
          throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
        }
        this.#routes.push([method, path, handler]);
      }
      match(method, path) {
        if (!this.#routes) {
          throw new Error("Fatal error");
        }
        const routers = this.#routers;
        const routes = this.#routes;
        const len = routers.length;
        let i = 0;
        let res;
        for (; i < len; i++) {
          const router = routers[i];
          try {
            for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
              router.add(...routes[i2]);
            }
            res = router.match(method, path);
          } catch (e) {
            if (e instanceof UnsupportedPathError) {
              continue;
            }
            throw e;
          }
          this.match = router.match.bind(router);
          this.#routers = [router];
          this.#routes = void 0;
          break;
        }
        if (i === len) {
          throw new Error("Fatal error");
        }
        this.name = `SmartRouter + ${this.activeRouter.name}`;
        return res;
      }
      get activeRouter() {
        if (this.#routes || this.#routers.length !== 1) {
          throw new Error("No active router has been determined yet.");
        }
        return this.#routers[0];
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/smart-router/index.js
var init_smart_router = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/smart-router/index.js"() {
    init_router3();
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/trie-router/node.js
var emptyParams, hasChildren, Node2;
var init_node2 = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/trie-router/node.js"() {
    init_router();
    init_url();
    emptyParams = /* @__PURE__ */ Object.create(null);
    hasChildren = /* @__PURE__ */ __name((children) => {
      for (const _ in children) {
        return true;
      }
      return false;
    }, "hasChildren");
    Node2 = class _Node2 {
      static {
        __name(this, "_Node");
      }
      #methods;
      #children;
      #patterns;
      #order = 0;
      #params = emptyParams;
      constructor(method, handler, children) {
        this.#children = children || /* @__PURE__ */ Object.create(null);
        this.#methods = [];
        if (method && handler) {
          const m = /* @__PURE__ */ Object.create(null);
          m[method] = { handler, possibleKeys: [], score: 0 };
          this.#methods = [m];
        }
        this.#patterns = [];
      }
      insert(method, path, handler) {
        this.#order = ++this.#order;
        let curNode = this;
        const parts = splitRoutingPath(path);
        const possibleKeys = [];
        for (let i = 0, len = parts.length; i < len; i++) {
          const p = parts[i];
          const nextP = parts[i + 1];
          const pattern = getPattern(p, nextP);
          const key = Array.isArray(pattern) ? pattern[0] : p;
          if (key in curNode.#children) {
            curNode = curNode.#children[key];
            if (pattern) {
              possibleKeys.push(pattern[1]);
            }
            continue;
          }
          curNode.#children[key] = new _Node2();
          if (pattern) {
            curNode.#patterns.push(pattern);
            possibleKeys.push(pattern[1]);
          }
          curNode = curNode.#children[key];
        }
        curNode.#methods.push({
          [method]: {
            handler,
            possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
            score: this.#order
          }
        });
        return curNode;
      }
      #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
        for (let i = 0, len = node.#methods.length; i < len; i++) {
          const m = node.#methods[i];
          const handlerSet = m[method] || m[METHOD_NAME_ALL];
          const processedSet = {};
          if (handlerSet !== void 0) {
            handlerSet.params = /* @__PURE__ */ Object.create(null);
            handlerSets.push(handlerSet);
            if (nodeParams !== emptyParams || params && params !== emptyParams) {
              for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
                const key = handlerSet.possibleKeys[i2];
                const processed = processedSet[handlerSet.score];
                handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
                processedSet[handlerSet.score] = true;
              }
            }
          }
        }
      }
      search(method, path) {
        const handlerSets = [];
        this.#params = emptyParams;
        const curNode = this;
        let curNodes = [curNode];
        const parts = splitPath(path);
        const curNodesQueue = [];
        const len = parts.length;
        let partOffsets = null;
        for (let i = 0; i < len; i++) {
          const part = parts[i];
          const isLast = i === len - 1;
          const tempNodes = [];
          for (let j = 0, len2 = curNodes.length; j < len2; j++) {
            const node = curNodes[j];
            const nextNode = node.#children[part];
            if (nextNode) {
              nextNode.#params = node.#params;
              if (isLast) {
                if (nextNode.#children["*"]) {
                  this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
                }
                this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
              } else {
                tempNodes.push(nextNode);
              }
            }
            for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
              const pattern = node.#patterns[k];
              const params = node.#params === emptyParams ? {} : { ...node.#params };
              if (pattern === "*") {
                const astNode = node.#children["*"];
                if (astNode) {
                  this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
                  astNode.#params = params;
                  tempNodes.push(astNode);
                }
                continue;
              }
              const [key, name2, matcher] = pattern;
              if (!part && !(matcher instanceof RegExp)) {
                continue;
              }
              const child = node.#children[key];
              if (matcher instanceof RegExp) {
                if (partOffsets === null) {
                  partOffsets = new Array(len);
                  let offset = path[0] === "/" ? 1 : 0;
                  for (let p = 0; p < len; p++) {
                    partOffsets[p] = offset;
                    offset += parts[p].length + 1;
                  }
                }
                const restPathString = path.substring(partOffsets[i]);
                const m = matcher.exec(restPathString);
                if (m) {
                  params[name2] = m[0];
                  this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
                  if (hasChildren(child.#children)) {
                    child.#params = params;
                    const componentCount = m[0].match(/\//)?.length ?? 0;
                    const targetCurNodes = curNodesQueue[componentCount] ||= [];
                    targetCurNodes.push(child);
                  }
                  continue;
                }
              }
              if (matcher === true || matcher.test(part)) {
                params[name2] = part;
                if (isLast) {
                  this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
                  if (child.#children["*"]) {
                    this.#pushHandlerSets(
                      handlerSets,
                      child.#children["*"],
                      method,
                      params,
                      node.#params
                    );
                  }
                } else {
                  child.#params = params;
                  tempNodes.push(child);
                }
              }
            }
          }
          const shifted = curNodesQueue.shift();
          curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
        }
        if (handlerSets.length > 1) {
          handlerSets.sort((a, b) => {
            return a.score - b.score;
          });
        }
        return [handlerSets.map(({ handler, params }) => [handler, params])];
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter;
var init_router4 = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/trie-router/router.js"() {
    init_url();
    init_node2();
    TrieRouter = class {
      static {
        __name(this, "TrieRouter");
      }
      name = "TrieRouter";
      #node;
      constructor() {
        this.#node = new Node2();
      }
      add(method, path, handler) {
        const results = checkOptionalParameter(path);
        if (results) {
          for (let i = 0, len = results.length; i < len; i++) {
            this.#node.insert(method, results[i], handler);
          }
          return;
        }
        this.#node.insert(method, path, handler);
      }
      match(method, path) {
        return this.#node.search(method, path);
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/trie-router/index.js
var init_trie_router = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/router/trie-router/index.js"() {
    init_router4();
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/hono.js
var Hono2;
var init_hono = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/hono.js"() {
    init_hono_base();
    init_reg_exp_router();
    init_smart_router();
    init_trie_router();
    Hono2 = class extends Hono {
      static {
        __name(this, "Hono");
      }
      /**
       * Creates an instance of the Hono class.
       *
       * @param options - Optional configuration options for the Hono instance.
       */
      constructor(options = {}) {
        super(options);
        this.router = options.router ?? new SmartRouter({
          routers: [new RegExpRouter(), new TrieRouter()]
        });
      }
    };
  }
});

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/index.js
var init_dist = __esm({
  "../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/index.js"() {
    init_hono();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs
var DEV_OR_STAGING_SUFFIXES;
var init_constants_ByUssRbE = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs"() {
    DEV_OR_STAGING_SUFFIXES = [
      ".lcl.dev",
      ".stg.dev",
      ".lclstage.dev",
      ".stgstage.dev",
      ".dev.lclclerk.com",
      ".stg.lclclerk.com",
      ".accounts.lclclerk.com",
      "accountsstage.dev",
      "accounts.dev"
    ];
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs
var init_instance_Cze6Nv61 = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs"() {
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/url-Cdy8w8vK.mjs
var init_url_Cdy8w8vK = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/url-Cdy8w8vK.mjs"() {
    init_constants_ByUssRbE();
    init_instance_Cze6Nv61();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/url.mjs
var init_url2 = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/url.mjs"() {
    init_constants_ByUssRbE();
    init_instance_Cze6Nv61();
    init_url_Cdy8w8vK();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs
var defaultOptions, RETRY_IMMEDIATELY_DELAY, sleep, applyJitter, createExponentialDelayAsyncFn, retry;
var init_retry_DAlTROH9 = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs"() {
    defaultOptions = {
      initialDelay: 125,
      maxDelayBetweenRetries: 0,
      factor: 2,
      shouldRetry: /* @__PURE__ */ __name((_, iteration) => iteration < 5, "shouldRetry"),
      retryImmediately: false,
      jitter: true
    };
    RETRY_IMMEDIATELY_DELAY = 100;
    sleep = /* @__PURE__ */ __name(async (ms) => new Promise((s) => setTimeout(s, ms)), "sleep");
    applyJitter = /* @__PURE__ */ __name((delay, jitter) => {
      return jitter ? delay * (1 + Math.random()) : delay;
    }, "applyJitter");
    createExponentialDelayAsyncFn = /* @__PURE__ */ __name((opts) => {
      let timesCalled = 0;
      const calculateDelayInMs = /* @__PURE__ */ __name(() => {
        const constant = opts.initialDelay;
        const base = opts.factor;
        let delay = constant * Math.pow(base, timesCalled);
        delay = applyJitter(delay, opts.jitter);
        return Math.min(opts.maxDelayBetweenRetries || delay, delay);
      }, "calculateDelayInMs");
      return async () => {
        await sleep(calculateDelayInMs());
        timesCalled++;
      };
    }, "createExponentialDelayAsyncFn");
    retry = /* @__PURE__ */ __name(async (callback, options = {}) => {
      let iterations = 0;
      const { shouldRetry, initialDelay, maxDelayBetweenRetries, factor, retryImmediately, jitter, onBeforeRetry } = {
        ...defaultOptions,
        ...options
      };
      const delay = createExponentialDelayAsyncFn({
        initialDelay,
        maxDelayBetweenRetries,
        factor,
        jitter
      });
      while (true) try {
        return await callback();
      } catch (e) {
        iterations++;
        if (!shouldRetry(e, iterations)) throw e;
        if (onBeforeRetry) await onBeforeRetry(iterations);
        if (retryImmediately && iterations === 1) await sleep(applyJitter(RETRY_IMMEDIATELY_DELAY, jitter));
        else await delay();
      }
    }, "retry");
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/retry.mjs
var init_retry = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/retry.mjs"() {
    init_retry_DAlTROH9();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs
var isomorphicAtob;
var init_isomorphicAtob_DybBXGFR = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs"() {
    isomorphicAtob = /* @__PURE__ */ __name((data) => {
      if (typeof atob !== "undefined" && typeof atob === "function") return atob(data);
      else if (typeof global !== "undefined" && global.Buffer) return new global.Buffer(data, "base64").toString();
      return data;
    }, "isomorphicAtob");
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs
var init_isomorphicBtoa_Dr7WubZv = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs"() {
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs
function createDevOrStagingUrlCache() {
  const devOrStagingUrlCache = /* @__PURE__ */ new Map();
  return { isDevOrStagingUrl: /* @__PURE__ */ __name((url) => {
    if (!url) return false;
    const hostname = typeof url === "string" ? url : url.hostname;
    let res = devOrStagingUrlCache.get(hostname);
    if (res === void 0) {
      res = DEV_OR_STAGING_SUFFIXES.some((s) => hostname.endsWith(s));
      devOrStagingUrlCache.set(hostname, res);
    }
    return res;
  }, "isDevOrStagingUrl") };
}
var init_keys_YNv6yjKk = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs"() {
    init_constants_ByUssRbE();
    init_isomorphicAtob_DybBXGFR();
    init_isomorphicBtoa_Dr7WubZv();
    __name(createDevOrStagingUrlCache, "createDevOrStagingUrlCache");
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/keys.mjs
var init_keys = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/keys.mjs"() {
    init_constants_ByUssRbE();
    init_isomorphicAtob_DybBXGFR();
    init_isomorphicBtoa_Dr7WubZv();
    init_keys_YNv6yjKk();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs
var init_runtimeEnvironment_BB2sO_19 = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs"() {
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/deprecated-BqlFbLHj.mjs
var init_deprecated_BqlFbLHj = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/deprecated-BqlFbLHj.mjs"() {
    init_runtimeEnvironment_BB2sO_19();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/deprecated.mjs
var init_deprecated = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/deprecated.mjs"() {
    init_runtimeEnvironment_BB2sO_19();
    init_deprecated_BqlFbLHj();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs
function createErrorTypeGuard(ErrorClass) {
  function typeGuard(error) {
    const target = error ?? this;
    if (!target) throw new TypeError(`${ErrorClass.kind || ErrorClass.name} type guard requires an error object`);
    if (ErrorClass.kind && typeof target === "object" && target !== null && "constructor" in target) {
      if (target.constructor?.kind === ErrorClass.kind) return true;
    }
    return target instanceof ErrorClass;
  }
  __name(typeGuard, "typeGuard");
  return typeGuard;
}
function buildErrorThrower({ packageName, customMessages }) {
  let pkg = packageName;
  function buildMessage(rawMessage, replacements) {
    if (!replacements) return `${pkg}: ${rawMessage}`;
    let msg = rawMessage;
    const matches = rawMessage.matchAll(/{{([a-zA-Z0-9-_]+)}}/g);
    for (const match3 of matches) {
      const replacement = (replacements[match3[1]] || "").toString();
      msg = msg.replace(`{{${match3[1]}}}`, replacement);
    }
    return `${pkg}: ${msg}`;
  }
  __name(buildMessage, "buildMessage");
  const messages = {
    ...DefaultMessages,
    ...customMessages
  };
  return {
    setPackageName({ packageName: packageName$1 }) {
      if (typeof packageName$1 === "string") pkg = packageName$1;
      return this;
    },
    setMessages({ customMessages: customMessages$1 }) {
      Object.assign(messages, customMessages$1 || {});
      return this;
    },
    throwInvalidPublishableKeyError(params) {
      throw new Error(buildMessage(messages.InvalidPublishableKeyErrorMessage, params));
    },
    throwInvalidProxyUrl(params) {
      throw new Error(buildMessage(messages.InvalidProxyUrlErrorMessage, params));
    },
    throwMissingPublishableKeyError() {
      throw new Error(buildMessage(messages.MissingPublishableKeyErrorMessage));
    },
    throwMissingSecretKeyError() {
      throw new Error(buildMessage(messages.MissingSecretKeyErrorMessage));
    },
    throwMissingClerkProviderError(params) {
      throw new Error(buildMessage(messages.MissingClerkProvider, params));
    },
    throw(message) {
      throw new Error(buildMessage(message));
    }
  };
}
var ClerkAPIError, isClerkAPIError, ClerkError, ClerkAPIResponseError, isClerkAPIResponseError, DefaultMessages, ClerkRuntimeError, isClerkRuntimeError;
var init_error_Dl9xmUf3 = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs"() {
    __name(createErrorTypeGuard, "createErrorTypeGuard");
    ClerkAPIError = class {
      static {
        __name(this, "ClerkAPIError");
      }
      static kind = "ClerkApiError";
      code;
      message;
      longMessage;
      meta;
      constructor(json) {
        const parsedError = {
          code: json.code,
          message: json.message,
          longMessage: json.long_message,
          meta: {
            paramName: json.meta?.param_name,
            sessionId: json.meta?.session_id,
            emailAddresses: json.meta?.email_addresses,
            identifiers: json.meta?.identifiers,
            zxcvbn: json.meta?.zxcvbn,
            plan: json.meta?.plan,
            isPlanUpgradePossible: json.meta?.is_plan_upgrade_possible
          }
        };
        this.code = parsedError.code;
        this.message = parsedError.message;
        this.longMessage = parsedError.longMessage;
        this.meta = parsedError.meta;
      }
    };
    isClerkAPIError = createErrorTypeGuard(ClerkAPIError);
    ClerkError = class ClerkError2 extends Error {
      static {
        __name(this, "ClerkError");
      }
      static kind = "ClerkError";
      clerkError = true;
      code;
      longMessage;
      docsUrl;
      cause;
      get name() {
        return this.constructor.name;
      }
      constructor(opts) {
        super(new.target.formatMessage(new.target.kind, opts.message, opts.code, opts.docsUrl), { cause: opts.cause });
        Object.setPrototypeOf(this, ClerkError2.prototype);
        this.code = opts.code;
        this.docsUrl = opts.docsUrl;
        this.longMessage = opts.longMessage;
        this.cause = opts.cause;
      }
      toString() {
        return `[${this.name}]
Message:${this.message}`;
      }
      static formatMessage(name2, msg, code, docsUrl) {
        const prefix = "Clerk:";
        const regex = new RegExp(prefix.replace(" ", "\\s*"), "i");
        msg = msg.replace(regex, "");
        msg = `${prefix} ${msg.trim()}

(code="${code}")

`;
        if (docsUrl) msg += `

Docs: ${docsUrl}`;
        return msg;
      }
    };
    ClerkAPIResponseError = class ClerkAPIResponseError2 extends ClerkError {
      static {
        __name(this, "ClerkAPIResponseError");
      }
      static kind = "ClerkAPIResponseError";
      status;
      clerkTraceId;
      retryAfter;
      errors;
      constructor(message, options) {
        const { data: errorsJson, status, clerkTraceId, retryAfter } = options;
        super({
          ...options,
          message,
          code: "api_response_error"
        });
        Object.setPrototypeOf(this, ClerkAPIResponseError2.prototype);
        this.status = status;
        this.clerkTraceId = clerkTraceId;
        this.retryAfter = retryAfter;
        this.errors = (errorsJson || []).map((e) => new ClerkAPIError(e));
      }
      toString() {
        let message = `[${this.name}]
Message:${this.message}
Status:${this.status}
Serialized errors: ${this.errors.map((e) => JSON.stringify(e))}`;
        if (this.clerkTraceId) message += `
Clerk Trace ID: ${this.clerkTraceId}`;
        return message;
      }
      static formatMessage(name2, msg, _, __) {
        return msg;
      }
    };
    isClerkAPIResponseError = createErrorTypeGuard(ClerkAPIResponseError);
    DefaultMessages = Object.freeze({
      InvalidProxyUrlErrorMessage: `The proxyUrl passed to Clerk is invalid. The expected value for proxyUrl is an absolute URL or a relative path with a leading '/'. (key={{url}})`,
      InvalidPublishableKeyErrorMessage: `The publishableKey passed to Clerk is invalid. You can get your Publishable key at https://dashboard.clerk.com/last-active?path=api-keys. (key={{key}})`,
      MissingPublishableKeyErrorMessage: `Missing publishableKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
      MissingSecretKeyErrorMessage: `Missing secretKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
      MissingClerkProvider: `{{source}} can only be used within the <ClerkProvider /> component. Learn more: https://clerk.com/docs/components/clerk-provider`
    });
    __name(buildErrorThrower, "buildErrorThrower");
    ClerkRuntimeError = class ClerkRuntimeError2 extends ClerkError {
      static {
        __name(this, "ClerkRuntimeError");
      }
      static kind = "ClerkRuntimeError";
      /**
      * @deprecated Use `clerkError` property instead. This property is maintained for backward compatibility.
      */
      clerkRuntimeError = true;
      constructor(message, options) {
        super({
          ...options,
          message
        });
        Object.setPrototypeOf(this, ClerkRuntimeError2.prototype);
      }
    };
    isClerkRuntimeError = createErrorTypeGuard(ClerkRuntimeError);
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/error.mjs
var init_error = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/error.mjs"() {
    init_error_Dl9xmUf3();
  }
});

// ../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-LWOXHF4E.mjs
var errorThrower, isDevOrStagingUrl;
var init_chunk_LWOXHF4E = __esm({
  "../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-LWOXHF4E.mjs"() {
    init_url2();
    init_retry();
    init_keys();
    init_deprecated();
    init_error();
    init_keys();
    errorThrower = buildErrorThrower({ packageName: "@clerk/backend" });
    ({ isDevOrStagingUrl } = createDevOrStagingUrlCache());
  }
});

// ../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-5JS2VYLU.mjs
var TokenVerificationErrorCode, TokenVerificationErrorReason, TokenVerificationErrorAction, TokenVerificationError;
var init_chunk_5JS2VYLU = __esm({
  "../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-5JS2VYLU.mjs"() {
    TokenVerificationErrorCode = {
      InvalidSecretKey: "clerk_key_invalid"
    };
    TokenVerificationErrorReason = {
      TokenExpired: "token-expired",
      TokenInvalid: "token-invalid",
      TokenInvalidAlgorithm: "token-invalid-algorithm",
      TokenInvalidAuthorizedParties: "token-invalid-authorized-parties",
      TokenInvalidSignature: "token-invalid-signature",
      TokenNotActiveYet: "token-not-active-yet",
      TokenIatInTheFuture: "token-iat-in-the-future",
      TokenVerificationFailed: "token-verification-failed",
      InvalidSecretKey: "secret-key-invalid",
      LocalJWKMissing: "jwk-local-missing",
      RemoteJWKFailedToLoad: "jwk-remote-failed-to-load",
      RemoteJWKInvalid: "jwk-remote-invalid",
      RemoteJWKMissing: "jwk-remote-missing",
      JWKFailedToResolve: "jwk-failed-to-resolve",
      JWKKidMismatch: "jwk-kid-mismatch"
    };
    TokenVerificationErrorAction = {
      ContactSupport: "Contact support@clerk.com",
      EnsureClerkJWT: "Make sure that this is a valid Clerk generate JWT.",
      SetClerkJWTKey: "Set the CLERK_JWT_KEY environment variable.",
      SetClerkSecretKey: "Set the CLERK_SECRET_KEY environment variable.",
      EnsureClockSync: "Make sure your system clock is in sync (e.g. turn off and on automatic time synchronization)."
    };
    TokenVerificationError = class _TokenVerificationError extends Error {
      static {
        __name(this, "_TokenVerificationError");
      }
      constructor({
        action,
        message,
        reason
      }) {
        super(message);
        Object.setPrototypeOf(this, _TokenVerificationError.prototype);
        this.reason = reason;
        this.message = message;
        this.action = action;
      }
      getFullMessage() {
        return `${[this.message, this.action].filter((m) => m).join(" ")} (reason=${this.reason}, token-carrier=${this.tokenCarrier})`;
      }
    };
  }
});

// ../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/runtime/browser/crypto.mjs
var webcrypto;
var init_crypto = __esm({
  "../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/runtime/browser/crypto.mjs"() {
    webcrypto = crypto;
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/isomorphicAtob.mjs
var init_isomorphicAtob = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/isomorphicAtob.mjs"() {
    init_isomorphicAtob_DybBXGFR();
  }
});

// ../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-2Z4IRG2E.mjs
function parse(string, encoding, opts = {}) {
  if (!encoding.codes) {
    encoding.codes = {};
    for (let i = 0; i < encoding.chars.length; ++i) {
      encoding.codes[encoding.chars[i]] = i;
    }
  }
  if (!opts.loose && string.length * encoding.bits & 7) {
    throw new SyntaxError("Invalid padding");
  }
  let end = string.length;
  while (string[end - 1] === "=") {
    --end;
    if (!opts.loose && !((string.length - end) * encoding.bits & 7)) {
      throw new SyntaxError("Invalid padding");
    }
  }
  const out = new (opts.out ?? Uint8Array)(end * encoding.bits / 8 | 0);
  let bits = 0;
  let buffer = 0;
  let written = 0;
  for (let i = 0; i < end; ++i) {
    const value = encoding.codes[string[i]];
    if (value === void 0) {
      throw new SyntaxError("Invalid character " + string[i]);
    }
    buffer = buffer << encoding.bits | value;
    bits += encoding.bits;
    if (bits >= 8) {
      bits -= 8;
      out[written++] = 255 & buffer >> bits;
    }
  }
  if (bits >= encoding.bits || 255 & buffer << 8 - bits) {
    throw new SyntaxError("Unexpected end of data");
  }
  return out;
}
function stringify(data, encoding, opts = {}) {
  const { pad = true } = opts;
  const mask = (1 << encoding.bits) - 1;
  let out = "";
  let bits = 0;
  let buffer = 0;
  for (let i = 0; i < data.length; ++i) {
    buffer = buffer << 8 | 255 & data[i];
    bits += 8;
    while (bits > encoding.bits) {
      bits -= encoding.bits;
      out += encoding.chars[mask & buffer >> bits];
    }
  }
  if (bits) {
    out += encoding.chars[mask & buffer << encoding.bits - bits];
  }
  if (pad) {
    while (out.length * encoding.bits & 7) {
      out += "=";
    }
  }
  return out;
}
function getCryptoAlgorithm(algorithmName) {
  const hash = algToHash[algorithmName];
  const name2 = jwksAlgToCryptoAlg[algorithmName];
  if (!hash || !name2) {
    throw new Error(`Unsupported algorithm ${algorithmName}, expected one of ${algs.join(",")}.`);
  }
  return {
    hash: { name: algToHash[algorithmName] },
    name: jwksAlgToCryptoAlg[algorithmName]
  };
}
function pemToBuffer(secret) {
  const trimmed = secret.replace(/-----BEGIN.*?-----/g, "").replace(/-----END.*?-----/g, "").replace(/\s/g, "");
  const decoded = isomorphicAtob(trimmed);
  const buffer = new ArrayBuffer(decoded.length);
  const bufView = new Uint8Array(buffer);
  for (let i = 0, strLen = decoded.length; i < strLen; i++) {
    bufView[i] = decoded.charCodeAt(i);
  }
  return bufView;
}
function importKey(key, algorithm, keyUsage) {
  if (typeof key === "object") {
    return runtime.crypto.subtle.importKey("jwk", key, algorithm, false, [keyUsage]);
  }
  const keyData = pemToBuffer(key);
  const format = keyUsage === "sign" ? "pkcs8" : "spki";
  return runtime.crypto.subtle.importKey(format, keyData, algorithm, false, [keyUsage]);
}
async function hasValidSignature(jwt, key) {
  const { header, signature, raw: raw2 } = jwt;
  const encoder = new TextEncoder();
  const data = encoder.encode([raw2.header, raw2.payload].join("."));
  const algorithm = getCryptoAlgorithm(header.alg);
  try {
    const cryptoKey = await importKey(key, algorithm, "verify");
    const verified = await runtime.crypto.subtle.verify(algorithm.name, cryptoKey, signature, data);
    return { data: verified };
  } catch (error) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalidSignature,
          message: error?.message
        })
      ]
    };
  }
}
function decodeJwt(token) {
  const tokenParts = (token || "").toString().split(".");
  if (tokenParts.length !== 3) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalid,
          message: `Invalid JWT form. A JWT consists of three parts separated by dots.`
        })
      ]
    };
  }
  const [rawHeader, rawPayload, rawSignature] = tokenParts;
  const decoder = new TextDecoder();
  const header = JSON.parse(decoder.decode(base64url.parse(rawHeader, { loose: true })));
  const payload = JSON.parse(decoder.decode(base64url.parse(rawPayload, { loose: true })));
  const signature = base64url.parse(rawSignature, { loose: true });
  const data = {
    header,
    payload,
    signature,
    raw: {
      header: rawHeader,
      payload: rawPayload,
      signature: rawSignature,
      text: token
    }
  };
  return { data };
}
async function verifyJwt(token, options) {
  const { audience, authorizedParties, clockSkewInMs, key } = options;
  const clockSkew = clockSkewInMs || DEFAULT_CLOCK_SKEW_IN_MS;
  const { data: decoded, errors } = decodeJwt(token);
  if (errors) {
    return { errors };
  }
  const { header, payload } = decoded;
  try {
    const { typ, alg } = header;
    assertHeaderType(typ);
    assertHeaderAlgorithm(alg);
    const { azp, sub, aud, iat, exp, nbf } = payload;
    assertSubClaim(sub);
    assertAudienceClaim([aud], [audience]);
    assertAuthorizedPartiesClaim(azp, authorizedParties);
    assertExpirationClaim(exp, clockSkew);
    assertActivationClaim(nbf, clockSkew);
    assertIssuedAtClaim(iat, clockSkew);
  } catch (err) {
    return { errors: [err] };
  }
  const { data: signatureValid, errors: signatureErrors } = await hasValidSignature(decoded, key);
  if (signatureErrors) {
    return {
      errors: [
        new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenVerificationFailed,
          message: `Error verifying JWT signature. ${signatureErrors[0]}`
        })
      ]
    };
  }
  if (!signatureValid) {
    return {
      errors: [
        new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalidSignature,
          message: "JWT signature is invalid."
        })
      ]
    };
  }
  return { data: payload };
}
var globalFetch, runtime, base64url, base64UrlEncoding, algToHash, RSA_ALGORITHM_NAME, jwksAlgToCryptoAlg, algs, isArrayString, assertAudienceClaim, assertHeaderType, assertHeaderAlgorithm, assertSubClaim, assertAuthorizedPartiesClaim, assertExpirationClaim, assertActivationClaim, assertIssuedAtClaim, DEFAULT_CLOCK_SKEW_IN_MS;
var init_chunk_2Z4IRG2E = __esm({
  "../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-2Z4IRG2E.mjs"() {
    init_chunk_5JS2VYLU();
    init_crypto();
    init_isomorphicAtob();
    globalFetch = fetch.bind(globalThis);
    runtime = {
      crypto: webcrypto,
      get fetch() {
        return false ? fetch : globalFetch;
      },
      AbortController: globalThis.AbortController,
      Blob: globalThis.Blob,
      FormData: globalThis.FormData,
      Headers: globalThis.Headers,
      Request: globalThis.Request,
      Response: globalThis.Response
    };
    base64url = {
      parse(string, opts) {
        return parse(string, base64UrlEncoding, opts);
      },
      stringify(data, opts) {
        return stringify(data, base64UrlEncoding, opts);
      }
    };
    base64UrlEncoding = {
      chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
      bits: 6
    };
    __name(parse, "parse");
    __name(stringify, "stringify");
    algToHash = {
      RS256: "SHA-256",
      RS384: "SHA-384",
      RS512: "SHA-512"
    };
    RSA_ALGORITHM_NAME = "RSASSA-PKCS1-v1_5";
    jwksAlgToCryptoAlg = {
      RS256: RSA_ALGORITHM_NAME,
      RS384: RSA_ALGORITHM_NAME,
      RS512: RSA_ALGORITHM_NAME
    };
    algs = Object.keys(algToHash);
    __name(getCryptoAlgorithm, "getCryptoAlgorithm");
    isArrayString = /* @__PURE__ */ __name((s) => {
      return Array.isArray(s) && s.length > 0 && s.every((a) => typeof a === "string");
    }, "isArrayString");
    assertAudienceClaim = /* @__PURE__ */ __name((aud, audience) => {
      const audienceList = [audience].flat().filter((a) => !!a);
      const audList = [aud].flat().filter((a) => !!a);
      const shouldVerifyAudience = audienceList.length > 0 && audList.length > 0;
      if (!shouldVerifyAudience) {
        return;
      }
      if (typeof aud === "string") {
        if (!audienceList.includes(aud)) {
          throw new TokenVerificationError({
            action: TokenVerificationErrorAction.EnsureClerkJWT,
            reason: TokenVerificationErrorReason.TokenVerificationFailed,
            message: `Invalid JWT audience claim (aud) ${JSON.stringify(aud)}. Is not included in "${JSON.stringify(
              audienceList
            )}".`
          });
        }
      } else if (isArrayString(aud)) {
        if (!aud.some((a) => audienceList.includes(a))) {
          throw new TokenVerificationError({
            action: TokenVerificationErrorAction.EnsureClerkJWT,
            reason: TokenVerificationErrorReason.TokenVerificationFailed,
            message: `Invalid JWT audience claim array (aud) ${JSON.stringify(aud)}. Is not included in "${JSON.stringify(
              audienceList
            )}".`
          });
        }
      }
    }, "assertAudienceClaim");
    assertHeaderType = /* @__PURE__ */ __name((typ) => {
      if (typeof typ === "undefined") {
        return;
      }
      if (typ !== "JWT") {
        throw new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenInvalid,
          message: `Invalid JWT type ${JSON.stringify(typ)}. Expected "JWT".`
        });
      }
    }, "assertHeaderType");
    assertHeaderAlgorithm = /* @__PURE__ */ __name((alg) => {
      if (!algs.includes(alg)) {
        throw new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenInvalidAlgorithm,
          message: `Invalid JWT algorithm ${JSON.stringify(alg)}. Supported: ${algs}.`
        });
      }
    }, "assertHeaderAlgorithm");
    assertSubClaim = /* @__PURE__ */ __name((sub) => {
      if (typeof sub !== "string") {
        throw new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenVerificationFailed,
          message: `Subject claim (sub) is required and must be a string. Received ${JSON.stringify(sub)}.`
        });
      }
    }, "assertSubClaim");
    assertAuthorizedPartiesClaim = /* @__PURE__ */ __name((azp, authorizedParties) => {
      if (!azp || !authorizedParties || authorizedParties.length === 0) {
        return;
      }
      if (!authorizedParties.includes(azp)) {
        throw new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenInvalidAuthorizedParties,
          message: `Invalid JWT Authorized party claim (azp) ${JSON.stringify(azp)}. Expected "${authorizedParties}".`
        });
      }
    }, "assertAuthorizedPartiesClaim");
    assertExpirationClaim = /* @__PURE__ */ __name((exp, clockSkewInMs) => {
      if (typeof exp !== "number") {
        throw new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenVerificationFailed,
          message: `Invalid JWT expiry date claim (exp) ${JSON.stringify(exp)}. Expected number.`
        });
      }
      const currentDate = new Date(Date.now());
      const expiryDate = /* @__PURE__ */ new Date(0);
      expiryDate.setUTCSeconds(exp);
      const expired = expiryDate.getTime() <= currentDate.getTime() - clockSkewInMs;
      if (expired) {
        throw new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenExpired,
          message: `JWT is expired. Expiry date: ${expiryDate.toUTCString()}, Current date: ${currentDate.toUTCString()}.`
        });
      }
    }, "assertExpirationClaim");
    assertActivationClaim = /* @__PURE__ */ __name((nbf, clockSkewInMs) => {
      if (typeof nbf === "undefined") {
        return;
      }
      if (typeof nbf !== "number") {
        throw new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenVerificationFailed,
          message: `Invalid JWT not before date claim (nbf) ${JSON.stringify(nbf)}. Expected number.`
        });
      }
      const currentDate = new Date(Date.now());
      const notBeforeDate = /* @__PURE__ */ new Date(0);
      notBeforeDate.setUTCSeconds(nbf);
      const early = notBeforeDate.getTime() > currentDate.getTime() + clockSkewInMs;
      if (early) {
        throw new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenNotActiveYet,
          message: `JWT cannot be used prior to not before date claim (nbf). Not before date: ${notBeforeDate.toUTCString()}; Current date: ${currentDate.toUTCString()};`
        });
      }
    }, "assertActivationClaim");
    assertIssuedAtClaim = /* @__PURE__ */ __name((iat, clockSkewInMs) => {
      if (typeof iat === "undefined") {
        return;
      }
      if (typeof iat !== "number") {
        throw new TokenVerificationError({
          action: TokenVerificationErrorAction.EnsureClerkJWT,
          reason: TokenVerificationErrorReason.TokenVerificationFailed,
          message: `Invalid JWT issued at date claim (iat) ${JSON.stringify(iat)}. Expected number.`
        });
      }
      const currentDate = new Date(Date.now());
      const issuedAtDate = /* @__PURE__ */ new Date(0);
      issuedAtDate.setUTCSeconds(iat);
      const postIssued = issuedAtDate.getTime() > currentDate.getTime() + clockSkewInMs;
      if (postIssued) {
        throw new TokenVerificationError({
          reason: TokenVerificationErrorReason.TokenIatInTheFuture,
          message: `JWT issued at date claim (iat) is in the future. Issued at date: ${issuedAtDate.toUTCString()}; Current date: ${currentDate.toUTCString()};`
        });
      }
    }, "assertIssuedAtClaim");
    __name(pemToBuffer, "pemToBuffer");
    __name(importKey, "importKey");
    DEFAULT_CLOCK_SKEW_IN_MS = 5 * 1e3;
    __name(hasValidSignature, "hasValidSignature");
    __name(decodeJwt, "decodeJwt");
    __name(verifyJwt, "verifyJwt");
  }
});

// ../../node_modules/.pnpm/map-obj@4.3.0/node_modules/map-obj/index.js
var require_map_obj = __commonJS({
  "../../node_modules/.pnpm/map-obj@4.3.0/node_modules/map-obj/index.js"(exports, module) {
    "use strict";
    var isObject = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null, "isObject");
    var mapObjectSkip = /* @__PURE__ */ Symbol("skip");
    var isObjectCustom = /* @__PURE__ */ __name((value) => isObject(value) && !(value instanceof RegExp) && !(value instanceof Error) && !(value instanceof Date), "isObjectCustom");
    var mapObject = /* @__PURE__ */ __name((object, mapper, options, isSeen = /* @__PURE__ */ new WeakMap()) => {
      options = {
        deep: false,
        target: {},
        ...options
      };
      if (isSeen.has(object)) {
        return isSeen.get(object);
      }
      isSeen.set(object, options.target);
      const { target } = options;
      delete options.target;
      const mapArray = /* @__PURE__ */ __name((array) => array.map((element) => isObjectCustom(element) ? mapObject(element, mapper, options, isSeen) : element), "mapArray");
      if (Array.isArray(object)) {
        return mapArray(object);
      }
      for (const [key, value] of Object.entries(object)) {
        const mapResult = mapper(key, value, object);
        if (mapResult === mapObjectSkip) {
          continue;
        }
        let [newKey, newValue, { shouldRecurse = true } = {}] = mapResult;
        if (newKey === "__proto__") {
          continue;
        }
        if (options.deep && shouldRecurse && isObjectCustom(newValue)) {
          newValue = Array.isArray(newValue) ? mapArray(newValue) : mapObject(newValue, mapper, options, isSeen);
        }
        target[newKey] = newValue;
      }
      return target;
    }, "mapObject");
    module.exports = (object, mapper, options) => {
      if (!isObject(object)) {
        throw new TypeError(`Expected an object, got \`${object}\` (${typeof object})`);
      }
      return mapObject(object, mapper, options);
    };
    module.exports.mapObjectSkip = mapObjectSkip;
  }
});

// ../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.js
var require_tslib = __commonJS({
  "../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.js"(exports, module) {
    var __extends;
    var __assign;
    var __rest;
    var __decorate;
    var __param;
    var __esDecorate;
    var __runInitializers;
    var __propKey;
    var __setFunctionName;
    var __metadata;
    var __awaiter;
    var __generator;
    var __exportStar;
    var __values;
    var __read;
    var __spread;
    var __spreadArrays;
    var __spreadArray;
    var __await;
    var __asyncGenerator;
    var __asyncDelegator;
    var __asyncValues;
    var __makeTemplateObject;
    var __importStar;
    var __importDefault;
    var __classPrivateFieldGet;
    var __classPrivateFieldSet;
    var __classPrivateFieldIn;
    var __createBinding;
    var __addDisposableResource;
    var __disposeResources;
    var __rewriteRelativeImportExtension;
    (function(factory) {
      var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
      if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function(exports2) {
          factory(createExporter(root, createExporter(exports2)));
        });
      } else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
      } else {
        factory(createExporter(root));
      }
      function createExporter(exports2, previous) {
        if (exports2 !== root) {
          if (typeof Object.create === "function") {
            Object.defineProperty(exports2, "__esModule", { value: true });
          } else {
            exports2.__esModule = true;
          }
        }
        return function(id, v) {
          return exports2[id] = previous ? previous(id, v) : v;
        };
      }
      __name(createExporter, "createExporter");
    })(function(exporter) {
      var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
        d.__proto__ = b;
      } || function(d, b) {
        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      };
      __extends = /* @__PURE__ */ __name(function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        __name(__, "__");
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      }, "__extends");
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
      __rest = /* @__PURE__ */ __name(function(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
          }
        return t;
      }, "__rest");
      __decorate = /* @__PURE__ */ __name(function(decorators, target, key, desc2) {
        var c = arguments.length, r = c < 3 ? target : desc2 === null ? desc2 = Object.getOwnPropertyDescriptor(target, key) : desc2, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc2);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
      }, "__decorate");
      __param = /* @__PURE__ */ __name(function(paramIndex, decorator) {
        return function(target, key) {
          decorator(target, key, paramIndex);
        };
      }, "__param");
      __esDecorate = /* @__PURE__ */ __name(function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
        function accept(f) {
          if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
          return f;
        }
        __name(accept, "accept");
        var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
        var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
        var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
        var _, done = false;
        for (var i = decorators.length - 1; i >= 0; i--) {
          var context = {};
          for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
          for (var p in contextIn.access) context.access[p] = contextIn.access[p];
          context.addInitializer = function(f) {
            if (done) throw new TypeError("Cannot add initializers after decoration has completed");
            extraInitializers.push(accept(f || null));
          };
          var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
          if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
          } else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
          }
        }
        if (target) Object.defineProperty(target, contextIn.name, descriptor);
        done = true;
      }, "__esDecorate");
      __runInitializers = /* @__PURE__ */ __name(function(thisArg, initializers, value) {
        var useValue = arguments.length > 2;
        for (var i = 0; i < initializers.length; i++) {
          value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
        }
        return useValue ? value : void 0;
      }, "__runInitializers");
      __propKey = /* @__PURE__ */ __name(function(x) {
        return typeof x === "symbol" ? x : "".concat(x);
      }, "__propKey");
      __setFunctionName = /* @__PURE__ */ __name(function(f, name2, prefix) {
        if (typeof name2 === "symbol") name2 = name2.description ? "[".concat(name2.description, "]") : "";
        return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name2) : name2 });
      }, "__setFunctionName");
      __metadata = /* @__PURE__ */ __name(function(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
      }, "__metadata");
      __awaiter = /* @__PURE__ */ __name(function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        __name(adopt, "adopt");
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          __name(fulfilled, "fulfilled");
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          __name(rejected, "rejected");
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          __name(step, "step");
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      }, "__awaiter");
      __generator = /* @__PURE__ */ __name(function(thisArg, body) {
        var _ = { label: 0, sent: /* @__PURE__ */ __name(function() {
          if (t[0] & 1) throw t[1];
          return t[1];
        }, "sent"), trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
        return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() {
          return this;
        }), g;
        function verb(n) {
          return function(v) {
            return step([n, v]);
          };
        }
        __name(verb, "verb");
        function step(op) {
          if (f) throw new TypeError("Generator is already executing.");
          while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;
              case 4:
                _.label++;
                return { value: op[1], done: false };
              case 5:
                _.label++;
                y = op[1];
                op = [0];
                continue;
              case 7:
                op = _.ops.pop();
                _.trys.pop();
                continue;
              default:
                if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                  _ = 0;
                  continue;
                }
                if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                  _.label = op[1];
                  break;
                }
                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }
                if (t && _.label < t[2]) {
                  _.label = t[2];
                  _.ops.push(op);
                  break;
                }
                if (t[2]) _.ops.pop();
                _.trys.pop();
                continue;
            }
            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y = 0;
          } finally {
            f = t = 0;
          }
          if (op[0] & 5) throw op[1];
          return { value: op[0] ? op[1] : void 0, done: true };
        }
        __name(step, "step");
      }, "__generator");
      __exportStar = /* @__PURE__ */ __name(function(m, o) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
      }, "__exportStar");
      __createBinding = Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc2 = Object.getOwnPropertyDescriptor(m, k);
        if (!desc2 || ("get" in desc2 ? !m.__esModule : desc2.writable || desc2.configurable)) {
          desc2 = { enumerable: true, get: /* @__PURE__ */ __name(function() {
            return m[k];
          }, "get") };
        }
        Object.defineProperty(o, k2, desc2);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      });
      __values = /* @__PURE__ */ __name(function(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
          next: /* @__PURE__ */ __name(function() {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
          }, "next")
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
      }, "__values");
      __read = /* @__PURE__ */ __name(function(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
          while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        } catch (error) {
          e = { error };
        } finally {
          try {
            if (r && !r.done && (m = i["return"])) m.call(i);
          } finally {
            if (e) throw e.error;
          }
        }
        return ar;
      }, "__read");
      __spread = /* @__PURE__ */ __name(function() {
        for (var ar = [], i = 0; i < arguments.length; i++)
          ar = ar.concat(__read(arguments[i]));
        return ar;
      }, "__spread");
      __spreadArrays = /* @__PURE__ */ __name(function() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
          for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
        return r;
      }, "__spreadArrays");
      __spreadArray = /* @__PURE__ */ __name(function(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
          if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
          }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
      }, "__spreadArray");
      __await = /* @__PURE__ */ __name(function(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
      }, "__await");
      __asyncGenerator = /* @__PURE__ */ __name(function(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
          return this;
        }, i;
        function awaitReturn(f) {
          return function(v) {
            return Promise.resolve(v).then(f, reject);
          };
        }
        __name(awaitReturn, "awaitReturn");
        function verb(n, f) {
          if (g[n]) {
            i[n] = function(v) {
              return new Promise(function(a, b) {
                q.push([n, v, a, b]) > 1 || resume(n, v);
              });
            };
            if (f) i[n] = f(i[n]);
          }
        }
        __name(verb, "verb");
        function resume(n, v) {
          try {
            step(g[n](v));
          } catch (e) {
            settle(q[0][3], e);
          }
        }
        __name(resume, "resume");
        function step(r) {
          r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
        }
        __name(step, "step");
        function fulfill(value) {
          resume("next", value);
        }
        __name(fulfill, "fulfill");
        function reject(value) {
          resume("throw", value);
        }
        __name(reject, "reject");
        function settle(f, v) {
          if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
        }
        __name(settle, "settle");
      }, "__asyncGenerator");
      __asyncDelegator = /* @__PURE__ */ __name(function(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function(e) {
          throw e;
        }), verb("return"), i[Symbol.iterator] = function() {
          return this;
        }, i;
        function verb(n, f) {
          i[n] = o[n] ? function(v) {
            return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v;
          } : f;
        }
        __name(verb, "verb");
      }, "__asyncDelegator");
      __asyncValues = /* @__PURE__ */ __name(function(o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
          return this;
        }, i);
        function verb(n) {
          i[n] = o[n] && function(v) {
            return new Promise(function(resolve, reject) {
              v = o[n](v), settle(resolve, reject, v.done, v.value);
            });
          };
        }
        __name(verb, "verb");
        function settle(resolve, reject, d, v) {
          Promise.resolve(v).then(function(v2) {
            resolve({ value: v2, done: d });
          }, reject);
        }
        __name(settle, "settle");
      }, "__asyncValues");
      __makeTemplateObject = /* @__PURE__ */ __name(function(cooked, raw2) {
        if (Object.defineProperty) {
          Object.defineProperty(cooked, "raw", { value: raw2 });
        } else {
          cooked.raw = raw2;
        }
        return cooked;
      }, "__makeTemplateObject");
      var __setModuleDefault = Object.create ? (function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }) : function(o, v) {
        o["default"] = v;
      };
      var ownKeys = /* @__PURE__ */ __name(function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      }, "ownKeys");
      __importStar = /* @__PURE__ */ __name(function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      }, "__importStar");
      __importDefault = /* @__PURE__ */ __name(function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      }, "__importDefault");
      __classPrivateFieldGet = /* @__PURE__ */ __name(function(receiver, state, kind, f) {
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
      }, "__classPrivateFieldGet");
      __classPrivateFieldSet = /* @__PURE__ */ __name(function(receiver, state, value, kind, f) {
        if (kind === "m") throw new TypeError("Private method is not writable");
        if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
      }, "__classPrivateFieldSet");
      __classPrivateFieldIn = /* @__PURE__ */ __name(function(state, receiver) {
        if (receiver === null || typeof receiver !== "object" && typeof receiver !== "function") throw new TypeError("Cannot use 'in' operator on non-object");
        return typeof state === "function" ? receiver === state : state.has(receiver);
      }, "__classPrivateFieldIn");
      __addDisposableResource = /* @__PURE__ */ __name(function(env, value, async) {
        if (value !== null && value !== void 0) {
          if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
          var dispose, inner;
          if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
          }
          if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
          }
          if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
          if (inner) dispose = /* @__PURE__ */ __name(function() {
            try {
              inner.call(this);
            } catch (e) {
              return Promise.reject(e);
            }
          }, "dispose");
          env.stack.push({ value, dispose, async });
        } else if (async) {
          env.stack.push({ async: true });
        }
        return value;
      }, "__addDisposableResource");
      var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
      };
      __disposeResources = /* @__PURE__ */ __name(function(env) {
        function fail(e) {
          env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
          env.hasError = true;
        }
        __name(fail, "fail");
        var r, s = 0;
        function next() {
          while (r = env.stack.pop()) {
            try {
              if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
              if (r.dispose) {
                var result = r.dispose.call(r.value);
                if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
                  fail(e);
                  return next();
                });
              } else s |= 1;
            } catch (e) {
              fail(e);
            }
          }
          if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
          if (env.hasError) throw env.error;
        }
        __name(next, "next");
        return next();
      }, "__disposeResources");
      __rewriteRelativeImportExtension = /* @__PURE__ */ __name(function(path, preserveJsx) {
        if (typeof path === "string" && /^\.\.?\//.test(path)) {
          return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
          });
        }
        return path;
      }, "__rewriteRelativeImportExtension");
      exporter("__extends", __extends);
      exporter("__assign", __assign);
      exporter("__rest", __rest);
      exporter("__decorate", __decorate);
      exporter("__param", __param);
      exporter("__esDecorate", __esDecorate);
      exporter("__runInitializers", __runInitializers);
      exporter("__propKey", __propKey);
      exporter("__setFunctionName", __setFunctionName);
      exporter("__metadata", __metadata);
      exporter("__awaiter", __awaiter);
      exporter("__generator", __generator);
      exporter("__exportStar", __exportStar);
      exporter("__createBinding", __createBinding);
      exporter("__values", __values);
      exporter("__read", __read);
      exporter("__spread", __spread);
      exporter("__spreadArrays", __spreadArrays);
      exporter("__spreadArray", __spreadArray);
      exporter("__await", __await);
      exporter("__asyncGenerator", __asyncGenerator);
      exporter("__asyncDelegator", __asyncDelegator);
      exporter("__asyncValues", __asyncValues);
      exporter("__makeTemplateObject", __makeTemplateObject);
      exporter("__importStar", __importStar);
      exporter("__importDefault", __importDefault);
      exporter("__classPrivateFieldGet", __classPrivateFieldGet);
      exporter("__classPrivateFieldSet", __classPrivateFieldSet);
      exporter("__classPrivateFieldIn", __classPrivateFieldIn);
      exporter("__addDisposableResource", __addDisposableResource);
      exporter("__disposeResources", __disposeResources);
      exporter("__rewriteRelativeImportExtension", __rewriteRelativeImportExtension);
    });
  }
});

// ../../node_modules/.pnpm/lower-case@2.0.2/node_modules/lower-case/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/.pnpm/lower-case@2.0.2/node_modules/lower-case/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.lowerCase = exports.localeLowerCase = void 0;
    var SUPPORTED_LOCALE = {
      tr: {
        regexp: /\u0130|\u0049|\u0049\u0307/g,
        map: {
          \u0130: "i",
          I: "\u0131",
          I\u0307: "i"
        }
      },
      az: {
        regexp: /\u0130/g,
        map: {
          \u0130: "i",
          I: "\u0131",
          I\u0307: "i"
        }
      },
      lt: {
        regexp: /\u0049|\u004A|\u012E|\u00CC|\u00CD|\u0128/g,
        map: {
          I: "i\u0307",
          J: "j\u0307",
          \u012E: "\u012F\u0307",
          \u00CC: "i\u0307\u0300",
          \u00CD: "i\u0307\u0301",
          \u0128: "i\u0307\u0303"
        }
      }
    };
    function localeLowerCase(str, locale) {
      var lang = SUPPORTED_LOCALE[locale.toLowerCase()];
      if (lang)
        return lowerCase(str.replace(lang.regexp, function(m) {
          return lang.map[m];
        }));
      return lowerCase(str);
    }
    __name(localeLowerCase, "localeLowerCase");
    exports.localeLowerCase = localeLowerCase;
    function lowerCase(str) {
      return str.toLowerCase();
    }
    __name(lowerCase, "lowerCase");
    exports.lowerCase = lowerCase;
  }
});

// ../../node_modules/.pnpm/no-case@3.0.4/node_modules/no-case/dist/index.js
var require_dist2 = __commonJS({
  "../../node_modules/.pnpm/no-case@3.0.4/node_modules/no-case/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.noCase = void 0;
    var lower_case_1 = require_dist();
    var DEFAULT_SPLIT_REGEXP = [/([a-z0-9])([A-Z])/g, /([A-Z])([A-Z][a-z])/g];
    var DEFAULT_STRIP_REGEXP = /[^A-Z0-9]+/gi;
    function noCase(input, options) {
      if (options === void 0) {
        options = {};
      }
      var _a = options.splitRegexp, splitRegexp = _a === void 0 ? DEFAULT_SPLIT_REGEXP : _a, _b = options.stripRegexp, stripRegexp = _b === void 0 ? DEFAULT_STRIP_REGEXP : _b, _c = options.transform, transform = _c === void 0 ? lower_case_1.lowerCase : _c, _d = options.delimiter, delimiter = _d === void 0 ? " " : _d;
      var result = replace(replace(input, splitRegexp, "$1\0$2"), stripRegexp, "\0");
      var start = 0;
      var end = result.length;
      while (result.charAt(start) === "\0")
        start++;
      while (result.charAt(end - 1) === "\0")
        end--;
      return result.slice(start, end).split("\0").map(transform).join(delimiter);
    }
    __name(noCase, "noCase");
    exports.noCase = noCase;
    function replace(input, re, value) {
      if (re instanceof RegExp)
        return input.replace(re, value);
      return re.reduce(function(input2, re2) {
        return input2.replace(re2, value);
      }, input);
    }
    __name(replace, "replace");
  }
});

// ../../node_modules/.pnpm/dot-case@3.0.4/node_modules/dot-case/dist/index.js
var require_dist3 = __commonJS({
  "../../node_modules/.pnpm/dot-case@3.0.4/node_modules/dot-case/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dotCase = void 0;
    var tslib_1 = require_tslib();
    var no_case_1 = require_dist2();
    function dotCase(input, options) {
      if (options === void 0) {
        options = {};
      }
      return no_case_1.noCase(input, tslib_1.__assign({ delimiter: "." }, options));
    }
    __name(dotCase, "dotCase");
    exports.dotCase = dotCase;
  }
});

// ../../node_modules/.pnpm/snake-case@3.0.4/node_modules/snake-case/dist/index.js
var require_dist4 = __commonJS({
  "../../node_modules/.pnpm/snake-case@3.0.4/node_modules/snake-case/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.snakeCase = void 0;
    var tslib_1 = require_tslib();
    var dot_case_1 = require_dist3();
    function snakeCase(input, options) {
      if (options === void 0) {
        options = {};
      }
      return dot_case_1.dotCase(input, tslib_1.__assign({ delimiter: "_" }, options));
    }
    __name(snakeCase, "snakeCase");
    exports.snakeCase = snakeCase;
  }
});

// ../../node_modules/.pnpm/snakecase-keys@8.0.1/node_modules/snakecase-keys/index.js
var require_snakecase_keys = __commonJS({
  "../../node_modules/.pnpm/snakecase-keys@8.0.1/node_modules/snakecase-keys/index.js"(exports, module) {
    "use strict";
    var map = require_map_obj();
    var { snakeCase } = require_dist4();
    var PlainObjectConstructor = {}.constructor;
    module.exports = function(obj, options) {
      if (Array.isArray(obj)) {
        if (obj.some((item) => item.constructor !== PlainObjectConstructor)) {
          throw new Error("obj must be array of plain objects");
        }
      } else {
        if (obj.constructor !== PlainObjectConstructor) {
          throw new Error("obj must be an plain object");
        }
      }
      options = Object.assign({ deep: true, exclude: [], parsingOptions: {} }, options);
      return map(obj, function(key, val) {
        return [
          matches(options.exclude, key) ? key : snakeCase(key, options.parsingOptions),
          val,
          mapperOptions(key, val, options)
        ];
      }, options);
    };
    function matches(patterns, value) {
      return patterns.some(function(pattern) {
        return typeof pattern === "string" ? pattern === value : pattern.test(value);
      });
    }
    __name(matches, "matches");
    function mapperOptions(key, val, options) {
      return options.shouldRecurse ? { shouldRecurse: options.shouldRecurse(key, val) } : void 0;
    }
    __name(mapperOptions, "mapperOptions");
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs
var init_authorization_D2ans7vW = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs"() {
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/authorization.mjs
var init_authorization = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/authorization.mjs"() {
    init_authorization_D2ans7vW();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/jwtPayloadParser.mjs
var init_jwtPayloadParser = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/jwtPayloadParser.mjs"() {
    init_authorization_D2ans7vW();
  }
});

// ../../node_modules/.pnpm/cookie@1.0.2/node_modules/cookie/dist/index.js
var require_dist5 = __commonJS({
  "../../node_modules/.pnpm/cookie@1.0.2/node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = parse3;
    exports.serialize = serialize;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = /* @__PURE__ */ __name(function() {
      }, "C");
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parse3(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = str.indexOf("=", index);
        if (eqIdx === -1)
          break;
        const colonIdx = str.indexOf(";", index);
        const endIdx = colonIdx === -1 ? len : colonIdx;
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const keyStartIdx = startIndex(str, index, eqIdx);
        const keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
        const key = str.slice(keyStartIdx, keyEndIdx);
        if (obj[key] === void 0) {
          let valStartIdx = startIndex(str, eqIdx + 1, endIdx);
          let valEndIdx = endIndex(str, endIdx, valStartIdx);
          const value = dec(str.slice(valStartIdx, valEndIdx));
          obj[key] = value;
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    __name(parse3, "parse");
    function startIndex(str, index, max2) {
      do {
        const code = str.charCodeAt(index);
        if (code !== 32 && code !== 9)
          return index;
      } while (++index < max2);
      return max2;
    }
    __name(startIndex, "startIndex");
    function endIndex(str, index, min2) {
      while (index > min2) {
        const code = str.charCodeAt(--index);
        if (code !== 32 && code !== 9)
          return index + 1;
      }
      return min2;
    }
    __name(endIndex, "endIndex");
    function serialize(name2, val, options) {
      const enc2 = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(name2)) {
        throw new TypeError(`argument name is invalid: ${name2}`);
      }
      const value = enc2(val);
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${val}`);
      }
      let str = name2 + "=" + value;
      if (!options)
        return str;
      if (options.maxAge !== void 0) {
        if (!Number.isInteger(options.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${options.maxAge}`);
        }
        str += "; Max-Age=" + options.maxAge;
      }
      if (options.domain) {
        if (!domainValueRegExp.test(options.domain)) {
          throw new TypeError(`option domain is invalid: ${options.domain}`);
        }
        str += "; Domain=" + options.domain;
      }
      if (options.path) {
        if (!pathValueRegExp.test(options.path)) {
          throw new TypeError(`option path is invalid: ${options.path}`);
        }
        str += "; Path=" + options.path;
      }
      if (options.expires) {
        if (!isDate(options.expires) || !Number.isFinite(options.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${options.expires}`);
        }
        str += "; Expires=" + options.expires.toUTCString();
      }
      if (options.httpOnly) {
        str += "; HttpOnly";
      }
      if (options.secure) {
        str += "; Secure";
      }
      if (options.partitioned) {
        str += "; Partitioned";
      }
      if (options.priority) {
        const priority = typeof options.priority === "string" ? options.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${options.priority}`);
        }
      }
      if (options.sameSite) {
        const sameSite = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${options.sameSite}`);
        }
      }
      return str;
    }
    __name(serialize, "serialize");
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    __name(decode, "decode");
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
    __name(isDate, "isDate");
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/pathToRegexp-Bu45OrlU.mjs
var init_pathToRegexp_Bu45OrlU = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/pathToRegexp-Bu45OrlU.mjs"() {
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/pathToRegexp.mjs
var init_pathToRegexp = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/pathToRegexp.mjs"() {
    init_pathToRegexp_Bu45OrlU();
  }
});

// ../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-MQOIIRZU.mjs
function joinPaths(...args) {
  return args.filter((p) => p).join(SEPARATOR).replace(MULTIPLE_SEPARATOR_REGEX, SEPARATOR);
}
function getFromCache(kid) {
  return cache[kid];
}
function getCacheValues() {
  return Object.values(cache);
}
function setInCache(jwk, shouldExpire = true) {
  cache[jwk.kid] = jwk;
  lastUpdatedAt = shouldExpire ? Date.now() : -1;
}
function loadClerkJWKFromLocal(localKey) {
  if (!getFromCache(LocalJwkKid)) {
    if (!localKey) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.SetClerkJWTKey,
        message: "Missing local JWK.",
        reason: TokenVerificationErrorReason.LocalJWKMissing
      });
    }
    const modulus = localKey.replace(/\r\n|\n|\r/g, "").replace(PEM_HEADER, "").replace(PEM_TRAILER, "").replace(RSA_PREFIX, "").replace(RSA_SUFFIX, "").replace(/\+/g, "-").replace(/\//g, "_");
    setInCache(
      {
        kid: "local",
        kty: "RSA",
        alg: "RS256",
        n: modulus,
        e: "AQAB"
      },
      false
      // local key never expires in cache
    );
  }
  return getFromCache(LocalJwkKid);
}
async function loadClerkJWKFromRemote({
  secretKey,
  apiUrl = API_URL,
  apiVersion = API_VERSION,
  kid,
  skipJwksCache
}) {
  if (skipJwksCache || cacheHasExpired() || !getFromCache(kid)) {
    if (!secretKey) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: "Failed to load JWKS from Clerk Backend or Frontend API.",
        reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
      });
    }
    const fetcher = /* @__PURE__ */ __name(() => fetchJWKSFromBAPI(apiUrl, secretKey, apiVersion), "fetcher");
    const { keys } = await retry(fetcher);
    if (!keys || !keys.length) {
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: "The JWKS endpoint did not contain any signing keys. Contact support@clerk.com.",
        reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
      });
    }
    keys.forEach((key) => setInCache(key));
  }
  const jwk = getFromCache(kid);
  if (!jwk) {
    const cacheValues = getCacheValues();
    const jwkKeys = cacheValues.map((jwk2) => jwk2.kid).sort().join(", ");
    throw new TokenVerificationError({
      action: `Go to your Dashboard and validate your secret and public keys are correct. ${TokenVerificationErrorAction.ContactSupport} if the issue persists.`,
      message: `Unable to find a signing key in JWKS that matches the kid='${kid}' of the provided session token. Please make sure that the __session cookie or the HTTP authorization header contain a Clerk-generated session JWT. The following kid is available: ${jwkKeys}`,
      reason: TokenVerificationErrorReason.JWKKidMismatch
    });
  }
  return jwk;
}
async function fetchJWKSFromBAPI(apiUrl, key, apiVersion) {
  if (!key) {
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.SetClerkSecretKey,
      message: "Missing Clerk Secret Key or API Key. Go to https://dashboard.clerk.com and get your key for your instance.",
      reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
    });
  }
  const url = new URL(apiUrl);
  url.pathname = joinPaths(url.pathname, apiVersion, "/jwks");
  const response = await runtime.fetch(url.href, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Clerk-API-Version": SUPPORTED_BAPI_VERSION,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT
    }
  });
  if (!response.ok) {
    const json = await response.json();
    const invalidSecretKeyError = getErrorObjectByCode(json?.errors, TokenVerificationErrorCode.InvalidSecretKey);
    if (invalidSecretKeyError) {
      const reason = TokenVerificationErrorReason.InvalidSecretKey;
      throw new TokenVerificationError({
        action: TokenVerificationErrorAction.ContactSupport,
        message: invalidSecretKeyError.message,
        reason
      });
    }
    throw new TokenVerificationError({
      action: TokenVerificationErrorAction.ContactSupport,
      message: `Error loading Clerk JWKS from ${url.href} with code=${response.status}`,
      reason: TokenVerificationErrorReason.RemoteJWKFailedToLoad
    });
  }
  return response.json();
}
function cacheHasExpired() {
  if (lastUpdatedAt === -1) {
    return false;
  }
  const isExpired = Date.now() - lastUpdatedAt >= MAX_CACHE_LAST_UPDATED_AT_SECONDS * 1e3;
  if (isExpired) {
    cache = {};
  }
  return isExpired;
}
async function verifyToken(token, options) {
  const { data: decodedResult, errors } = decodeJwt(token);
  if (errors) {
    return { errors };
  }
  const { header } = decodedResult;
  const { kid } = header;
  try {
    let key;
    if (options.jwtKey) {
      key = loadClerkJWKFromLocal(options.jwtKey);
    } else if (options.secretKey) {
      key = await loadClerkJWKFromRemote({ ...options, kid });
    } else {
      return {
        errors: [
          new TokenVerificationError({
            action: TokenVerificationErrorAction.SetClerkJWTKey,
            message: "Failed to resolve JWK during verification.",
            reason: TokenVerificationErrorReason.JWKFailedToResolve
          })
        ]
      };
    }
    return await verifyJwt(token, { ...options, key });
  } catch (error) {
    return { errors: [error] };
  }
}
var import_snakecase_keys, import_cookie, API_URL, API_VERSION, USER_AGENT, MAX_CACHE_LAST_UPDATED_AT_SECONDS, SUPPORTED_BAPI_VERSION, Cookies, QueryParameters, SEPARATOR, MULTIPLE_SEPARATOR_REGEX, cache, lastUpdatedAt, LocalJwkKid, PEM_HEADER, PEM_TRAILER, RSA_PREFIX, RSA_SUFFIX, getErrorObjectByCode;
var init_chunk_MQOIIRZU = __esm({
  "../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-MQOIIRZU.mjs"() {
    init_chunk_LWOXHF4E();
    init_chunk_2Z4IRG2E();
    init_chunk_5JS2VYLU();
    init_error();
    import_snakecase_keys = __toESM(require_snakecase_keys(), 1);
    init_authorization();
    init_jwtPayloadParser();
    import_cookie = __toESM(require_dist5(), 1);
    init_pathToRegexp();
    API_URL = "https://api.clerk.com";
    API_VERSION = "v1";
    USER_AGENT = `${"@clerk/backend"}@${"1.34.0"}`;
    MAX_CACHE_LAST_UPDATED_AT_SECONDS = 5 * 60;
    SUPPORTED_BAPI_VERSION = "2025-04-10";
    Cookies = {
      Session: "__session",
      Refresh: "__refresh",
      ClientUat: "__client_uat",
      Handshake: "__clerk_handshake",
      DevBrowser: "__clerk_db_jwt",
      RedirectCount: "__clerk_redirect_count",
      HandshakeNonce: "__clerk_handshake_nonce"
    };
    QueryParameters = {
      ClerkSynced: "__clerk_synced",
      SuffixedCookies: "suffixed_cookies",
      ClerkRedirectUrl: "__clerk_redirect_url",
      // use the reference to Cookies to indicate that it's the same value
      DevBrowser: Cookies.DevBrowser,
      Handshake: Cookies.Handshake,
      HandshakeHelp: "__clerk_help",
      LegacyDevBrowser: "__dev_session",
      HandshakeReason: "__clerk_hs_reason",
      HandshakeNonce: Cookies.HandshakeNonce
    };
    SEPARATOR = "/";
    MULTIPLE_SEPARATOR_REGEX = new RegExp("(?<!:)" + SEPARATOR + "{1,}", "g");
    __name(joinPaths, "joinPaths");
    cache = {};
    lastUpdatedAt = 0;
    __name(getFromCache, "getFromCache");
    __name(getCacheValues, "getCacheValues");
    __name(setInCache, "setInCache");
    LocalJwkKid = "local";
    PEM_HEADER = "-----BEGIN PUBLIC KEY-----";
    PEM_TRAILER = "-----END PUBLIC KEY-----";
    RSA_PREFIX = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA";
    RSA_SUFFIX = "IDAQAB";
    __name(loadClerkJWKFromLocal, "loadClerkJWKFromLocal");
    __name(loadClerkJWKFromRemote, "loadClerkJWKFromRemote");
    __name(fetchJWKSFromBAPI, "fetchJWKSFromBAPI");
    __name(cacheHasExpired, "cacheHasExpired");
    getErrorObjectByCode = /* @__PURE__ */ __name((errors, code) => {
      if (!errors) {
        return null;
      }
      return errors.find((err) => err.code === code);
    }, "getErrorObjectByCode");
    __name(verifyToken, "verifyToken");
  }
});

// ../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-P263NW7Z.mjs
function withLegacyReturn(cb) {
  return async (...args) => {
    const { data, errors } = await cb(...args);
    if (errors) {
      throw errors[0];
    }
    return data;
  };
}
var init_chunk_P263NW7Z = __esm({
  "../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/chunk-P263NW7Z.mjs"() {
    __name(withLegacyReturn, "withLegacyReturn");
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs
function snakeToCamel(str) {
  return str ? str.replace(/([-_][a-z])/g, (match3) => match3.toUpperCase().replace(/-|_/, "")) : "";
}
function camelToSnake(str) {
  return str ? str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`) : "";
}
var createDeepObjectTransformer, deepCamelToSnake, deepSnakeToCamel;
var init_underscore_DjQrhefX = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs"() {
    __name(snakeToCamel, "snakeToCamel");
    __name(camelToSnake, "camelToSnake");
    createDeepObjectTransformer = /* @__PURE__ */ __name((transform) => {
      const deepTransform = /* @__PURE__ */ __name((obj) => {
        if (!obj) return obj;
        if (Array.isArray(obj)) return obj.map((el) => {
          if (typeof el === "object" || Array.isArray(el)) return deepTransform(el);
          return el;
        });
        const copy = { ...obj };
        const keys = Object.keys(copy);
        for (const oldName of keys) {
          const newName = transform(oldName.toString());
          if (newName !== oldName) {
            copy[newName] = copy[oldName];
            delete copy[oldName];
          }
          if (typeof copy[newName] === "object") copy[newName] = deepTransform(copy[newName]);
        }
        return copy;
      }, "deepTransform");
      return deepTransform;
    }, "createDeepObjectTransformer");
    deepCamelToSnake = createDeepObjectTransformer(camelToSnake);
    deepSnakeToCamel = createDeepObjectTransformer(snakeToCamel);
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/telemetry-wqMDWlvR.mjs
var init_telemetry_wqMDWlvR = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/telemetry-wqMDWlvR.mjs"() {
    init_keys_YNv6yjKk();
    init_underscore_DjQrhefX();
  }
});

// ../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/telemetry.mjs
var init_telemetry = __esm({
  "../../node_modules/.pnpm/@clerk+shared@3.47.2_react-_4da3eb5d54678219248f988ea72f8849/node_modules/@clerk/shared/dist/runtime/telemetry.mjs"() {
    init_constants_ByUssRbE();
    init_isomorphicAtob_DybBXGFR();
    init_isomorphicBtoa_Dr7WubZv();
    init_keys_YNv6yjKk();
    init_underscore_DjQrhefX();
    init_telemetry_wqMDWlvR();
  }
});

// ../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/index.mjs
var verifyToken2;
var init_dist2 = __esm({
  "../../node_modules/.pnpm/@clerk+backend@1.34.0_react_4203ab0a8ddd6eac60b63233e55cd145/node_modules/@clerk/backend/dist/index.mjs"() {
    init_chunk_MQOIIRZU();
    init_chunk_LWOXHF4E();
    init_chunk_P263NW7Z();
    init_chunk_2Z4IRG2E();
    init_chunk_5JS2VYLU();
    init_telemetry();
    verifyToken2 = withLegacyReturn(verifyToken);
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/entity.js
function is(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(
      `Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`
    );
  }
  let cls = value.constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}
var entityKind, hasOwnEntityKind;
var init_entity = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/entity.js"() {
    entityKind = /* @__PURE__ */ Symbol.for("drizzle:entityKind");
    hasOwnEntityKind = /* @__PURE__ */ Symbol.for("drizzle:hasOwnEntityKind");
    __name(is, "is");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/column.js
var Column;
var init_column = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/column.js"() {
    init_entity();
    Column = class {
      static {
        __name(this, "Column");
      }
      constructor(table, config2) {
        this.table = table;
        this.config = config2;
        this.name = config2.name;
        this.notNull = config2.notNull;
        this.default = config2.default;
        this.defaultFn = config2.defaultFn;
        this.onUpdateFn = config2.onUpdateFn;
        this.hasDefault = config2.hasDefault;
        this.primary = config2.primaryKey;
        this.isUnique = config2.isUnique;
        this.uniqueName = config2.uniqueName;
        this.uniqueType = config2.uniqueType;
        this.dataType = config2.dataType;
        this.columnType = config2.columnType;
        this.generated = config2.generated;
        this.generatedIdentity = config2.generatedIdentity;
      }
      static [entityKind] = "Column";
      name;
      primary;
      notNull;
      default;
      defaultFn;
      onUpdateFn;
      hasDefault;
      isUnique;
      uniqueName;
      uniqueType;
      dataType;
      columnType;
      enumValues = void 0;
      generated = void 0;
      generatedIdentity = void 0;
      config;
      mapFromDriverValue(value) {
        return value;
      }
      mapToDriverValue(value) {
        return value;
      }
      // ** @internal */
      shouldDisableInsert() {
        return this.config.generated !== void 0 && this.config.generated.type !== "byDefault";
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/column-builder.js
var ColumnBuilder;
var init_column_builder = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/column-builder.js"() {
    init_entity();
    ColumnBuilder = class {
      static {
        __name(this, "ColumnBuilder");
      }
      static [entityKind] = "ColumnBuilder";
      config;
      constructor(name2, dataType, columnType) {
        this.config = {
          name: name2,
          notNull: false,
          default: void 0,
          hasDefault: false,
          primaryKey: false,
          isUnique: false,
          uniqueName: void 0,
          uniqueType: void 0,
          dataType,
          columnType,
          generated: void 0
        };
      }
      /**
       * Changes the data type of the column. Commonly used with `json` columns. Also, useful for branded types.
       *
       * @example
       * ```ts
       * const users = pgTable('users', {
       * 	id: integer('id').$type<UserId>().primaryKey(),
       * 	details: json('details').$type<UserDetails>().notNull(),
       * });
       * ```
       */
      $type() {
        return this;
      }
      /**
       * Adds a `not null` clause to the column definition.
       *
       * Affects the `select` model of the table - columns *without* `not null` will be nullable on select.
       */
      notNull() {
        this.config.notNull = true;
        return this;
      }
      /**
       * Adds a `default <value>` clause to the column definition.
       *
       * Affects the `insert` model of the table - columns *with* `default` are optional on insert.
       *
       * If you need to set a dynamic default value, use {@link $defaultFn} instead.
       */
      default(value) {
        this.config.default = value;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Adds a dynamic default value to the column.
       * The function will be called when the row is inserted, and the returned value will be used as the column value.
       *
       * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
       */
      $defaultFn(fn) {
        this.config.defaultFn = fn;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Alias for {@link $defaultFn}.
       */
      $default = this.$defaultFn;
      /**
       * Adds a dynamic update value to the column.
       * The function will be called when the row is updated, and the returned value will be used as the column value if none is provided.
       * If no `default` (or `$defaultFn`) value is provided, the function will be called when the row is inserted as well, and the returned value will be used as the column value.
       *
       * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
       */
      $onUpdateFn(fn) {
        this.config.onUpdateFn = fn;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Alias for {@link $onUpdateFn}.
       */
      $onUpdate = this.$onUpdateFn;
      /**
       * Adds a `primary key` clause to the column definition. This implicitly makes the column `not null`.
       *
       * In SQLite, `integer primary key` implicitly makes the column auto-incrementing.
       */
      primaryKey() {
        this.config.primaryKey = true;
        this.config.notNull = true;
        return this;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/table.js
function isTable(table) {
  return typeof table === "object" && table !== null && IsDrizzleTable in table;
}
function getTableName(table) {
  return table[TableName];
}
function getTableUniqueName(table) {
  return `${table[Schema] ?? "public"}.${table[TableName]}`;
}
var TableName, Schema, Columns, ExtraConfigColumns, OriginalName, BaseName, IsAlias, ExtraConfigBuilder, IsDrizzleTable, Table;
var init_table = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/table.js"() {
    init_entity();
    TableName = /* @__PURE__ */ Symbol.for("drizzle:Name");
    Schema = /* @__PURE__ */ Symbol.for("drizzle:Schema");
    Columns = /* @__PURE__ */ Symbol.for("drizzle:Columns");
    ExtraConfigColumns = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigColumns");
    OriginalName = /* @__PURE__ */ Symbol.for("drizzle:OriginalName");
    BaseName = /* @__PURE__ */ Symbol.for("drizzle:BaseName");
    IsAlias = /* @__PURE__ */ Symbol.for("drizzle:IsAlias");
    ExtraConfigBuilder = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigBuilder");
    IsDrizzleTable = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleTable");
    Table = class {
      static {
        __name(this, "Table");
      }
      static [entityKind] = "Table";
      /** @internal */
      static Symbol = {
        Name: TableName,
        Schema,
        OriginalName,
        Columns,
        ExtraConfigColumns,
        BaseName,
        IsAlias,
        ExtraConfigBuilder
      };
      /**
       * @internal
       * Can be changed if the table is aliased.
       */
      [TableName];
      /**
       * @internal
       * Used to store the original name of the table, before any aliasing.
       */
      [OriginalName];
      /** @internal */
      [Schema];
      /** @internal */
      [Columns];
      /** @internal */
      [ExtraConfigColumns];
      /**
       *  @internal
       * Used to store the table name before the transformation via the `tableCreator` functions.
       */
      [BaseName];
      /** @internal */
      [IsAlias] = false;
      /** @internal */
      [IsDrizzleTable] = true;
      /** @internal */
      [ExtraConfigBuilder] = void 0;
      constructor(name2, schema, baseName) {
        this[TableName] = this[OriginalName] = name2;
        this[Schema] = schema;
        this[BaseName] = baseName;
      }
    };
    __name(isTable, "isTable");
    __name(getTableName, "getTableName");
    __name(getTableUniqueName, "getTableUniqueName");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/table.js
var InlineForeignKeys, PgTable;
var init_table2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/table.js"() {
    init_entity();
    init_table();
    InlineForeignKeys = /* @__PURE__ */ Symbol.for("drizzle:PgInlineForeignKeys");
    PgTable = class extends Table {
      static {
        __name(this, "PgTable");
      }
      static [entityKind] = "PgTable";
      /** @internal */
      static Symbol = Object.assign({}, Table.Symbol, {
        InlineForeignKeys
      });
      /**@internal */
      [InlineForeignKeys] = [];
      /** @internal */
      [Table.Symbol.ExtraConfigBuilder] = void 0;
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/foreign-keys.js
var ForeignKeyBuilder, ForeignKey;
var init_foreign_keys = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/foreign-keys.js"() {
    init_entity();
    init_table2();
    ForeignKeyBuilder = class {
      static {
        __name(this, "ForeignKeyBuilder");
      }
      static [entityKind] = "PgForeignKeyBuilder";
      /** @internal */
      reference;
      /** @internal */
      _onUpdate = "no action";
      /** @internal */
      _onDelete = "no action";
      constructor(config2, actions) {
        this.reference = () => {
          const { name: name2, columns, foreignColumns } = config2();
          return { name: name2, columns, foreignTable: foreignColumns[0].table, foreignColumns };
        };
        if (actions) {
          this._onUpdate = actions.onUpdate;
          this._onDelete = actions.onDelete;
        }
      }
      onUpdate(action) {
        this._onUpdate = action === void 0 ? "no action" : action;
        return this;
      }
      onDelete(action) {
        this._onDelete = action === void 0 ? "no action" : action;
        return this;
      }
      /** @internal */
      build(table) {
        return new ForeignKey(table, this);
      }
    };
    ForeignKey = class {
      static {
        __name(this, "ForeignKey");
      }
      constructor(table, builder) {
        this.table = table;
        this.reference = builder.reference;
        this.onUpdate = builder._onUpdate;
        this.onDelete = builder._onDelete;
      }
      static [entityKind] = "PgForeignKey";
      reference;
      onUpdate;
      onDelete;
      getName() {
        const { name: name2, columns, foreignColumns } = this.reference();
        const columnNames = columns.map((column) => column.name);
        const foreignColumnNames = foreignColumns.map((column) => column.name);
        const chunks = [
          this.table[PgTable.Symbol.Name],
          ...columnNames,
          foreignColumns[0].table[PgTable.Symbol.Name],
          ...foreignColumnNames
        ];
        return name2 ?? `${chunks.join("_")}_fk`;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/tracing-utils.js
function iife(fn, ...args) {
  return fn(...args);
}
var init_tracing_utils = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/tracing-utils.js"() {
    __name(iife, "iife");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/unique-constraint.js
function uniqueKeyName(table, columns) {
  return `${table[PgTable.Symbol.Name]}_${columns.join("_")}_unique`;
}
var UniqueConstraintBuilder, UniqueOnConstraintBuilder, UniqueConstraint;
var init_unique_constraint = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/unique-constraint.js"() {
    init_entity();
    init_table2();
    __name(uniqueKeyName, "uniqueKeyName");
    UniqueConstraintBuilder = class {
      static {
        __name(this, "UniqueConstraintBuilder");
      }
      constructor(columns, name2) {
        this.name = name2;
        this.columns = columns;
      }
      static [entityKind] = "PgUniqueConstraintBuilder";
      /** @internal */
      columns;
      /** @internal */
      nullsNotDistinctConfig = false;
      nullsNotDistinct() {
        this.nullsNotDistinctConfig = true;
        return this;
      }
      /** @internal */
      build(table) {
        return new UniqueConstraint(table, this.columns, this.nullsNotDistinctConfig, this.name);
      }
    };
    UniqueOnConstraintBuilder = class {
      static {
        __name(this, "UniqueOnConstraintBuilder");
      }
      static [entityKind] = "PgUniqueOnConstraintBuilder";
      /** @internal */
      name;
      constructor(name2) {
        this.name = name2;
      }
      on(...columns) {
        return new UniqueConstraintBuilder(columns, this.name);
      }
    };
    UniqueConstraint = class {
      static {
        __name(this, "UniqueConstraint");
      }
      constructor(table, columns, nullsNotDistinct, name2) {
        this.table = table;
        this.columns = columns;
        this.name = name2 ?? uniqueKeyName(this.table, this.columns.map((column) => column.name));
        this.nullsNotDistinct = nullsNotDistinct;
      }
      static [entityKind] = "PgUniqueConstraint";
      columns;
      name;
      nullsNotDistinct = false;
      getName() {
        return this.name;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/utils/array.js
function parsePgArrayValue(arrayString, startFrom, inQuotes) {
  for (let i = startFrom; i < arrayString.length; i++) {
    const char = arrayString[i];
    if (char === "\\") {
      i++;
      continue;
    }
    if (char === '"') {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i + 1];
    }
    if (inQuotes) {
      continue;
    }
    if (char === "," || char === "}") {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i];
    }
  }
  return [arrayString.slice(startFrom).replace(/\\/g, ""), arrayString.length];
}
function parsePgNestedArray(arrayString, startFrom = 0) {
  const result = [];
  let i = startFrom;
  let lastCharIsComma = false;
  while (i < arrayString.length) {
    const char = arrayString[i];
    if (char === ",") {
      if (lastCharIsComma || i === startFrom) {
        result.push("");
      }
      lastCharIsComma = true;
      i++;
      continue;
    }
    lastCharIsComma = false;
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (char === '"') {
      const [value2, startFrom2] = parsePgArrayValue(arrayString, i + 1, true);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    if (char === "}") {
      return [result, i + 1];
    }
    if (char === "{") {
      const [value2, startFrom2] = parsePgNestedArray(arrayString, i + 1);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    const [value, newStartFrom] = parsePgArrayValue(arrayString, i, false);
    result.push(value);
    i = newStartFrom;
  }
  return [result, i];
}
function parsePgArray(arrayString) {
  const [result] = parsePgNestedArray(arrayString, 1);
  return result;
}
function makePgArray(array) {
  return `{${array.map((item) => {
    if (Array.isArray(item)) {
      return makePgArray(item);
    }
    if (typeof item === "string") {
      return `"${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return `${item}`;
  }).join(",")}}`;
}
var init_array = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/utils/array.js"() {
    __name(parsePgArrayValue, "parsePgArrayValue");
    __name(parsePgNestedArray, "parsePgNestedArray");
    __name(parsePgArray, "parsePgArray");
    __name(makePgArray, "makePgArray");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/columns/common.js
var PgColumnBuilder, PgColumn, ExtraConfigColumn, IndexedColumn, PgArrayBuilder, PgArray;
var init_common = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/columns/common.js"() {
    init_column_builder();
    init_column();
    init_entity();
    init_foreign_keys();
    init_tracing_utils();
    init_unique_constraint();
    init_array();
    PgColumnBuilder = class extends ColumnBuilder {
      static {
        __name(this, "PgColumnBuilder");
      }
      foreignKeyConfigs = [];
      static [entityKind] = "PgColumnBuilder";
      array(size) {
        return new PgArrayBuilder(this.config.name, this, size);
      }
      references(ref, actions = {}) {
        this.foreignKeyConfigs.push({ ref, actions });
        return this;
      }
      unique(name2, config2) {
        this.config.isUnique = true;
        this.config.uniqueName = name2;
        this.config.uniqueType = config2?.nulls;
        return this;
      }
      generatedAlwaysAs(as) {
        this.config.generated = {
          as,
          type: "always",
          mode: "stored"
        };
        return this;
      }
      /** @internal */
      buildForeignKeys(column, table) {
        return this.foreignKeyConfigs.map(({ ref, actions }) => {
          return iife(
            (ref2, actions2) => {
              const builder = new ForeignKeyBuilder(() => {
                const foreignColumn = ref2();
                return { columns: [column], foreignColumns: [foreignColumn] };
              });
              if (actions2.onUpdate) {
                builder.onUpdate(actions2.onUpdate);
              }
              if (actions2.onDelete) {
                builder.onDelete(actions2.onDelete);
              }
              return builder.build(table);
            },
            ref,
            actions
          );
        });
      }
      /** @internal */
      buildExtraConfigColumn(table) {
        return new ExtraConfigColumn(table, this.config);
      }
    };
    PgColumn = class extends Column {
      static {
        __name(this, "PgColumn");
      }
      constructor(table, config2) {
        if (!config2.uniqueName) {
          config2.uniqueName = uniqueKeyName(table, [config2.name]);
        }
        super(table, config2);
        this.table = table;
      }
      static [entityKind] = "PgColumn";
    };
    ExtraConfigColumn = class extends PgColumn {
      static {
        __name(this, "ExtraConfigColumn");
      }
      static [entityKind] = "ExtraConfigColumn";
      getSQLType() {
        return this.getSQLType();
      }
      indexConfig = {
        order: this.config.order ?? "asc",
        nulls: this.config.nulls ?? "last",
        opClass: this.config.opClass
      };
      defaultConfig = {
        order: "asc",
        nulls: "last",
        opClass: void 0
      };
      asc() {
        this.indexConfig.order = "asc";
        return this;
      }
      desc() {
        this.indexConfig.order = "desc";
        return this;
      }
      nullsFirst() {
        this.indexConfig.nulls = "first";
        return this;
      }
      nullsLast() {
        this.indexConfig.nulls = "last";
        return this;
      }
      /**
       * ### PostgreSQL documentation quote
       *
       * > An operator class with optional parameters can be specified for each column of an index.
       * The operator class identifies the operators to be used by the index for that column.
       * For example, a B-tree index on four-byte integers would use the int4_ops class;
       * this operator class includes comparison functions for four-byte integers.
       * In practice the default operator class for the column's data type is usually sufficient.
       * The main point of having operator classes is that for some data types, there could be more than one meaningful ordering.
       * For example, we might want to sort a complex-number data type either by absolute value or by real part.
       * We could do this by defining two operator classes for the data type and then selecting the proper class when creating an index.
       * More information about operator classes check:
       *
       * ### Useful links
       * https://www.postgresql.org/docs/current/sql-createindex.html
       *
       * https://www.postgresql.org/docs/current/indexes-opclass.html
       *
       * https://www.postgresql.org/docs/current/xindex.html
       *
       * ### Additional types
       * If you have the `pg_vector` extension installed in your database, you can use the
       * `vector_l2_ops`, `vector_ip_ops`, `vector_cosine_ops`, `vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`, `halfvec_l2_ops`, `sparsevec_l2_ops` options, which are predefined types.
       *
       * **You can always specify any string you want in the operator class, in case Drizzle doesn't have it natively in its types**
       *
       * @param opClass
       * @returns
       */
      op(opClass) {
        this.indexConfig.opClass = opClass;
        return this;
      }
    };
    IndexedColumn = class {
      static {
        __name(this, "IndexedColumn");
      }
      static [entityKind] = "IndexedColumn";
      constructor(name2, type, indexConfig) {
        this.name = name2;
        this.type = type;
        this.indexConfig = indexConfig;
      }
      name;
      type;
      indexConfig;
    };
    PgArrayBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgArrayBuilder");
      }
      static [entityKind] = "PgArrayBuilder";
      constructor(name2, baseBuilder, size) {
        super(name2, "array", "PgArray");
        this.config.baseBuilder = baseBuilder;
        this.config.size = size;
      }
      /** @internal */
      build(table) {
        const baseColumn = this.config.baseBuilder.build(table);
        return new PgArray(
          table,
          this.config,
          baseColumn
        );
      }
    };
    PgArray = class _PgArray extends PgColumn {
      static {
        __name(this, "PgArray");
      }
      constructor(table, config2, baseColumn, range) {
        super(table, config2);
        this.baseColumn = baseColumn;
        this.range = range;
        this.size = config2.size;
      }
      size;
      static [entityKind] = "PgArray";
      getSQLType() {
        return `${this.baseColumn.getSQLType()}[${typeof this.size === "number" ? this.size : ""}]`;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          value = parsePgArray(value);
        }
        return value.map((v) => this.baseColumn.mapFromDriverValue(v));
      }
      mapToDriverValue(value, isNestedArray = false) {
        const a = value.map(
          (v) => v === null ? null : is(this.baseColumn, _PgArray) ? this.baseColumn.mapToDriverValue(v, true) : this.baseColumn.mapToDriverValue(v)
        );
        if (isNestedArray)
          return a;
        return makePgArray(a);
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/columns/enum.js
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}
var isPgEnumSym, PgEnumColumnBuilder, PgEnumColumn;
var init_enum = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/columns/enum.js"() {
    init_entity();
    init_common();
    isPgEnumSym = /* @__PURE__ */ Symbol.for("drizzle:isPgEnum");
    __name(isPgEnum, "isPgEnum");
    PgEnumColumnBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgEnumColumnBuilder");
      }
      static [entityKind] = "PgEnumColumnBuilder";
      constructor(name2, enumInstance) {
        super(name2, "string", "PgEnumColumn");
        this.config.enum = enumInstance;
      }
      /** @internal */
      build(table) {
        return new PgEnumColumn(
          table,
          this.config
        );
      }
    };
    PgEnumColumn = class extends PgColumn {
      static {
        __name(this, "PgEnumColumn");
      }
      static [entityKind] = "PgEnumColumn";
      enum = this.config.enum;
      enumValues = this.config.enum.enumValues;
      constructor(table, config2) {
        super(table, config2);
        this.enum = config2.enum;
      }
      getSQLType() {
        return this.enum.enumName;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/subquery.js
var Subquery, WithSubquery;
var init_subquery = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/subquery.js"() {
    init_entity();
    Subquery = class {
      static {
        __name(this, "Subquery");
      }
      static [entityKind] = "Subquery";
      constructor(sql4, selection, alias, isWith = false) {
        this._ = {
          brand: "Subquery",
          sql: sql4,
          selectedFields: selection,
          alias,
          isWith
        };
      }
      // getSQL(): SQL<unknown> {
      // 	return new SQL([this]);
      // }
    };
    WithSubquery = class extends Subquery {
      static {
        __name(this, "WithSubquery");
      }
      static [entityKind] = "WithSubquery";
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/version.js
var version;
var init_version = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/version.js"() {
    version = "0.33.0";
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/tracing.js
var otel, rawTracer, tracer;
var init_tracing = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/tracing.js"() {
    init_tracing_utils();
    init_version();
    tracer = {
      startActiveSpan(name2, fn) {
        if (!otel) {
          return fn();
        }
        if (!rawTracer) {
          rawTracer = otel.trace.getTracer("drizzle-orm", version);
        }
        return iife(
          (otel2, rawTracer2) => rawTracer2.startActiveSpan(
            name2,
            (span) => {
              try {
                return fn(span);
              } catch (e) {
                span.setStatus({
                  code: otel2.SpanStatusCode.ERROR,
                  message: e instanceof Error ? e.message : "Unknown error"
                  // eslint-disable-line no-instanceof/no-instanceof
                });
                throw e;
              } finally {
                span.end();
              }
            }
          ),
          otel,
          rawTracer
        );
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/view-common.js
var ViewBaseConfig;
var init_view_common = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/view-common.js"() {
    ViewBaseConfig = /* @__PURE__ */ Symbol.for("drizzle:ViewBaseConfig");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/sql.js
function isSQLWrapper(value) {
  return value !== null && value !== void 0 && typeof value.getSQL === "function";
}
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}
function name(value) {
  return new Name(value);
}
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
function param(value, encoder) {
  return new Param(value, encoder);
}
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
function placeholder(name2) {
  return new Placeholder(name2);
}
function fillPlaceholders(params, values) {
  return params.map((p) => {
    if (is(p, Placeholder)) {
      if (!(p.name in values)) {
        throw new Error(`No value for placeholder "${p.name}" was provided`);
      }
      return values[p.name];
    }
    if (is(p, Param) && is(p.value, Placeholder)) {
      if (!(p.value.name in values)) {
        throw new Error(`No value for placeholder "${p.value.name}" was provided`);
      }
      return p.encoder.mapToDriverValue(values[p.value.name]);
    }
    return p;
  });
}
var FakePrimitiveParam, StringChunk, SQL, Name, noopDecoder, noopEncoder, noopMapper, Param, Placeholder, View;
var init_sql = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/sql.js"() {
    init_entity();
    init_enum();
    init_subquery();
    init_tracing();
    init_view_common();
    init_column();
    init_table();
    FakePrimitiveParam = class {
      static {
        __name(this, "FakePrimitiveParam");
      }
      static [entityKind] = "FakePrimitiveParam";
    };
    __name(isSQLWrapper, "isSQLWrapper");
    __name(mergeQueries, "mergeQueries");
    StringChunk = class {
      static {
        __name(this, "StringChunk");
      }
      static [entityKind] = "StringChunk";
      value;
      constructor(value) {
        this.value = Array.isArray(value) ? value : [value];
      }
      getSQL() {
        return new SQL([this]);
      }
    };
    SQL = class _SQL {
      static {
        __name(this, "SQL");
      }
      constructor(queryChunks) {
        this.queryChunks = queryChunks;
      }
      static [entityKind] = "SQL";
      /** @internal */
      decoder = noopDecoder;
      shouldInlineParams = false;
      append(query) {
        this.queryChunks.push(...query.queryChunks);
        return this;
      }
      toQuery(config2) {
        return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
          const query = this.buildQueryFromSourceParams(this.queryChunks, config2);
          span?.setAttributes({
            "drizzle.query.text": query.sql,
            "drizzle.query.params": JSON.stringify(query.params)
          });
          return query;
        });
      }
      buildQueryFromSourceParams(chunks, _config) {
        const config2 = Object.assign({}, _config, {
          inlineParams: _config.inlineParams || this.shouldInlineParams,
          paramStartIndex: _config.paramStartIndex || { value: 0 }
        });
        const {
          escapeName,
          escapeParam,
          prepareTyping,
          inlineParams,
          paramStartIndex
        } = config2;
        return mergeQueries(chunks.map((chunk) => {
          if (is(chunk, StringChunk)) {
            return { sql: chunk.value.join(""), params: [] };
          }
          if (is(chunk, Name)) {
            return { sql: escapeName(chunk.value), params: [] };
          }
          if (chunk === void 0) {
            return { sql: "", params: [] };
          }
          if (Array.isArray(chunk)) {
            const result = [new StringChunk("(")];
            for (const [i, p] of chunk.entries()) {
              result.push(p);
              if (i < chunk.length - 1) {
                result.push(new StringChunk(", "));
              }
            }
            result.push(new StringChunk(")"));
            return this.buildQueryFromSourceParams(result, config2);
          }
          if (is(chunk, _SQL)) {
            return this.buildQueryFromSourceParams(chunk.queryChunks, {
              ...config2,
              inlineParams: inlineParams || chunk.shouldInlineParams
            });
          }
          if (is(chunk, Table)) {
            const schemaName = chunk[Table.Symbol.Schema];
            const tableName = chunk[Table.Symbol.Name];
            return {
              sql: schemaName === void 0 ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
              params: []
            };
          }
          if (is(chunk, Column)) {
            if (_config.invokeSource === "indexes") {
              return { sql: escapeName(chunk.name), params: [] };
            }
            return { sql: escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(chunk.name), params: [] };
          }
          if (is(chunk, View)) {
            const schemaName = chunk[ViewBaseConfig].schema;
            const viewName = chunk[ViewBaseConfig].name;
            return {
              sql: schemaName === void 0 ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
              params: []
            };
          }
          if (is(chunk, Param)) {
            if (is(chunk.value, Placeholder)) {
              return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
            }
            const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
            if (is(mappedValue, _SQL)) {
              return this.buildQueryFromSourceParams([mappedValue], config2);
            }
            if (inlineParams) {
              return { sql: this.mapInlineParam(mappedValue, config2), params: [] };
            }
            let typings = ["none"];
            if (prepareTyping) {
              typings = [prepareTyping(chunk.encoder)];
            }
            return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
          }
          if (is(chunk, Placeholder)) {
            return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
          }
          if (is(chunk, _SQL.Aliased) && chunk.fieldAlias !== void 0) {
            return { sql: escapeName(chunk.fieldAlias), params: [] };
          }
          if (is(chunk, Subquery)) {
            if (chunk._.isWith) {
              return { sql: escapeName(chunk._.alias), params: [] };
            }
            return this.buildQueryFromSourceParams([
              new StringChunk("("),
              chunk._.sql,
              new StringChunk(") "),
              new Name(chunk._.alias)
            ], config2);
          }
          if (isPgEnum(chunk)) {
            if (chunk.schema) {
              return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
            }
            return { sql: escapeName(chunk.enumName), params: [] };
          }
          if (isSQLWrapper(chunk)) {
            if (chunk.shouldOmitSQLParens?.()) {
              return this.buildQueryFromSourceParams([chunk.getSQL()], config2);
            }
            return this.buildQueryFromSourceParams([
              new StringChunk("("),
              chunk.getSQL(),
              new StringChunk(")")
            ], config2);
          }
          if (inlineParams) {
            return { sql: this.mapInlineParam(chunk, config2), params: [] };
          }
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }));
      }
      mapInlineParam(chunk, { escapeString }) {
        if (chunk === null) {
          return "null";
        }
        if (typeof chunk === "number" || typeof chunk === "boolean") {
          return chunk.toString();
        }
        if (typeof chunk === "string") {
          return escapeString(chunk);
        }
        if (typeof chunk === "object") {
          const mappedValueAsString = chunk.toString();
          if (mappedValueAsString === "[object Object]") {
            return escapeString(JSON.stringify(chunk));
          }
          return escapeString(mappedValueAsString);
        }
        throw new Error("Unexpected param value: " + chunk);
      }
      getSQL() {
        return this;
      }
      as(alias) {
        if (alias === void 0) {
          return this;
        }
        return new _SQL.Aliased(this, alias);
      }
      mapWith(decoder) {
        this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
        return this;
      }
      inlineParams() {
        this.shouldInlineParams = true;
        return this;
      }
      /**
       * This method is used to conditionally include a part of the query.
       *
       * @param condition - Condition to check
       * @returns itself if the condition is `true`, otherwise `undefined`
       */
      if(condition) {
        return condition ? this : void 0;
      }
    };
    Name = class {
      static {
        __name(this, "Name");
      }
      constructor(value) {
        this.value = value;
      }
      static [entityKind] = "Name";
      brand;
      getSQL() {
        return new SQL([this]);
      }
    };
    __name(name, "name");
    __name(isDriverValueEncoder, "isDriverValueEncoder");
    noopDecoder = {
      mapFromDriverValue: /* @__PURE__ */ __name((value) => value, "mapFromDriverValue")
    };
    noopEncoder = {
      mapToDriverValue: /* @__PURE__ */ __name((value) => value, "mapToDriverValue")
    };
    noopMapper = {
      ...noopDecoder,
      ...noopEncoder
    };
    Param = class {
      static {
        __name(this, "Param");
      }
      /**
       * @param value - Parameter value
       * @param encoder - Encoder to convert the value to a driver parameter
       */
      constructor(value, encoder = noopEncoder) {
        this.value = value;
        this.encoder = encoder;
      }
      static [entityKind] = "Param";
      brand;
      getSQL() {
        return new SQL([this]);
      }
    };
    __name(param, "param");
    __name(sql, "sql");
    ((sql22) => {
      function empty() {
        return new SQL([]);
      }
      __name(empty, "empty");
      sql22.empty = empty;
      function fromList(list) {
        return new SQL(list);
      }
      __name(fromList, "fromList");
      sql22.fromList = fromList;
      function raw2(str) {
        return new SQL([new StringChunk(str)]);
      }
      __name(raw2, "raw");
      sql22.raw = raw2;
      function join(chunks, separator) {
        const result = [];
        for (const [i, chunk] of chunks.entries()) {
          if (i > 0 && separator !== void 0) {
            result.push(separator);
          }
          result.push(chunk);
        }
        return new SQL(result);
      }
      __name(join, "join");
      sql22.join = join;
      function identifier(value) {
        return new Name(value);
      }
      __name(identifier, "identifier");
      sql22.identifier = identifier;
      function placeholder2(name2) {
        return new Placeholder(name2);
      }
      __name(placeholder2, "placeholder2");
      sql22.placeholder = placeholder2;
      function param2(value, encoder) {
        return new Param(value, encoder);
      }
      __name(param2, "param2");
      sql22.param = param2;
    })(sql || (sql = {}));
    ((SQL2) => {
      class Aliased {
        static {
          __name(this, "Aliased");
        }
        constructor(sql22, fieldAlias) {
          this.sql = sql22;
          this.fieldAlias = fieldAlias;
        }
        static [entityKind] = "SQL.Aliased";
        /** @internal */
        isSelectionField = false;
        getSQL() {
          return this.sql;
        }
        /** @internal */
        clone() {
          return new Aliased(this.sql, this.fieldAlias);
        }
      }
      SQL2.Aliased = Aliased;
    })(SQL || (SQL = {}));
    Placeholder = class {
      static {
        __name(this, "Placeholder");
      }
      constructor(name2) {
        this.name = name2;
      }
      static [entityKind] = "Placeholder";
      getSQL() {
        return new SQL([this]);
      }
    };
    __name(placeholder, "placeholder");
    __name(fillPlaceholders, "fillPlaceholders");
    View = class {
      static {
        __name(this, "View");
      }
      static [entityKind] = "View";
      /** @internal */
      [ViewBaseConfig];
      constructor({ name: name2, schema, selectedFields, query }) {
        this[ViewBaseConfig] = {
          name: name2,
          originalName: name2,
          schema,
          selectedFields,
          query,
          isExisting: !query,
          isAlias: false
        };
      }
      getSQL() {
        return new SQL([this]);
      }
    };
    Column.prototype.getSQL = function() {
      return new SQL([this]);
    };
    Table.prototype.getSQL = function() {
      return new SQL([this]);
    };
    Subquery.prototype.getSQL = function() {
      return new SQL([this]);
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/alias.js
function aliasedTable(table, tableAlias) {
  return new Proxy(table, new TableAliasProxyHandler(tableAlias, false));
}
function aliasedRelation(relation, tableAlias) {
  return new Proxy(relation, new RelationTableAliasProxyHandler(tableAlias));
}
function aliasedTableColumn(column, tableAlias) {
  return new Proxy(
    column,
    new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false)))
  );
}
function mapColumnsInAliasedSQLToAlias(query, alias) {
  return new SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
}
function mapColumnsInSQLToAlias(query, alias) {
  return sql.join(query.queryChunks.map((c) => {
    if (is(c, Column)) {
      return aliasedTableColumn(c, alias);
    }
    if (is(c, SQL)) {
      return mapColumnsInSQLToAlias(c, alias);
    }
    if (is(c, SQL.Aliased)) {
      return mapColumnsInAliasedSQLToAlias(c, alias);
    }
    return c;
  }));
}
var ColumnAliasProxyHandler, TableAliasProxyHandler, RelationTableAliasProxyHandler;
var init_alias = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/alias.js"() {
    init_column();
    init_entity();
    init_sql();
    init_table();
    init_view_common();
    ColumnAliasProxyHandler = class {
      static {
        __name(this, "ColumnAliasProxyHandler");
      }
      constructor(table) {
        this.table = table;
      }
      static [entityKind] = "ColumnAliasProxyHandler";
      get(columnObj, prop) {
        if (prop === "table") {
          return this.table;
        }
        return columnObj[prop];
      }
    };
    TableAliasProxyHandler = class {
      static {
        __name(this, "TableAliasProxyHandler");
      }
      constructor(alias, replaceOriginalName) {
        this.alias = alias;
        this.replaceOriginalName = replaceOriginalName;
      }
      static [entityKind] = "TableAliasProxyHandler";
      get(target, prop) {
        if (prop === Table.Symbol.IsAlias) {
          return true;
        }
        if (prop === Table.Symbol.Name) {
          return this.alias;
        }
        if (this.replaceOriginalName && prop === Table.Symbol.OriginalName) {
          return this.alias;
        }
        if (prop === ViewBaseConfig) {
          return {
            ...target[ViewBaseConfig],
            name: this.alias,
            isAlias: true
          };
        }
        if (prop === Table.Symbol.Columns) {
          const columns = target[Table.Symbol.Columns];
          if (!columns) {
            return columns;
          }
          const proxiedColumns = {};
          Object.keys(columns).map((key) => {
            proxiedColumns[key] = new Proxy(
              columns[key],
              new ColumnAliasProxyHandler(new Proxy(target, this))
            );
          });
          return proxiedColumns;
        }
        const value = target[prop];
        if (is(value, Column)) {
          return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
        }
        return value;
      }
    };
    RelationTableAliasProxyHandler = class {
      static {
        __name(this, "RelationTableAliasProxyHandler");
      }
      constructor(alias) {
        this.alias = alias;
      }
      static [entityKind] = "RelationTableAliasProxyHandler";
      get(target, prop) {
        if (prop === "sourceTable") {
          return aliasedTable(target.sourceTable, this.alias);
        }
        return target[prop];
      }
    };
    __name(aliasedTable, "aliasedTable");
    __name(aliasedRelation, "aliasedRelation");
    __name(aliasedTableColumn, "aliasedTableColumn");
    __name(mapColumnsInAliasedSQLToAlias, "mapColumnsInAliasedSQLToAlias");
    __name(mapColumnsInSQLToAlias, "mapColumnsInSQLToAlias");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/errors.js
var DrizzleError, TransactionRollbackError;
var init_errors = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/errors.js"() {
    init_entity();
    DrizzleError = class extends Error {
      static {
        __name(this, "DrizzleError");
      }
      static [entityKind] = "DrizzleError";
      constructor({ message, cause }) {
        super(message);
        this.name = "DrizzleError";
        this.cause = cause;
      }
    };
    TransactionRollbackError = class extends DrizzleError {
      static {
        __name(this, "TransactionRollbackError");
      }
      static [entityKind] = "TransactionRollbackError";
      constructor() {
        super({ message: "Rollback" });
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/expressions/conditions.js
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is(value, Param) && !is(value, Placeholder) && !is(value, Column) && !is(value, Table) && !is(value, View)) {
    return new Param(value, column);
  }
  return value;
}
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
function not(condition) {
  return sql`not ${condition}`;
}
function inArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} in ${bindIfParam(values, column)}`;
}
function notInArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`true`;
    }
    return sql`${column} not in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} not in ${bindIfParam(values, column)}`;
}
function isNull(value) {
  return sql`${value} is null`;
}
function isNotNull(value) {
  return sql`${value} is not null`;
}
function exists(subquery) {
  return sql`exists ${subquery}`;
}
function notExists(subquery) {
  return sql`not exists ${subquery}`;
}
function between(column, min2, max2) {
  return sql`${column} between ${bindIfParam(min2, column)} and ${bindIfParam(
    max2,
    column
  )}`;
}
function notBetween(column, min2, max2) {
  return sql`${column} not between ${bindIfParam(
    min2,
    column
  )} and ${bindIfParam(max2, column)}`;
}
function like(column, value) {
  return sql`${column} like ${value}`;
}
function notLike(column, value) {
  return sql`${column} not like ${value}`;
}
function ilike(column, value) {
  return sql`${column} ilike ${value}`;
}
function notIlike(column, value) {
  return sql`${column} not ilike ${value}`;
}
function arrayContains(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      throw new Error("arrayContains requires at least one value");
    }
    const array = sql`${bindIfParam(values, column)}`;
    return sql`${column} @> ${array}`;
  }
  return sql`${column} @> ${bindIfParam(values, column)}`;
}
function arrayContained(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      throw new Error("arrayContained requires at least one value");
    }
    const array = sql`${bindIfParam(values, column)}`;
    return sql`${column} <@ ${array}`;
  }
  return sql`${column} <@ ${bindIfParam(values, column)}`;
}
function arrayOverlaps(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      throw new Error("arrayOverlaps requires at least one value");
    }
    const array = sql`${bindIfParam(values, column)}`;
    return sql`${column} && ${array}`;
  }
  return sql`${column} && ${bindIfParam(values, column)}`;
}
var eq, ne, gt, gte, lt, lte;
var init_conditions = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/expressions/conditions.js"() {
    init_column();
    init_entity();
    init_table();
    init_sql();
    __name(bindIfParam, "bindIfParam");
    eq = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} = ${bindIfParam(right, left)}`;
    }, "eq");
    ne = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} <> ${bindIfParam(right, left)}`;
    }, "ne");
    __name(and, "and");
    __name(or, "or");
    __name(not, "not");
    gt = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} > ${bindIfParam(right, left)}`;
    }, "gt");
    gte = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} >= ${bindIfParam(right, left)}`;
    }, "gte");
    lt = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} < ${bindIfParam(right, left)}`;
    }, "lt");
    lte = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} <= ${bindIfParam(right, left)}`;
    }, "lte");
    __name(inArray, "inArray");
    __name(notInArray, "notInArray");
    __name(isNull, "isNull");
    __name(isNotNull, "isNotNull");
    __name(exists, "exists");
    __name(notExists, "notExists");
    __name(between, "between");
    __name(notBetween, "notBetween");
    __name(like, "like");
    __name(notLike, "notLike");
    __name(ilike, "ilike");
    __name(notIlike, "notIlike");
    __name(arrayContains, "arrayContains");
    __name(arrayContained, "arrayContained");
    __name(arrayOverlaps, "arrayOverlaps");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/expressions/select.js
function asc(column) {
  return sql`${column} asc`;
}
function desc(column) {
  return sql`${column} desc`;
}
var init_select = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/expressions/select.js"() {
    init_sql();
    __name(asc, "asc");
    __name(desc, "desc");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/expressions/index.js
var init_expressions = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/expressions/index.js"() {
    init_conditions();
    init_select();
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/expressions.js
var init_expressions2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/expressions.js"() {
    init_expressions();
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/logger.js
var ConsoleLogWriter, DefaultLogger, NoopLogger;
var init_logger = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/logger.js"() {
    init_entity();
    ConsoleLogWriter = class {
      static {
        __name(this, "ConsoleLogWriter");
      }
      static [entityKind] = "ConsoleLogWriter";
      write(message) {
        console.log(message);
      }
    };
    DefaultLogger = class {
      static {
        __name(this, "DefaultLogger");
      }
      static [entityKind] = "DefaultLogger";
      writer;
      constructor(config2) {
        this.writer = config2?.writer ?? new ConsoleLogWriter();
      }
      logQuery(query, params) {
        const stringifiedParams = params.map((p) => {
          try {
            return JSON.stringify(p);
          } catch {
            return String(p);
          }
        });
        const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
        this.writer.write(`Query: ${query}${paramsStr}`);
      }
    };
    NoopLogger = class {
      static {
        __name(this, "NoopLogger");
      }
      static [entityKind] = "NoopLogger";
      logQuery() {
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/operations.js
var init_operations = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/operations.js"() {
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/query-promise.js
var QueryPromise;
var init_query_promise = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/query-promise.js"() {
    init_entity();
    QueryPromise = class {
      static {
        __name(this, "QueryPromise");
      }
      static [entityKind] = "QueryPromise";
      [Symbol.toStringTag] = "QueryPromise";
      catch(onRejected) {
        return this.then(void 0, onRejected);
      }
      finally(onFinally) {
        return this.then(
          (value) => {
            onFinally?.();
            return value;
          },
          (reason) => {
            onFinally?.();
            throw reason;
          }
        );
      }
      then(onFulfilled, onRejected) {
        return this.execute().then(onFulfilled, onRejected);
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/primary-keys.js
var PrimaryKeyBuilder, PrimaryKey;
var init_primary_keys = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/pg-core/primary-keys.js"() {
    init_entity();
    init_table2();
    PrimaryKeyBuilder = class {
      static {
        __name(this, "PrimaryKeyBuilder");
      }
      static [entityKind] = "PgPrimaryKeyBuilder";
      /** @internal */
      columns;
      /** @internal */
      name;
      constructor(columns, name2) {
        this.columns = columns;
        this.name = name2;
      }
      /** @internal */
      build(table) {
        return new PrimaryKey(table, this.columns, this.name);
      }
    };
    PrimaryKey = class {
      static {
        __name(this, "PrimaryKey");
      }
      constructor(table, columns, name2) {
        this.table = table;
        this.columns = columns;
        this.name = name2;
      }
      static [entityKind] = "PgPrimaryKey";
      columns;
      name;
      getName() {
        return this.name ?? `${this.table[PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/relations.js
function getOperators() {
  return {
    and,
    between,
    eq,
    exists,
    gt,
    gte,
    ilike,
    inArray,
    isNull,
    isNotNull,
    like,
    lt,
    lte,
    ne,
    not,
    notBetween,
    notExists,
    notLike,
    notIlike,
    notInArray,
    or,
    sql
  };
}
function getOrderByOperators() {
  return {
    sql,
    asc,
    desc
  };
}
function extractTablesRelationalConfig(schema, configHelpers) {
  if (Object.keys(schema).length === 1 && "default" in schema && !is(schema["default"], Table)) {
    schema = schema["default"];
  }
  const tableNamesMap = {};
  const relationsBuffer = {};
  const tablesConfig = {};
  for (const [key, value] of Object.entries(schema)) {
    if (is(value, Table)) {
      const dbName = getTableUniqueName(value);
      const bufferedRelations = relationsBuffer[dbName];
      tableNamesMap[dbName] = key;
      tablesConfig[key] = {
        tsName: key,
        dbName: value[Table.Symbol.Name],
        schema: value[Table.Symbol.Schema],
        columns: value[Table.Symbol.Columns],
        relations: bufferedRelations?.relations ?? {},
        primaryKey: bufferedRelations?.primaryKey ?? []
      };
      for (const column of Object.values(
        value[Table.Symbol.Columns]
      )) {
        if (column.primary) {
          tablesConfig[key].primaryKey.push(column);
        }
      }
      const extraConfig = value[Table.Symbol.ExtraConfigBuilder]?.(value[Table.Symbol.ExtraConfigColumns]);
      if (extraConfig) {
        for (const configEntry of Object.values(extraConfig)) {
          if (is(configEntry, PrimaryKeyBuilder)) {
            tablesConfig[key].primaryKey.push(...configEntry.columns);
          }
        }
      }
    } else if (is(value, Relations)) {
      const dbName = getTableUniqueName(value.table);
      const tableName = tableNamesMap[dbName];
      const relations2 = value.config(
        configHelpers(value.table)
      );
      let primaryKey;
      for (const [relationName, relation] of Object.entries(relations2)) {
        if (tableName) {
          const tableConfig = tablesConfig[tableName];
          tableConfig.relations[relationName] = relation;
          if (primaryKey) {
            tableConfig.primaryKey.push(...primaryKey);
          }
        } else {
          if (!(dbName in relationsBuffer)) {
            relationsBuffer[dbName] = {
              relations: {},
              primaryKey
            };
          }
          relationsBuffer[dbName].relations[relationName] = relation;
        }
      }
    }
  }
  return { tables: tablesConfig, tableNamesMap };
}
function relations(table, relations2) {
  return new Relations(
    table,
    (helpers) => Object.fromEntries(
      Object.entries(relations2(helpers)).map(([key, value]) => [
        key,
        value.withFieldName(key)
      ])
    )
  );
}
function createOne(sourceTable) {
  return /* @__PURE__ */ __name(function one(table, config2) {
    return new One(
      sourceTable,
      table,
      config2,
      config2?.fields.reduce((res, f) => res && f.notNull, true) ?? false
    );
  }, "one");
}
function createMany(sourceTable) {
  return /* @__PURE__ */ __name(function many(referencedTable, config2) {
    return new Many(sourceTable, referencedTable, config2);
  }, "many");
}
function normalizeRelation(schema, tableNamesMap, relation) {
  if (is(relation, One) && relation.config) {
    return {
      fields: relation.config.fields,
      references: relation.config.references
    };
  }
  const referencedTableTsName = tableNamesMap[getTableUniqueName(relation.referencedTable)];
  if (!referencedTableTsName) {
    throw new Error(
      `Table "${relation.referencedTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const referencedTableConfig = schema[referencedTableTsName];
  if (!referencedTableConfig) {
    throw new Error(`Table "${referencedTableTsName}" not found in schema`);
  }
  const sourceTable = relation.sourceTable;
  const sourceTableTsName = tableNamesMap[getTableUniqueName(sourceTable)];
  if (!sourceTableTsName) {
    throw new Error(
      `Table "${sourceTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const reverseRelations = [];
  for (const referencedTableRelation of Object.values(
    referencedTableConfig.relations
  )) {
    if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
      reverseRelations.push(referencedTableRelation);
    }
  }
  if (reverseRelations.length > 1) {
    throw relation.relationName ? new Error(
      `There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`
    ) : new Error(
      `There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[Table.Symbol.Name]}". Please specify relation name`
    );
  }
  if (reverseRelations[0] && is(reverseRelations[0], One) && reverseRelations[0].config) {
    return {
      fields: reverseRelations[0].config.references,
      references: reverseRelations[0].config.fields
    };
  }
  throw new Error(
    `There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`
  );
}
function createTableRelationsHelpers(sourceTable) {
  return {
    one: createOne(sourceTable),
    many: createMany(sourceTable)
  };
}
function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
  const result = {};
  for (const [
    selectionItemIndex,
    selectionItem
  ] of buildQueryResultSelection.entries()) {
    if (selectionItem.isJson) {
      const relation = tableConfig.relations[selectionItem.tsKey];
      const rawSubRows = row[selectionItemIndex];
      const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
      result[selectionItem.tsKey] = is(relation, One) ? subRows && mapRelationalRow(
        tablesConfig,
        tablesConfig[selectionItem.relationTableTsKey],
        subRows,
        selectionItem.selection,
        mapColumnValue
      ) : subRows.map(
        (subRow) => mapRelationalRow(
          tablesConfig,
          tablesConfig[selectionItem.relationTableTsKey],
          subRow,
          selectionItem.selection,
          mapColumnValue
        )
      );
    } else {
      const value = mapColumnValue(row[selectionItemIndex]);
      const field = selectionItem.field;
      let decoder;
      if (is(field, Column)) {
        decoder = field;
      } else if (is(field, SQL)) {
        decoder = field.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      result[selectionItem.tsKey] = value === null ? null : decoder.mapFromDriverValue(value);
    }
  }
  return result;
}
var Relation, Relations, One, Many;
var init_relations = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/relations.js"() {
    init_table();
    init_column();
    init_entity();
    init_primary_keys();
    init_expressions();
    init_sql();
    Relation = class {
      static {
        __name(this, "Relation");
      }
      constructor(sourceTable, referencedTable, relationName) {
        this.sourceTable = sourceTable;
        this.referencedTable = referencedTable;
        this.relationName = relationName;
        this.referencedTableName = referencedTable[Table.Symbol.Name];
      }
      static [entityKind] = "Relation";
      referencedTableName;
      fieldName;
    };
    Relations = class {
      static {
        __name(this, "Relations");
      }
      constructor(table, config2) {
        this.table = table;
        this.config = config2;
      }
      static [entityKind] = "Relations";
    };
    One = class _One extends Relation {
      static {
        __name(this, "One");
      }
      constructor(sourceTable, referencedTable, config2, isNullable) {
        super(sourceTable, referencedTable, config2?.relationName);
        this.config = config2;
        this.isNullable = isNullable;
      }
      static [entityKind] = "One";
      withFieldName(fieldName) {
        const relation = new _One(
          this.sourceTable,
          this.referencedTable,
          this.config,
          this.isNullable
        );
        relation.fieldName = fieldName;
        return relation;
      }
    };
    Many = class _Many extends Relation {
      static {
        __name(this, "Many");
      }
      constructor(sourceTable, referencedTable, config2) {
        super(sourceTable, referencedTable, config2?.relationName);
        this.config = config2;
      }
      static [entityKind] = "Many";
      withFieldName(fieldName) {
        const relation = new _Many(
          this.sourceTable,
          this.referencedTable,
          this.config
        );
        relation.fieldName = fieldName;
        return relation;
      }
    };
    __name(getOperators, "getOperators");
    __name(getOrderByOperators, "getOrderByOperators");
    __name(extractTablesRelationalConfig, "extractTablesRelationalConfig");
    __name(relations, "relations");
    __name(createOne, "createOne");
    __name(createMany, "createMany");
    __name(normalizeRelation, "normalizeRelation");
    __name(createTableRelationsHelpers, "createTableRelationsHelpers");
    __name(mapRelationalRow, "mapRelationalRow");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/functions/aggregate.js
function count(expression) {
  return sql`count(${expression || sql.raw("*")})`.mapWith(Number);
}
function countDistinct(expression) {
  return sql`count(distinct ${expression})`.mapWith(Number);
}
function avg(expression) {
  return sql`avg(${expression})`.mapWith(String);
}
function avgDistinct(expression) {
  return sql`avg(distinct ${expression})`.mapWith(String);
}
function sum(expression) {
  return sql`sum(${expression})`.mapWith(String);
}
function sumDistinct(expression) {
  return sql`sum(distinct ${expression})`.mapWith(String);
}
function max(expression) {
  return sql`max(${expression})`.mapWith(is(expression, Column) ? expression : String);
}
function min(expression) {
  return sql`min(${expression})`.mapWith(is(expression, Column) ? expression : String);
}
var init_aggregate = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/functions/aggregate.js"() {
    init_column();
    init_entity();
    init_sql();
    __name(count, "count");
    __name(countDistinct, "countDistinct");
    __name(avg, "avg");
    __name(avgDistinct, "avgDistinct");
    __name(sum, "sum");
    __name(sumDistinct, "sumDistinct");
    __name(max, "max");
    __name(min, "min");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/functions/vector.js
function toSql(value) {
  return JSON.stringify(value);
}
function l2Distance(column, value) {
  if (Array.isArray(value)) {
    return sql`${column} <-> ${toSql(value)}`;
  }
  return sql`${column} <-> ${value}`;
}
function l1Distance(column, value) {
  if (Array.isArray(value)) {
    return sql`${column} <+> ${toSql(value)}`;
  }
  return sql`${column} <+> ${value}`;
}
function innerProduct(column, value) {
  if (Array.isArray(value)) {
    return sql`${column} <#> ${toSql(value)}`;
  }
  return sql`${column} <#> ${value}`;
}
function cosineDistance(column, value) {
  if (Array.isArray(value)) {
    return sql`${column} <=> ${toSql(value)}`;
  }
  return sql`${column} <=> ${value}`;
}
function hammingDistance(column, value) {
  if (Array.isArray(value)) {
    return sql`${column} <~> ${toSql(value)}`;
  }
  return sql`${column} <~> ${value}`;
}
function jaccardDistance(column, value) {
  if (Array.isArray(value)) {
    return sql`${column} <%> ${toSql(value)}`;
  }
  return sql`${column} <%> ${value}`;
}
var init_vector = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/functions/vector.js"() {
    init_sql();
    __name(toSql, "toSql");
    __name(l2Distance, "l2Distance");
    __name(l1Distance, "l1Distance");
    __name(innerProduct, "innerProduct");
    __name(cosineDistance, "cosineDistance");
    __name(hammingDistance, "hammingDistance");
    __name(jaccardDistance, "jaccardDistance");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/functions/index.js
var init_functions = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/functions/index.js"() {
    init_aggregate();
    init_vector();
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/index.js
var init_sql2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sql/index.js"() {
    init_expressions();
    init_functions();
    init_sql();
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/utils.js
function mapResultRow(columns, row, joinsNotNullableMap) {
  const nullifyMap = {};
  const result = columns.reduce(
    (result2, { path, field }, columnIndex) => {
      let decoder;
      if (is(field, Column)) {
        decoder = field;
      } else if (is(field, SQL)) {
        decoder = field.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      let node = result2;
      for (const [pathChunkIndex, pathChunk] of path.entries()) {
        if (pathChunkIndex < path.length - 1) {
          if (!(pathChunk in node)) {
            node[pathChunk] = {};
          }
          node = node[pathChunk];
        } else {
          const rawValue = row[columnIndex];
          const value = node[pathChunk] = rawValue === null ? null : decoder.mapFromDriverValue(rawValue);
          if (joinsNotNullableMap && is(field, Column) && path.length === 2) {
            const objectName = path[0];
            if (!(objectName in nullifyMap)) {
              nullifyMap[objectName] = value === null ? getTableName(field.table) : false;
            } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== getTableName(field.table)) {
              nullifyMap[objectName] = false;
            }
          }
        }
      }
      return result2;
    },
    {}
  );
  if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
    for (const [objectName, tableName] of Object.entries(nullifyMap)) {
      if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
        result[objectName] = null;
      }
    }
  }
  return result;
}
function orderSelectedFields(fields, pathPrefix) {
  return Object.entries(fields).reduce((result, [name2, field]) => {
    if (typeof name2 !== "string") {
      return result;
    }
    const newPath = pathPrefix ? [...pathPrefix, name2] : [name2];
    if (is(field, Column) || is(field, SQL) || is(field, SQL.Aliased)) {
      result.push({ path: newPath, field });
    } else if (is(field, Table)) {
      result.push(...orderSelectedFields(field[Table.Symbol.Columns], newPath));
    } else {
      result.push(...orderSelectedFields(field, newPath));
    }
    return result;
  }, []);
}
function haveSameKeys(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const [index, key] of leftKeys.entries()) {
    if (key !== rightKeys[index]) {
      return false;
    }
  }
  return true;
}
function mapUpdateSet(table, values) {
  const entries = Object.entries(values).filter(([, value]) => value !== void 0).map(([key, value]) => {
    if (is(value, SQL)) {
      return [key, value];
    } else {
      return [key, new Param(value, table[Table.Symbol.Columns][key])];
    }
  });
  if (entries.length === 0) {
    throw new Error("No values to set");
  }
  return Object.fromEntries(entries);
}
function applyMixins(baseClass, extendedClasses) {
  for (const extendedClass of extendedClasses) {
    for (const name2 of Object.getOwnPropertyNames(extendedClass.prototype)) {
      if (name2 === "constructor")
        continue;
      Object.defineProperty(
        baseClass.prototype,
        name2,
        Object.getOwnPropertyDescriptor(extendedClass.prototype, name2) || /* @__PURE__ */ Object.create(null)
      );
    }
  }
}
function getTableColumns(table) {
  return table[Table.Symbol.Columns];
}
function getTableLikeName(table) {
  return is(table, Subquery) ? table._.alias : is(table, View) ? table[ViewBaseConfig].name : is(table, SQL) ? void 0 : table[Table.Symbol.IsAlias] ? table[Table.Symbol.Name] : table[Table.Symbol.BaseName];
}
var init_utils = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/utils.js"() {
    init_column();
    init_entity();
    init_sql();
    init_subquery();
    init_table();
    init_view_common();
    __name(mapResultRow, "mapResultRow");
    __name(orderSelectedFields, "orderSelectedFields");
    __name(haveSameKeys, "haveSameKeys");
    __name(mapUpdateSet, "mapUpdateSet");
    __name(applyMixins, "applyMixins");
    __name(getTableColumns, "getTableColumns");
    __name(getTableLikeName, "getTableLikeName");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/index.js
var drizzle_orm_exports = {};
__export(drizzle_orm_exports, {
  BaseName: () => BaseName,
  Column: () => Column,
  ColumnAliasProxyHandler: () => ColumnAliasProxyHandler,
  ColumnBuilder: () => ColumnBuilder,
  Columns: () => Columns,
  ConsoleLogWriter: () => ConsoleLogWriter,
  DefaultLogger: () => DefaultLogger,
  DrizzleError: () => DrizzleError,
  ExtraConfigBuilder: () => ExtraConfigBuilder,
  ExtraConfigColumns: () => ExtraConfigColumns,
  FakePrimitiveParam: () => FakePrimitiveParam,
  IsAlias: () => IsAlias,
  Many: () => Many,
  Name: () => Name,
  NoopLogger: () => NoopLogger,
  One: () => One,
  OriginalName: () => OriginalName,
  Param: () => Param,
  Placeholder: () => Placeholder,
  QueryPromise: () => QueryPromise,
  Relation: () => Relation,
  RelationTableAliasProxyHandler: () => RelationTableAliasProxyHandler,
  Relations: () => Relations,
  SQL: () => SQL,
  Schema: () => Schema,
  StringChunk: () => StringChunk,
  Subquery: () => Subquery,
  Table: () => Table,
  TableAliasProxyHandler: () => TableAliasProxyHandler,
  TableName: () => TableName,
  TransactionRollbackError: () => TransactionRollbackError,
  View: () => View,
  ViewBaseConfig: () => ViewBaseConfig,
  WithSubquery: () => WithSubquery,
  aliasedRelation: () => aliasedRelation,
  aliasedTable: () => aliasedTable,
  aliasedTableColumn: () => aliasedTableColumn,
  and: () => and,
  applyMixins: () => applyMixins,
  arrayContained: () => arrayContained,
  arrayContains: () => arrayContains,
  arrayOverlaps: () => arrayOverlaps,
  asc: () => asc,
  avg: () => avg,
  avgDistinct: () => avgDistinct,
  between: () => between,
  bindIfParam: () => bindIfParam,
  cosineDistance: () => cosineDistance,
  count: () => count,
  countDistinct: () => countDistinct,
  createMany: () => createMany,
  createOne: () => createOne,
  createTableRelationsHelpers: () => createTableRelationsHelpers,
  desc: () => desc,
  entityKind: () => entityKind,
  eq: () => eq,
  exists: () => exists,
  extractTablesRelationalConfig: () => extractTablesRelationalConfig,
  fillPlaceholders: () => fillPlaceholders,
  getOperators: () => getOperators,
  getOrderByOperators: () => getOrderByOperators,
  getTableColumns: () => getTableColumns,
  getTableLikeName: () => getTableLikeName,
  getTableName: () => getTableName,
  getTableUniqueName: () => getTableUniqueName,
  gt: () => gt,
  gte: () => gte,
  hammingDistance: () => hammingDistance,
  hasOwnEntityKind: () => hasOwnEntityKind,
  haveSameKeys: () => haveSameKeys,
  ilike: () => ilike,
  inArray: () => inArray,
  innerProduct: () => innerProduct,
  is: () => is,
  isDriverValueEncoder: () => isDriverValueEncoder,
  isNotNull: () => isNotNull,
  isNull: () => isNull,
  isSQLWrapper: () => isSQLWrapper,
  isTable: () => isTable,
  jaccardDistance: () => jaccardDistance,
  l1Distance: () => l1Distance,
  l2Distance: () => l2Distance,
  like: () => like,
  lt: () => lt,
  lte: () => lte,
  mapColumnsInAliasedSQLToAlias: () => mapColumnsInAliasedSQLToAlias,
  mapColumnsInSQLToAlias: () => mapColumnsInSQLToAlias,
  mapRelationalRow: () => mapRelationalRow,
  mapResultRow: () => mapResultRow,
  mapUpdateSet: () => mapUpdateSet,
  max: () => max,
  min: () => min,
  name: () => name,
  ne: () => ne,
  noopDecoder: () => noopDecoder,
  noopEncoder: () => noopEncoder,
  noopMapper: () => noopMapper,
  normalizeRelation: () => normalizeRelation,
  not: () => not,
  notBetween: () => notBetween,
  notExists: () => notExists,
  notIlike: () => notIlike,
  notInArray: () => notInArray,
  notLike: () => notLike,
  or: () => or,
  orderSelectedFields: () => orderSelectedFields,
  param: () => param,
  placeholder: () => placeholder,
  relations: () => relations,
  sql: () => sql,
  sum: () => sum,
  sumDistinct: () => sumDistinct
});
var init_drizzle_orm = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/index.js"() {
    init_alias();
    init_column_builder();
    init_column();
    init_entity();
    init_errors();
    init_expressions2();
    init_logger();
    init_operations();
    init_query_promise();
    init_relations();
    init_sql2();
    init_subquery();
    init_table();
    init_utils();
    init_view_common();
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/selection-proxy.js
var SelectionProxyHandler;
var init_selection_proxy = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/selection-proxy.js"() {
    init_alias();
    init_column();
    init_entity();
    init_sql();
    init_subquery();
    init_view_common();
    SelectionProxyHandler = class _SelectionProxyHandler {
      static {
        __name(this, "SelectionProxyHandler");
      }
      static [entityKind] = "SelectionProxyHandler";
      config;
      constructor(config2) {
        this.config = { ...config2 };
      }
      get(subquery, prop) {
        if (prop === "_") {
          return {
            ...subquery["_"],
            selectedFields: new Proxy(
              subquery._.selectedFields,
              this
            )
          };
        }
        if (prop === ViewBaseConfig) {
          return {
            ...subquery[ViewBaseConfig],
            selectedFields: new Proxy(
              subquery[ViewBaseConfig].selectedFields,
              this
            )
          };
        }
        if (typeof prop === "symbol") {
          return subquery[prop];
        }
        const columns = is(subquery, Subquery) ? subquery._.selectedFields : is(subquery, View) ? subquery[ViewBaseConfig].selectedFields : subquery;
        const value = columns[prop];
        if (is(value, SQL.Aliased)) {
          if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
            return value.sql;
          }
          const newValue = value.clone();
          newValue.isSelectionField = true;
          return newValue;
        }
        if (is(value, SQL)) {
          if (this.config.sqlBehavior === "sql") {
            return value;
          }
          throw new Error(
            `You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`
          );
        }
        if (is(value, Column)) {
          if (this.config.alias) {
            return new Proxy(
              value,
              new ColumnAliasProxyHandler(
                new Proxy(
                  value.table,
                  new TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false)
                )
              )
            );
          }
          return value;
        }
        if (typeof value !== "object" || value === null) {
          return value;
        }
        return new Proxy(value, new _SelectionProxyHandler(this.config));
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/table.js
function sqliteTableBase(name2, columns, extraConfig, schema, baseName = name2) {
  const rawTable = new SQLiteTable(name2, schema, baseName);
  const builtColumns = Object.fromEntries(
    Object.entries(columns).map(([name22, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      const column = colBuilder.build(rawTable);
      rawTable[InlineForeignKeys2].push(...colBuilder.buildForeignKeys(column, rawTable));
      return [name22, column];
    })
  );
  const table = Object.assign(rawTable, builtColumns);
  table[Table.Symbol.Columns] = builtColumns;
  table[Table.Symbol.ExtraConfigColumns] = builtColumns;
  if (extraConfig) {
    table[SQLiteTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return table;
}
var InlineForeignKeys2, SQLiteTable, sqliteTable;
var init_table3 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/table.js"() {
    init_entity();
    init_table();
    InlineForeignKeys2 = /* @__PURE__ */ Symbol.for("drizzle:SQLiteInlineForeignKeys");
    SQLiteTable = class extends Table {
      static {
        __name(this, "SQLiteTable");
      }
      static [entityKind] = "SQLiteTable";
      /** @internal */
      static Symbol = Object.assign({}, Table.Symbol, {
        InlineForeignKeys: InlineForeignKeys2
      });
      /** @internal */
      [Table.Symbol.Columns];
      /** @internal */
      [InlineForeignKeys2] = [];
      /** @internal */
      [Table.Symbol.ExtraConfigBuilder] = void 0;
    };
    __name(sqliteTableBase, "sqliteTableBase");
    sqliteTable = /* @__PURE__ */ __name((name2, columns, extraConfig) => {
      return sqliteTableBase(name2, columns, extraConfig);
    }, "sqliteTable");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/delete.js
var SQLiteDeleteBase;
var init_delete = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/delete.js"() {
    init_entity();
    init_query_promise();
    init_table3();
    init_utils();
    SQLiteDeleteBase = class extends QueryPromise {
      static {
        __name(this, "SQLiteDeleteBase");
      }
      constructor(table, session, dialect, withList) {
        super();
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.config = { table, withList };
      }
      static [entityKind] = "SQLiteDelete";
      /** @internal */
      config;
      /**
       * Adds a `where` clause to the query.
       *
       * Calling this method will delete only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/delete}
       *
       * @param where the `where` clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be deleted.
       *
       * ```ts
       * // Delete all cars with green color
       * db.delete(cars).where(eq(cars.color, 'green'));
       * // or
       * db.delete(cars).where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Delete all BMW cars with a green color
       * db.delete(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Delete all cars with the green or blue color
       * db.delete(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        this.config.where = where;
        return this;
      }
      returning(fields = this.table[SQLiteTable.Symbol.Columns]) {
        this.config.returning = orderSelectedFields(fields);
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildDeleteQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(isOneTimeQuery = true) {
        return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
          this.dialect.sqlToQuery(this.getSQL()),
          this.config.returning,
          this.config.returning ? "all" : "run",
          true
        );
      }
      prepare() {
        return this._prepare(false);
      }
      run = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().run(placeholderValues);
      }, "run");
      all = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().all(placeholderValues);
      }, "all");
      get = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().get(placeholderValues);
      }, "get");
      values = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().values(placeholderValues);
      }, "values");
      async execute(placeholderValues) {
        return this._prepare().execute(placeholderValues);
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/insert.js
var SQLiteInsertBuilder, SQLiteInsertBase;
var init_insert = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/insert.js"() {
    init_entity();
    init_query_promise();
    init_sql();
    init_table3();
    init_table();
    init_utils();
    SQLiteInsertBuilder = class {
      static {
        __name(this, "SQLiteInsertBuilder");
      }
      constructor(table, session, dialect, withList) {
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.withList = withList;
      }
      static [entityKind] = "SQLiteInsertBuilder";
      values(values) {
        values = Array.isArray(values) ? values : [values];
        if (values.length === 0) {
          throw new Error("values() must be called with at least one value");
        }
        const mappedValues = values.map((entry) => {
          const result = {};
          const cols = this.table[Table.Symbol.Columns];
          for (const colKey of Object.keys(entry)) {
            const colValue = entry[colKey];
            result[colKey] = is(colValue, SQL) ? colValue : new Param(colValue, cols[colKey]);
          }
          return result;
        });
        return new SQLiteInsertBase(this.table, mappedValues, this.session, this.dialect, this.withList);
      }
    };
    SQLiteInsertBase = class extends QueryPromise {
      static {
        __name(this, "SQLiteInsertBase");
      }
      constructor(table, values, session, dialect, withList) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { table, values, withList };
      }
      static [entityKind] = "SQLiteInsert";
      /** @internal */
      config;
      returning(fields = this.config.table[SQLiteTable.Symbol.Columns]) {
        this.config.returning = orderSelectedFields(fields);
        return this;
      }
      /**
       * Adds an `on conflict do nothing` clause to the query.
       *
       * Calling this method simply avoids inserting a row as its alternative action.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert#on-conflict-do-nothing}
       *
       * @param config The `target` and `where` clauses.
       *
       * @example
       * ```ts
       * // Insert one row and cancel the insert if there's a conflict
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoNothing();
       *
       * // Explicitly specify conflict target
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoNothing({ target: cars.id });
       * ```
       */
      onConflictDoNothing(config2 = {}) {
        if (config2.target === void 0) {
          this.config.onConflict = sql`do nothing`;
        } else {
          const targetSql = Array.isArray(config2.target) ? sql`${config2.target}` : sql`${[config2.target]}`;
          const whereSql = config2.where ? sql` where ${config2.where}` : sql``;
          this.config.onConflict = sql`${targetSql} do nothing${whereSql}`;
        }
        return this;
      }
      /**
       * Adds an `on conflict do update` clause to the query.
       *
       * Calling this method will update the existing row that conflicts with the row proposed for insertion as its alternative action.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert#upserts-and-conflicts}
       *
       * @param config The `target`, `set` and `where` clauses.
       *
       * @example
       * ```ts
       * // Update the row if there's a conflict
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoUpdate({
       *     target: cars.id,
       *     set: { brand: 'Porsche' }
       *   });
       *
       * // Upsert with 'where' clause
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoUpdate({
       *     target: cars.id,
       *     set: { brand: 'newBMW' },
       *     where: sql`${cars.createdAt} > '2023-01-01'::date`,
       *   });
       * ```
       */
      onConflictDoUpdate(config2) {
        if (config2.where && (config2.targetWhere || config2.setWhere)) {
          throw new Error(
            'You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.'
          );
        }
        const whereSql = config2.where ? sql` where ${config2.where}` : void 0;
        const targetWhereSql = config2.targetWhere ? sql` where ${config2.targetWhere}` : void 0;
        const setWhereSql = config2.setWhere ? sql` where ${config2.setWhere}` : void 0;
        const targetSql = Array.isArray(config2.target) ? sql`${config2.target}` : sql`${[config2.target]}`;
        const setSql = this.dialect.buildUpdateSet(this.config.table, mapUpdateSet(this.config.table, config2.set));
        this.config.onConflict = sql`${targetSql}${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`;
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildInsertQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(isOneTimeQuery = true) {
        return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
          this.dialect.sqlToQuery(this.getSQL()),
          this.config.returning,
          this.config.returning ? "all" : "run",
          true
        );
      }
      prepare() {
        return this._prepare(false);
      }
      run = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().run(placeholderValues);
      }, "run");
      all = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().all(placeholderValues);
      }, "all");
      get = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().get(placeholderValues);
      }, "get");
      values = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().values(placeholderValues);
      }, "values");
      async execute() {
        return this.config.returning ? this.all() : this.run();
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/foreign-keys.js
var ForeignKeyBuilder2, ForeignKey2;
var init_foreign_keys2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/foreign-keys.js"() {
    init_entity();
    init_table3();
    ForeignKeyBuilder2 = class {
      static {
        __name(this, "ForeignKeyBuilder");
      }
      static [entityKind] = "SQLiteForeignKeyBuilder";
      /** @internal */
      reference;
      /** @internal */
      _onUpdate;
      /** @internal */
      _onDelete;
      constructor(config2, actions) {
        this.reference = () => {
          const { name: name2, columns, foreignColumns } = config2();
          return { name: name2, columns, foreignTable: foreignColumns[0].table, foreignColumns };
        };
        if (actions) {
          this._onUpdate = actions.onUpdate;
          this._onDelete = actions.onDelete;
        }
      }
      onUpdate(action) {
        this._onUpdate = action;
        return this;
      }
      onDelete(action) {
        this._onDelete = action;
        return this;
      }
      /** @internal */
      build(table) {
        return new ForeignKey2(table, this);
      }
    };
    ForeignKey2 = class {
      static {
        __name(this, "ForeignKey");
      }
      constructor(table, builder) {
        this.table = table;
        this.reference = builder.reference;
        this.onUpdate = builder._onUpdate;
        this.onDelete = builder._onDelete;
      }
      static [entityKind] = "SQLiteForeignKey";
      reference;
      onUpdate;
      onDelete;
      getName() {
        const { name: name2, columns, foreignColumns } = this.reference();
        const columnNames = columns.map((column) => column.name);
        const foreignColumnNames = foreignColumns.map((column) => column.name);
        const chunks = [
          this.table[SQLiteTable.Symbol.Name],
          ...columnNames,
          foreignColumns[0].table[SQLiteTable.Symbol.Name],
          ...foreignColumnNames
        ];
        return name2 ?? `${chunks.join("_")}_fk`;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/unique-constraint.js
function uniqueKeyName2(table, columns) {
  return `${table[SQLiteTable.Symbol.Name]}_${columns.join("_")}_unique`;
}
var UniqueConstraintBuilder2, UniqueOnConstraintBuilder2, UniqueConstraint2;
var init_unique_constraint2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/unique-constraint.js"() {
    init_entity();
    init_table3();
    __name(uniqueKeyName2, "uniqueKeyName");
    UniqueConstraintBuilder2 = class {
      static {
        __name(this, "UniqueConstraintBuilder");
      }
      constructor(columns, name2) {
        this.name = name2;
        this.columns = columns;
      }
      static [entityKind] = "SQLiteUniqueConstraintBuilder";
      /** @internal */
      columns;
      /** @internal */
      build(table) {
        return new UniqueConstraint2(table, this.columns, this.name);
      }
    };
    UniqueOnConstraintBuilder2 = class {
      static {
        __name(this, "UniqueOnConstraintBuilder");
      }
      static [entityKind] = "SQLiteUniqueOnConstraintBuilder";
      /** @internal */
      name;
      constructor(name2) {
        this.name = name2;
      }
      on(...columns) {
        return new UniqueConstraintBuilder2(columns, this.name);
      }
    };
    UniqueConstraint2 = class {
      static {
        __name(this, "UniqueConstraint");
      }
      constructor(table, columns, name2) {
        this.table = table;
        this.columns = columns;
        this.name = name2 ?? uniqueKeyName2(this.table, this.columns.map((column) => column.name));
      }
      static [entityKind] = "SQLiteUniqueConstraint";
      columns;
      name;
      getName() {
        return this.name;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/common.js
var SQLiteColumnBuilder, SQLiteColumn;
var init_common2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/common.js"() {
    init_column_builder();
    init_column();
    init_entity();
    init_foreign_keys2();
    init_unique_constraint2();
    SQLiteColumnBuilder = class extends ColumnBuilder {
      static {
        __name(this, "SQLiteColumnBuilder");
      }
      static [entityKind] = "SQLiteColumnBuilder";
      foreignKeyConfigs = [];
      references(ref, actions = {}) {
        this.foreignKeyConfigs.push({ ref, actions });
        return this;
      }
      unique(name2) {
        this.config.isUnique = true;
        this.config.uniqueName = name2;
        return this;
      }
      generatedAlwaysAs(as, config2) {
        this.config.generated = {
          as,
          type: "always",
          mode: config2?.mode ?? "virtual"
        };
        return this;
      }
      /** @internal */
      buildForeignKeys(column, table) {
        return this.foreignKeyConfigs.map(({ ref, actions }) => {
          return ((ref2, actions2) => {
            const builder = new ForeignKeyBuilder2(() => {
              const foreignColumn = ref2();
              return { columns: [column], foreignColumns: [foreignColumn] };
            });
            if (actions2.onUpdate) {
              builder.onUpdate(actions2.onUpdate);
            }
            if (actions2.onDelete) {
              builder.onDelete(actions2.onDelete);
            }
            return builder.build(table);
          })(ref, actions);
        });
      }
    };
    SQLiteColumn = class extends Column {
      static {
        __name(this, "SQLiteColumn");
      }
      constructor(table, config2) {
        if (!config2.uniqueName) {
          config2.uniqueName = uniqueKeyName2(table, [config2.name]);
        }
        super(table, config2);
        this.table = table;
      }
      static [entityKind] = "SQLiteColumn";
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/blob.js
var SQLiteBigIntBuilder, SQLiteBigInt, SQLiteBlobJsonBuilder, SQLiteBlobJson, SQLiteBlobBufferBuilder, SQLiteBlobBuffer;
var init_blob = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/blob.js"() {
    init_entity();
    init_common2();
    SQLiteBigIntBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteBigIntBuilder");
      }
      static [entityKind] = "SQLiteBigIntBuilder";
      constructor(name2) {
        super(name2, "bigint", "SQLiteBigInt");
      }
      /** @internal */
      build(table) {
        return new SQLiteBigInt(table, this.config);
      }
    };
    SQLiteBigInt = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteBigInt");
      }
      static [entityKind] = "SQLiteBigInt";
      getSQLType() {
        return "blob";
      }
      mapFromDriverValue(value) {
        return BigInt(value.toString());
      }
      mapToDriverValue(value) {
        return Buffer.from(value.toString());
      }
    };
    SQLiteBlobJsonBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteBlobJsonBuilder");
      }
      static [entityKind] = "SQLiteBlobJsonBuilder";
      constructor(name2) {
        super(name2, "json", "SQLiteBlobJson");
      }
      /** @internal */
      build(table) {
        return new SQLiteBlobJson(
          table,
          this.config
        );
      }
    };
    SQLiteBlobJson = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteBlobJson");
      }
      static [entityKind] = "SQLiteBlobJson";
      getSQLType() {
        return "blob";
      }
      mapFromDriverValue(value) {
        return JSON.parse(value.toString());
      }
      mapToDriverValue(value) {
        return Buffer.from(JSON.stringify(value));
      }
    };
    SQLiteBlobBufferBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteBlobBufferBuilder");
      }
      static [entityKind] = "SQLiteBlobBufferBuilder";
      constructor(name2) {
        super(name2, "buffer", "SQLiteBlobBuffer");
      }
      /** @internal */
      build(table) {
        return new SQLiteBlobBuffer(table, this.config);
      }
    };
    SQLiteBlobBuffer = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteBlobBuffer");
      }
      static [entityKind] = "SQLiteBlobBuffer";
      getSQLType() {
        return "blob";
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/custom.js
var SQLiteCustomColumnBuilder, SQLiteCustomColumn;
var init_custom = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/custom.js"() {
    init_entity();
    init_common2();
    SQLiteCustomColumnBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteCustomColumnBuilder");
      }
      static [entityKind] = "SQLiteCustomColumnBuilder";
      constructor(name2, fieldConfig, customTypeParams) {
        super(name2, "custom", "SQLiteCustomColumn");
        this.config.fieldConfig = fieldConfig;
        this.config.customTypeParams = customTypeParams;
      }
      /** @internal */
      build(table) {
        return new SQLiteCustomColumn(
          table,
          this.config
        );
      }
    };
    SQLiteCustomColumn = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteCustomColumn");
      }
      static [entityKind] = "SQLiteCustomColumn";
      sqlName;
      mapTo;
      mapFrom;
      constructor(table, config2) {
        super(table, config2);
        this.sqlName = config2.customTypeParams.dataType(config2.fieldConfig);
        this.mapTo = config2.customTypeParams.toDriver;
        this.mapFrom = config2.customTypeParams.fromDriver;
      }
      getSQLType() {
        return this.sqlName;
      }
      mapFromDriverValue(value) {
        return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
      }
      mapToDriverValue(value) {
        return typeof this.mapTo === "function" ? this.mapTo(value) : value;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/integer.js
function integer(name2, config2) {
  if (config2?.mode === "timestamp" || config2?.mode === "timestamp_ms") {
    return new SQLiteTimestampBuilder(name2, config2.mode);
  }
  if (config2?.mode === "boolean") {
    return new SQLiteBooleanBuilder(name2, config2.mode);
  }
  return new SQLiteIntegerBuilder(name2);
}
var SQLiteBaseIntegerBuilder, SQLiteBaseInteger, SQLiteIntegerBuilder, SQLiteInteger, SQLiteTimestampBuilder, SQLiteTimestamp, SQLiteBooleanBuilder, SQLiteBoolean;
var init_integer = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/integer.js"() {
    init_entity();
    init_sql();
    init_common2();
    SQLiteBaseIntegerBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteBaseIntegerBuilder");
      }
      static [entityKind] = "SQLiteBaseIntegerBuilder";
      constructor(name2, dataType, columnType) {
        super(name2, dataType, columnType);
        this.config.autoIncrement = false;
      }
      primaryKey(config2) {
        if (config2?.autoIncrement) {
          this.config.autoIncrement = true;
        }
        this.config.hasDefault = true;
        return super.primaryKey();
      }
    };
    SQLiteBaseInteger = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteBaseInteger");
      }
      static [entityKind] = "SQLiteBaseInteger";
      autoIncrement = this.config.autoIncrement;
      getSQLType() {
        return "integer";
      }
    };
    SQLiteIntegerBuilder = class extends SQLiteBaseIntegerBuilder {
      static {
        __name(this, "SQLiteIntegerBuilder");
      }
      static [entityKind] = "SQLiteIntegerBuilder";
      constructor(name2) {
        super(name2, "number", "SQLiteInteger");
      }
      build(table) {
        return new SQLiteInteger(
          table,
          this.config
        );
      }
    };
    SQLiteInteger = class extends SQLiteBaseInteger {
      static {
        __name(this, "SQLiteInteger");
      }
      static [entityKind] = "SQLiteInteger";
    };
    SQLiteTimestampBuilder = class extends SQLiteBaseIntegerBuilder {
      static {
        __name(this, "SQLiteTimestampBuilder");
      }
      static [entityKind] = "SQLiteTimestampBuilder";
      constructor(name2, mode) {
        super(name2, "date", "SQLiteTimestamp");
        this.config.mode = mode;
      }
      /**
       * @deprecated Use `default()` with your own expression instead.
       *
       * Adds `DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))` to the column, which is the current epoch timestamp in milliseconds.
       */
      defaultNow() {
        return this.default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`);
      }
      build(table) {
        return new SQLiteTimestamp(
          table,
          this.config
        );
      }
    };
    SQLiteTimestamp = class extends SQLiteBaseInteger {
      static {
        __name(this, "SQLiteTimestamp");
      }
      static [entityKind] = "SQLiteTimestamp";
      mode = this.config.mode;
      mapFromDriverValue(value) {
        if (this.config.mode === "timestamp") {
          return new Date(value * 1e3);
        }
        return new Date(value);
      }
      mapToDriverValue(value) {
        const unix = value.getTime();
        if (this.config.mode === "timestamp") {
          return Math.floor(unix / 1e3);
        }
        return unix;
      }
    };
    SQLiteBooleanBuilder = class extends SQLiteBaseIntegerBuilder {
      static {
        __name(this, "SQLiteBooleanBuilder");
      }
      static [entityKind] = "SQLiteBooleanBuilder";
      constructor(name2, mode) {
        super(name2, "boolean", "SQLiteBoolean");
        this.config.mode = mode;
      }
      build(table) {
        return new SQLiteBoolean(
          table,
          this.config
        );
      }
    };
    SQLiteBoolean = class extends SQLiteBaseInteger {
      static {
        __name(this, "SQLiteBoolean");
      }
      static [entityKind] = "SQLiteBoolean";
      mode = this.config.mode;
      mapFromDriverValue(value) {
        return Number(value) === 1;
      }
      mapToDriverValue(value) {
        return value ? 1 : 0;
      }
    };
    __name(integer, "integer");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/numeric.js
var SQLiteNumericBuilder, SQLiteNumeric;
var init_numeric = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/numeric.js"() {
    init_entity();
    init_common2();
    SQLiteNumericBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteNumericBuilder");
      }
      static [entityKind] = "SQLiteNumericBuilder";
      constructor(name2) {
        super(name2, "string", "SQLiteNumeric");
      }
      /** @internal */
      build(table) {
        return new SQLiteNumeric(
          table,
          this.config
        );
      }
    };
    SQLiteNumeric = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteNumeric");
      }
      static [entityKind] = "SQLiteNumeric";
      getSQLType() {
        return "numeric";
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/real.js
function real(name2) {
  return new SQLiteRealBuilder(name2);
}
var SQLiteRealBuilder, SQLiteReal;
var init_real = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/real.js"() {
    init_entity();
    init_common2();
    SQLiteRealBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteRealBuilder");
      }
      static [entityKind] = "SQLiteRealBuilder";
      constructor(name2) {
        super(name2, "number", "SQLiteReal");
      }
      /** @internal */
      build(table) {
        return new SQLiteReal(table, this.config);
      }
    };
    SQLiteReal = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteReal");
      }
      static [entityKind] = "SQLiteReal";
      getSQLType() {
        return "real";
      }
    };
    __name(real, "real");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/text.js
function text(name2, config2 = {}) {
  return config2.mode === "json" ? new SQLiteTextJsonBuilder(name2) : new SQLiteTextBuilder(name2, config2);
}
var SQLiteTextBuilder, SQLiteText, SQLiteTextJsonBuilder, SQLiteTextJson;
var init_text = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/text.js"() {
    init_entity();
    init_common2();
    SQLiteTextBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteTextBuilder");
      }
      static [entityKind] = "SQLiteTextBuilder";
      constructor(name2, config2) {
        super(name2, "string", "SQLiteText");
        this.config.enumValues = config2.enum;
        this.config.length = config2.length;
      }
      /** @internal */
      build(table) {
        return new SQLiteText(table, this.config);
      }
    };
    SQLiteText = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteText");
      }
      static [entityKind] = "SQLiteText";
      enumValues = this.config.enumValues;
      length = this.config.length;
      constructor(table, config2) {
        super(table, config2);
      }
      getSQLType() {
        return `text${this.config.length ? `(${this.config.length})` : ""}`;
      }
    };
    SQLiteTextJsonBuilder = class extends SQLiteColumnBuilder {
      static {
        __name(this, "SQLiteTextJsonBuilder");
      }
      static [entityKind] = "SQLiteTextJsonBuilder";
      constructor(name2) {
        super(name2, "json", "SQLiteTextJson");
      }
      /** @internal */
      build(table) {
        return new SQLiteTextJson(
          table,
          this.config
        );
      }
    };
    SQLiteTextJson = class extends SQLiteColumn {
      static {
        __name(this, "SQLiteTextJson");
      }
      static [entityKind] = "SQLiteTextJson";
      getSQLType() {
        return "text";
      }
      mapFromDriverValue(value) {
        return JSON.parse(value);
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
    };
    __name(text, "text");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/index.js
var init_columns = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/columns/index.js"() {
    init_blob();
    init_common2();
    init_custom();
    init_integer();
    init_numeric();
    init_real();
    init_text();
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/view-base.js
var SQLiteViewBase;
var init_view_base = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/view-base.js"() {
    init_entity();
    init_sql();
    SQLiteViewBase = class extends View {
      static {
        __name(this, "SQLiteViewBase");
      }
      static [entityKind] = "SQLiteViewBase";
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/dialect.js
var SQLiteDialect, SQLiteSyncDialect, SQLiteAsyncDialect;
var init_dialect = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/dialect.js"() {
    init_alias();
    init_column();
    init_entity();
    init_errors();
    init_relations();
    init_sql2();
    init_sql();
    init_columns();
    init_table3();
    init_subquery();
    init_table();
    init_utils();
    init_view_common();
    init_view_base();
    SQLiteDialect = class {
      static {
        __name(this, "SQLiteDialect");
      }
      static [entityKind] = "SQLiteDialect";
      escapeName(name2) {
        return `"${name2}"`;
      }
      escapeParam(_num) {
        return "?";
      }
      escapeString(str) {
        return `'${str.replace(/'/g, "''")}'`;
      }
      buildWithCTE(queries) {
        if (!queries?.length)
          return void 0;
        const withSqlChunks = [sql`with `];
        for (const [i, w] of queries.entries()) {
          withSqlChunks.push(sql`${sql.identifier(w._.alias)} as (${w._.sql})`);
          if (i < queries.length - 1) {
            withSqlChunks.push(sql`, `);
          }
        }
        withSqlChunks.push(sql` `);
        return sql.join(withSqlChunks);
      }
      buildDeleteQuery({ table, where, returning, withList }) {
        const withSql = this.buildWithCTE(withList);
        const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const whereSql = where ? sql` where ${where}` : void 0;
        return sql`${withSql}delete from ${table}${whereSql}${returningSql}`;
      }
      buildUpdateSet(table, set) {
        const tableColumns = table[Table.Symbol.Columns];
        const columnNames = Object.keys(tableColumns).filter(
          (colName) => set[colName] !== void 0 || tableColumns[colName]?.onUpdateFn !== void 0
        );
        const setSize = columnNames.length;
        return sql.join(columnNames.flatMap((colName, i) => {
          const col = tableColumns[colName];
          const value = set[colName] ?? sql.param(col.onUpdateFn(), col);
          const res = sql`${sql.identifier(col.name)} = ${value}`;
          if (i < setSize - 1) {
            return [res, sql.raw(", ")];
          }
          return [res];
        }));
      }
      buildUpdateQuery({ table, set, where, returning, withList }) {
        const withSql = this.buildWithCTE(withList);
        const setSql = this.buildUpdateSet(table, set);
        const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const whereSql = where ? sql` where ${where}` : void 0;
        return sql`${withSql}update ${table} set ${setSql}${whereSql}${returningSql}`;
      }
      /**
       * Builds selection SQL with provided fields/expressions
       *
       * Examples:
       *
       * `select <selection> from`
       *
       * `insert ... returning <selection>`
       *
       * If `isSingleTable` is true, then columns won't be prefixed with table name
       */
      buildSelection(fields, { isSingleTable = false } = {}) {
        const columnsLen = fields.length;
        const chunks = fields.flatMap(({ field }, i) => {
          const chunk = [];
          if (is(field, SQL.Aliased) && field.isSelectionField) {
            chunk.push(sql.identifier(field.fieldAlias));
          } else if (is(field, SQL.Aliased) || is(field, SQL)) {
            const query = is(field, SQL.Aliased) ? field.sql : field;
            if (isSingleTable) {
              chunk.push(
                new SQL(
                  query.queryChunks.map((c) => {
                    if (is(c, Column)) {
                      return sql.identifier(c.name);
                    }
                    return c;
                  })
                )
              );
            } else {
              chunk.push(query);
            }
            if (is(field, SQL.Aliased)) {
              chunk.push(sql` as ${sql.identifier(field.fieldAlias)}`);
            }
          } else if (is(field, Column)) {
            const tableName = field.table[Table.Symbol.Name];
            const columnName = field.name;
            if (isSingleTable) {
              chunk.push(sql.identifier(columnName));
            } else {
              chunk.push(sql`${sql.identifier(tableName)}.${sql.identifier(columnName)}`);
            }
          }
          if (i < columnsLen - 1) {
            chunk.push(sql`, `);
          }
          return chunk;
        });
        return sql.join(chunks);
      }
      buildSelectQuery({
        withList,
        fields,
        fieldsFlat,
        where,
        having,
        table,
        joins,
        orderBy,
        groupBy,
        limit,
        offset,
        distinct,
        setOperators
      }) {
        const fieldsList = fieldsFlat ?? orderSelectedFields(fields);
        for (const f of fieldsList) {
          if (is(f.field, Column) && getTableName(f.field.table) !== (is(table, Subquery) ? table._.alias : is(table, SQLiteViewBase) ? table[ViewBaseConfig].name : is(table, SQL) ? void 0 : getTableName(table)) && !((table2) => joins?.some(
            ({ alias }) => alias === (table2[Table.Symbol.IsAlias] ? getTableName(table2) : table2[Table.Symbol.BaseName])
          ))(f.field.table)) {
            const tableName = getTableName(f.field.table);
            throw new Error(
              `Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`
            );
          }
        }
        const isSingleTable = !joins || joins.length === 0;
        const withSql = this.buildWithCTE(withList);
        const distinctSql = distinct ? sql` distinct` : void 0;
        const selection = this.buildSelection(fieldsList, { isSingleTable });
        const tableSql = (() => {
          if (is(table, Table) && table[Table.Symbol.OriginalName] !== table[Table.Symbol.Name]) {
            return sql`${sql.identifier(table[Table.Symbol.OriginalName])} ${sql.identifier(table[Table.Symbol.Name])}`;
          }
          return table;
        })();
        const joinsArray = [];
        if (joins) {
          for (const [index, joinMeta] of joins.entries()) {
            if (index === 0) {
              joinsArray.push(sql` `);
            }
            const table2 = joinMeta.table;
            if (is(table2, SQLiteTable)) {
              const tableName = table2[SQLiteTable.Symbol.Name];
              const tableSchema = table2[SQLiteTable.Symbol.Schema];
              const origTableName = table2[SQLiteTable.Symbol.OriginalName];
              const alias = tableName === origTableName ? void 0 : joinMeta.alias;
              joinsArray.push(
                sql`${sql.raw(joinMeta.joinType)} join ${tableSchema ? sql`${sql.identifier(tableSchema)}.` : void 0}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`} on ${joinMeta.on}`
              );
            } else {
              joinsArray.push(
                sql`${sql.raw(joinMeta.joinType)} join ${table2} on ${joinMeta.on}`
              );
            }
            if (index < joins.length - 1) {
              joinsArray.push(sql` `);
            }
          }
        }
        const joinsSql = sql.join(joinsArray);
        const whereSql = where ? sql` where ${where}` : void 0;
        const havingSql = having ? sql` having ${having}` : void 0;
        const orderByList = [];
        if (orderBy) {
          for (const [index, orderByValue] of orderBy.entries()) {
            orderByList.push(orderByValue);
            if (index < orderBy.length - 1) {
              orderByList.push(sql`, `);
            }
          }
        }
        const groupByList = [];
        if (groupBy) {
          for (const [index, groupByValue] of groupBy.entries()) {
            groupByList.push(groupByValue);
            if (index < groupBy.length - 1) {
              groupByList.push(sql`, `);
            }
          }
        }
        const groupBySql = groupByList.length > 0 ? sql` group by ${sql.join(groupByList)}` : void 0;
        const orderBySql = orderByList.length > 0 ? sql` order by ${sql.join(orderByList)}` : void 0;
        const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
        const offsetSql = offset ? sql` offset ${offset}` : void 0;
        const finalQuery = sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}`;
        if (setOperators.length > 0) {
          return this.buildSetOperations(finalQuery, setOperators);
        }
        return finalQuery;
      }
      buildSetOperations(leftSelect, setOperators) {
        const [setOperator, ...rest] = setOperators;
        if (!setOperator) {
          throw new Error("Cannot pass undefined values to any set operator");
        }
        if (rest.length === 0) {
          return this.buildSetOperationQuery({ leftSelect, setOperator });
        }
        return this.buildSetOperations(
          this.buildSetOperationQuery({ leftSelect, setOperator }),
          rest
        );
      }
      buildSetOperationQuery({
        leftSelect,
        setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
      }) {
        const leftChunk = sql`${leftSelect.getSQL()} `;
        const rightChunk = sql`${rightSelect.getSQL()}`;
        let orderBySql;
        if (orderBy && orderBy.length > 0) {
          const orderByValues = [];
          for (const singleOrderBy of orderBy) {
            if (is(singleOrderBy, SQLiteColumn)) {
              orderByValues.push(sql.identifier(singleOrderBy.name));
            } else if (is(singleOrderBy, SQL)) {
              for (let i = 0; i < singleOrderBy.queryChunks.length; i++) {
                const chunk = singleOrderBy.queryChunks[i];
                if (is(chunk, SQLiteColumn)) {
                  singleOrderBy.queryChunks[i] = sql.identifier(chunk.name);
                }
              }
              orderByValues.push(sql`${singleOrderBy}`);
            } else {
              orderByValues.push(sql`${singleOrderBy}`);
            }
          }
          orderBySql = sql` order by ${sql.join(orderByValues, sql`, `)}`;
        }
        const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
        const operatorChunk = sql.raw(`${type} ${isAll ? "all " : ""}`);
        const offsetSql = offset ? sql` offset ${offset}` : void 0;
        return sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
      }
      buildInsertQuery({ table, values, onConflict, returning, withList }) {
        const valuesSqlList = [];
        const columns = table[Table.Symbol.Columns];
        const colEntries = Object.entries(columns).filter(
          ([_, col]) => !col.shouldDisableInsert()
        );
        const insertOrder = colEntries.map(([, column]) => sql.identifier(column.name));
        for (const [valueIndex, value] of values.entries()) {
          const valueList = [];
          for (const [fieldName, col] of colEntries) {
            const colValue = value[fieldName];
            if (colValue === void 0 || is(colValue, Param) && colValue.value === void 0) {
              let defaultValue;
              if (col.default !== null && col.default !== void 0) {
                defaultValue = is(col.default, SQL) ? col.default : sql.param(col.default, col);
              } else if (col.defaultFn !== void 0) {
                const defaultFnResult = col.defaultFn();
                defaultValue = is(defaultFnResult, SQL) ? defaultFnResult : sql.param(defaultFnResult, col);
              } else if (!col.default && col.onUpdateFn !== void 0) {
                const onUpdateFnResult = col.onUpdateFn();
                defaultValue = is(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col);
              } else {
                defaultValue = sql`null`;
              }
              valueList.push(defaultValue);
            } else {
              valueList.push(colValue);
            }
          }
          valuesSqlList.push(valueList);
          if (valueIndex < values.length - 1) {
            valuesSqlList.push(sql`, `);
          }
        }
        const withSql = this.buildWithCTE(withList);
        const valuesSql = sql.join(valuesSqlList);
        const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const onConflictSql = onConflict ? sql` on conflict ${onConflict}` : void 0;
        return sql`${withSql}insert into ${table} ${insertOrder} values ${valuesSql}${onConflictSql}${returningSql}`;
      }
      sqlToQuery(sql22, invokeSource) {
        return sql22.toQuery({
          escapeName: this.escapeName,
          escapeParam: this.escapeParam,
          escapeString: this.escapeString,
          invokeSource
        });
      }
      buildRelationalQuery({
        fullSchema,
        schema,
        tableNamesMap,
        table,
        tableConfig,
        queryConfig: config2,
        tableAlias,
        nestedQueryRelation,
        joinOn
      }) {
        let selection = [];
        let limit, offset, orderBy = [], where;
        const joins = [];
        if (config2 === true) {
          const selectionEntries = Object.entries(tableConfig.columns);
          selection = selectionEntries.map(([key, value]) => ({
            dbKey: value.name,
            tsKey: key,
            field: aliasedTableColumn(value, tableAlias),
            relationTableTsKey: void 0,
            isJson: false,
            selection: []
          }));
        } else {
          const aliasedColumns = Object.fromEntries(
            Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)])
          );
          if (config2.where) {
            const whereSql = typeof config2.where === "function" ? config2.where(aliasedColumns, getOperators()) : config2.where;
            where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
          }
          const fieldsSelection = [];
          let selectedColumns = [];
          if (config2.columns) {
            let isIncludeMode = false;
            for (const [field, value] of Object.entries(config2.columns)) {
              if (value === void 0) {
                continue;
              }
              if (field in tableConfig.columns) {
                if (!isIncludeMode && value === true) {
                  isIncludeMode = true;
                }
                selectedColumns.push(field);
              }
            }
            if (selectedColumns.length > 0) {
              selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config2.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
            }
          } else {
            selectedColumns = Object.keys(tableConfig.columns);
          }
          for (const field of selectedColumns) {
            const column = tableConfig.columns[field];
            fieldsSelection.push({ tsKey: field, value: column });
          }
          let selectedRelations = [];
          if (config2.with) {
            selectedRelations = Object.entries(config2.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey] }));
          }
          let extras;
          if (config2.extras) {
            extras = typeof config2.extras === "function" ? config2.extras(aliasedColumns, { sql }) : config2.extras;
            for (const [tsKey, value] of Object.entries(extras)) {
              fieldsSelection.push({
                tsKey,
                value: mapColumnsInAliasedSQLToAlias(value, tableAlias)
              });
            }
          }
          for (const { tsKey, value } of fieldsSelection) {
            selection.push({
              dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
              tsKey,
              field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
              relationTableTsKey: void 0,
              isJson: false,
              selection: []
            });
          }
          let orderByOrig = typeof config2.orderBy === "function" ? config2.orderBy(aliasedColumns, getOrderByOperators()) : config2.orderBy ?? [];
          if (!Array.isArray(orderByOrig)) {
            orderByOrig = [orderByOrig];
          }
          orderBy = orderByOrig.map((orderByValue) => {
            if (is(orderByValue, Column)) {
              return aliasedTableColumn(orderByValue, tableAlias);
            }
            return mapColumnsInSQLToAlias(orderByValue, tableAlias);
          });
          limit = config2.limit;
          offset = config2.offset;
          for (const {
            tsKey: selectedRelationTsKey,
            queryConfig: selectedRelationConfigValue,
            relation
          } of selectedRelations) {
            const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
            const relationTableName = getTableUniqueName(relation.referencedTable);
            const relationTableTsName = tableNamesMap[relationTableName];
            const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
            const joinOn2 = and(
              ...normalizedRelation.fields.map(
                (field2, i) => eq(
                  aliasedTableColumn(normalizedRelation.references[i], relationTableAlias),
                  aliasedTableColumn(field2, tableAlias)
                )
              )
            );
            const builtRelation = this.buildRelationalQuery({
              fullSchema,
              schema,
              tableNamesMap,
              table: fullSchema[relationTableTsName],
              tableConfig: schema[relationTableTsName],
              queryConfig: is(relation, One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
              tableAlias: relationTableAlias,
              joinOn: joinOn2,
              nestedQueryRelation: relation
            });
            const field = sql`(${builtRelation.sql})`.as(selectedRelationTsKey);
            selection.push({
              dbKey: selectedRelationTsKey,
              tsKey: selectedRelationTsKey,
              field,
              relationTableTsKey: relationTableTsName,
              isJson: true,
              selection: builtRelation.selection
            });
          }
        }
        if (selection.length === 0) {
          throw new DrizzleError({
            message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}"). You need to have at least one item in "columns", "with" or "extras". If you need to select all columns, omit the "columns" key or set it to undefined.`
          });
        }
        let result;
        where = and(joinOn, where);
        if (nestedQueryRelation) {
          let field = sql`json_array(${sql.join(
            selection.map(
              ({ field: field2 }) => is(field2, SQLiteColumn) ? sql.identifier(field2.name) : is(field2, SQL.Aliased) ? field2.sql : field2
            ),
            sql`, `
          )})`;
          if (is(nestedQueryRelation, Many)) {
            field = sql`coalesce(json_group_array(${field}), json_array())`;
          }
          const nestedSelection = [{
            dbKey: "data",
            tsKey: "data",
            field: field.as("data"),
            isJson: true,
            relationTableTsKey: tableConfig.tsName,
            selection
          }];
          const needsSubquery = limit !== void 0 || offset !== void 0 || orderBy.length > 0;
          if (needsSubquery) {
            result = this.buildSelectQuery({
              table: aliasedTable(table, tableAlias),
              fields: {},
              fieldsFlat: [
                {
                  path: [],
                  field: sql.raw("*")
                }
              ],
              where,
              limit,
              offset,
              orderBy,
              setOperators: []
            });
            where = void 0;
            limit = void 0;
            offset = void 0;
            orderBy = void 0;
          } else {
            result = aliasedTable(table, tableAlias);
          }
          result = this.buildSelectQuery({
            table: is(result, SQLiteTable) ? result : new Subquery(result, {}, tableAlias),
            fields: {},
            fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
              path: [],
              field: is(field2, Column) ? aliasedTableColumn(field2, tableAlias) : field2
            })),
            joins,
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
        } else {
          result = this.buildSelectQuery({
            table: aliasedTable(table, tableAlias),
            fields: {},
            fieldsFlat: selection.map(({ field }) => ({
              path: [],
              field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field
            })),
            joins,
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
        }
        return {
          tableTsKey: tableConfig.tsName,
          sql: result,
          selection
        };
      }
    };
    SQLiteSyncDialect = class extends SQLiteDialect {
      static {
        __name(this, "SQLiteSyncDialect");
      }
      static [entityKind] = "SQLiteSyncDialect";
      migrate(migrations, session, config2) {
        const migrationsTable = config2 === void 0 ? "__drizzle_migrations" : typeof config2 === "string" ? "__drizzle_migrations" : config2.migrationsTable ?? "__drizzle_migrations";
        const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			)
		`;
        session.run(migrationTableCreate);
        const dbMigrations = session.values(
          sql`SELECT id, hash, created_at FROM ${sql.identifier(migrationsTable)} ORDER BY created_at DESC LIMIT 1`
        );
        const lastDbMigration = dbMigrations[0] ?? void 0;
        session.run(sql`BEGIN`);
        try {
          for (const migration of migrations) {
            if (!lastDbMigration || Number(lastDbMigration[2]) < migration.folderMillis) {
              for (const stmt of migration.sql) {
                session.run(sql.raw(stmt));
              }
              session.run(
                sql`INSERT INTO ${sql.identifier(migrationsTable)} ("hash", "created_at") VALUES(${migration.hash}, ${migration.folderMillis})`
              );
            }
          }
          session.run(sql`COMMIT`);
        } catch (e) {
          session.run(sql`ROLLBACK`);
          throw e;
        }
      }
    };
    SQLiteAsyncDialect = class extends SQLiteDialect {
      static {
        __name(this, "SQLiteAsyncDialect");
      }
      static [entityKind] = "SQLiteAsyncDialect";
      async migrate(migrations, session, config2) {
        const migrationsTable = config2 === void 0 ? "__drizzle_migrations" : typeof config2 === "string" ? "__drizzle_migrations" : config2.migrationsTable ?? "__drizzle_migrations";
        const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			)
		`;
        await session.run(migrationTableCreate);
        const dbMigrations = await session.values(
          sql`SELECT id, hash, created_at FROM ${sql.identifier(migrationsTable)} ORDER BY created_at DESC LIMIT 1`
        );
        const lastDbMigration = dbMigrations[0] ?? void 0;
        await session.transaction(async (tx) => {
          for (const migration of migrations) {
            if (!lastDbMigration || Number(lastDbMigration[2]) < migration.folderMillis) {
              for (const stmt of migration.sql) {
                await tx.run(sql.raw(stmt));
              }
              await tx.run(
                sql`INSERT INTO ${sql.identifier(migrationsTable)} ("hash", "created_at") VALUES(${migration.hash}, ${migration.folderMillis})`
              );
            }
          }
        });
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/query-builders/query-builder.js
var TypedQueryBuilder;
var init_query_builder = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/query-builders/query-builder.js"() {
    init_entity();
    TypedQueryBuilder = class {
      static {
        __name(this, "TypedQueryBuilder");
      }
      static [entityKind] = "TypedQueryBuilder";
      /** @internal */
      getSelectedFields() {
        return this._.selectedFields;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/select.js
function createSetOperator(type, isAll) {
  return (leftSelect, rightSelect, ...restSelects) => {
    const setOperators = [rightSelect, ...restSelects].map((select) => ({
      type,
      isAll,
      rightSelect: select
    }));
    for (const setOperator of setOperators) {
      if (!haveSameKeys(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
        throw new Error(
          "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
        );
      }
    }
    return leftSelect.addSetOperators(setOperators);
  };
}
var SQLiteSelectBuilder, SQLiteSelectQueryBuilderBase, SQLiteSelectBase, getSQLiteSetOperators, union, unionAll, intersect, except;
var init_select2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/select.js"() {
    init_entity();
    init_query_builder();
    init_query_promise();
    init_selection_proxy();
    init_sql();
    init_subquery();
    init_table();
    init_utils();
    init_view_common();
    init_view_base();
    SQLiteSelectBuilder = class {
      static {
        __name(this, "SQLiteSelectBuilder");
      }
      static [entityKind] = "SQLiteSelectBuilder";
      fields;
      session;
      dialect;
      withList;
      distinct;
      constructor(config2) {
        this.fields = config2.fields;
        this.session = config2.session;
        this.dialect = config2.dialect;
        this.withList = config2.withList;
        this.distinct = config2.distinct;
      }
      from(source) {
        const isPartialSelect = !!this.fields;
        let fields;
        if (this.fields) {
          fields = this.fields;
        } else if (is(source, Subquery)) {
          fields = Object.fromEntries(
            Object.keys(source._.selectedFields).map((key) => [key, source[key]])
          );
        } else if (is(source, SQLiteViewBase)) {
          fields = source[ViewBaseConfig].selectedFields;
        } else if (is(source, SQL)) {
          fields = {};
        } else {
          fields = getTableColumns(source);
        }
        return new SQLiteSelectBase({
          table: source,
          fields,
          isPartialSelect,
          session: this.session,
          dialect: this.dialect,
          withList: this.withList,
          distinct: this.distinct
        });
      }
    };
    SQLiteSelectQueryBuilderBase = class extends TypedQueryBuilder {
      static {
        __name(this, "SQLiteSelectQueryBuilderBase");
      }
      static [entityKind] = "SQLiteSelectQueryBuilder";
      _;
      /** @internal */
      config;
      joinsNotNullableMap;
      tableName;
      isPartialSelect;
      session;
      dialect;
      constructor({ table, fields, isPartialSelect, session, dialect, withList, distinct }) {
        super();
        this.config = {
          withList,
          table,
          fields: { ...fields },
          distinct,
          setOperators: []
        };
        this.isPartialSelect = isPartialSelect;
        this.session = session;
        this.dialect = dialect;
        this._ = {
          selectedFields: fields
        };
        this.tableName = getTableLikeName(table);
        this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
      }
      createJoin(joinType) {
        return (table, on) => {
          const baseTableName = this.tableName;
          const tableName = getTableLikeName(table);
          if (typeof tableName === "string" && this.config.joins?.some((join) => join.alias === tableName)) {
            throw new Error(`Alias "${tableName}" is already used in this query`);
          }
          if (!this.isPartialSelect) {
            if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
              this.config.fields = {
                [baseTableName]: this.config.fields
              };
            }
            if (typeof tableName === "string" && !is(table, SQL)) {
              const selection = is(table, Subquery) ? table._.selectedFields : is(table, View) ? table[ViewBaseConfig].selectedFields : table[Table.Symbol.Columns];
              this.config.fields[tableName] = selection;
            }
          }
          if (typeof on === "function") {
            on = on(
              new Proxy(
                this.config.fields,
                new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              )
            );
          }
          if (!this.config.joins) {
            this.config.joins = [];
          }
          this.config.joins.push({ on, table, joinType, alias: tableName });
          if (typeof tableName === "string") {
            switch (joinType) {
              case "left": {
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
              case "right": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "inner": {
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "full": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
            }
          }
          return this;
        };
      }
      /**
       * Executes a `left join` operation by adding another table to the current query.
       *
       * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#left-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User; pets: Pet | null }[] = await db.select()
       *   .from(users)
       *   .leftJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number | null }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .leftJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      leftJoin = this.createJoin("left");
      /**
       * Executes a `right join` operation by adding another table to the current query.
       *
       * Calling this method associates each row of the joined table with the corresponding row from the main table, if a match is found. If no matching row exists, it sets all columns of the main table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#right-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User | null; pets: Pet }[] = await db.select()
       *   .from(users)
       *   .rightJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number | null; petId: number }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .rightJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      rightJoin = this.createJoin("right");
      /**
       * Executes an `inner join` operation, creating a new table by combining rows from two tables that have matching values.
       *
       * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User; pets: Pet }[] = await db.select()
       *   .from(users)
       *   .innerJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .innerJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      innerJoin = this.createJoin("inner");
      /**
       * Executes a `full join` operation by combining rows from two tables into a new table.
       *
       * Calling this method retrieves all rows from both main and joined tables, merging rows with matching values and filling in `null` for non-matching columns.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#full-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User | null; pets: Pet | null }[] = await db.select()
       *   .from(users)
       *   .fullJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number | null; petId: number | null }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .fullJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      fullJoin = this.createJoin("full");
      createSetOperator(type, isAll) {
        return (rightSelection) => {
          const rightSelect = typeof rightSelection === "function" ? rightSelection(getSQLiteSetOperators()) : rightSelection;
          if (!haveSameKeys(this.getSelectedFields(), rightSelect.getSelectedFields())) {
            throw new Error(
              "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
            );
          }
          this.config.setOperators.push({ type, isAll, rightSelect });
          return this;
        };
      }
      /**
       * Adds `union` set operator to the query.
       *
       * Calling this method will combine the result sets of the `select` statements and remove any duplicate rows that appear across them.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#union}
       *
       * @example
       *
       * ```ts
       * // Select all unique names from customers and users tables
       * await db.select({ name: users.name })
       *   .from(users)
       *   .union(
       *     db.select({ name: customers.name }).from(customers)
       *   );
       * // or
       * import { union } from 'drizzle-orm/sqlite-core'
       *
       * await union(
       *   db.select({ name: users.name }).from(users),
       *   db.select({ name: customers.name }).from(customers)
       * );
       * ```
       */
      union = this.createSetOperator("union", false);
      /**
       * Adds `union all` set operator to the query.
       *
       * Calling this method will combine the result-set of the `select` statements and keep all duplicate rows that appear across them.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#union-all}
       *
       * @example
       *
       * ```ts
       * // Select all transaction ids from both online and in-store sales
       * await db.select({ transaction: onlineSales.transactionId })
       *   .from(onlineSales)
       *   .unionAll(
       *     db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
       *   );
       * // or
       * import { unionAll } from 'drizzle-orm/sqlite-core'
       *
       * await unionAll(
       *   db.select({ transaction: onlineSales.transactionId }).from(onlineSales),
       *   db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
       * );
       * ```
       */
      unionAll = this.createSetOperator("union", true);
      /**
       * Adds `intersect` set operator to the query.
       *
       * Calling this method will retain only the rows that are present in both result sets and eliminate duplicates.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect}
       *
       * @example
       *
       * ```ts
       * // Select course names that are offered in both departments A and B
       * await db.select({ courseName: depA.courseName })
       *   .from(depA)
       *   .intersect(
       *     db.select({ courseName: depB.courseName }).from(depB)
       *   );
       * // or
       * import { intersect } from 'drizzle-orm/sqlite-core'
       *
       * await intersect(
       *   db.select({ courseName: depA.courseName }).from(depA),
       *   db.select({ courseName: depB.courseName }).from(depB)
       * );
       * ```
       */
      intersect = this.createSetOperator("intersect", false);
      /**
       * Adds `except` set operator to the query.
       *
       * Calling this method will retrieve all unique rows from the left query, except for the rows that are present in the result set of the right query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#except}
       *
       * @example
       *
       * ```ts
       * // Select all courses offered in department A but not in department B
       * await db.select({ courseName: depA.courseName })
       *   .from(depA)
       *   .except(
       *     db.select({ courseName: depB.courseName }).from(depB)
       *   );
       * // or
       * import { except } from 'drizzle-orm/sqlite-core'
       *
       * await except(
       *   db.select({ courseName: depA.courseName }).from(depA),
       *   db.select({ courseName: depB.courseName }).from(depB)
       * );
       * ```
       */
      except = this.createSetOperator("except", false);
      /** @internal */
      addSetOperators(setOperators) {
        this.config.setOperators.push(...setOperators);
        return this;
      }
      /**
       * Adds a `where` clause to the query.
       *
       * Calling this method will select only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#filtering}
       *
       * @param where the `where` clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be selected.
       *
       * ```ts
       * // Select all cars with green color
       * await db.select().from(cars).where(eq(cars.color, 'green'));
       * // or
       * await db.select().from(cars).where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Select all BMW cars with a green color
       * await db.select().from(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Select all cars with the green or blue color
       * await db.select().from(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        if (typeof where === "function") {
          where = where(
            new Proxy(
              this.config.fields,
              new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
            )
          );
        }
        this.config.where = where;
        return this;
      }
      /**
       * Adds a `having` clause to the query.
       *
       * Calling this method will select only those rows that fulfill a specified condition. It is typically used with aggregate functions to filter the aggregated data based on a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#aggregations}
       *
       * @param having the `having` clause.
       *
       * @example
       *
       * ```ts
       * // Select all brands with more than one car
       * await db.select({
       * 	brand: cars.brand,
       * 	count: sql<number>`cast(count(${cars.id}) as int)`,
       * })
       *   .from(cars)
       *   .groupBy(cars.brand)
       *   .having(({ count }) => gt(count, 1));
       * ```
       */
      having(having) {
        if (typeof having === "function") {
          having = having(
            new Proxy(
              this.config.fields,
              new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
            )
          );
        }
        this.config.having = having;
        return this;
      }
      groupBy(...columns) {
        if (typeof columns[0] === "function") {
          const groupBy = columns[0](
            new Proxy(
              this.config.fields,
              new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
            )
          );
          this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
        } else {
          this.config.groupBy = columns;
        }
        return this;
      }
      orderBy(...columns) {
        if (typeof columns[0] === "function") {
          const orderBy = columns[0](
            new Proxy(
              this.config.fields,
              new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
            )
          );
          const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
          if (this.config.setOperators.length > 0) {
            this.config.setOperators.at(-1).orderBy = orderByArray;
          } else {
            this.config.orderBy = orderByArray;
          }
        } else {
          const orderByArray = columns;
          if (this.config.setOperators.length > 0) {
            this.config.setOperators.at(-1).orderBy = orderByArray;
          } else {
            this.config.orderBy = orderByArray;
          }
        }
        return this;
      }
      /**
       * Adds a `limit` clause to the query.
       *
       * Calling this method will set the maximum number of rows that will be returned by this query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
       *
       * @param limit the `limit` clause.
       *
       * @example
       *
       * ```ts
       * // Get the first 10 people from this query.
       * await db.select().from(people).limit(10);
       * ```
       */
      limit(limit) {
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).limit = limit;
        } else {
          this.config.limit = limit;
        }
        return this;
      }
      /**
       * Adds an `offset` clause to the query.
       *
       * Calling this method will skip a number of rows when returning results from this query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
       *
       * @param offset the `offset` clause.
       *
       * @example
       *
       * ```ts
       * // Get the 10th-20th people from this query.
       * await db.select().from(people).offset(10).limit(10);
       * ```
       */
      offset(offset) {
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).offset = offset;
        } else {
          this.config.offset = offset;
        }
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildSelectQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      as(alias) {
        return new Proxy(
          new Subquery(this.getSQL(), this.config.fields, alias),
          new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
      /** @internal */
      getSelectedFields() {
        return new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
      $dynamic() {
        return this;
      }
    };
    SQLiteSelectBase = class extends SQLiteSelectQueryBuilderBase {
      static {
        __name(this, "SQLiteSelectBase");
      }
      static [entityKind] = "SQLiteSelect";
      /** @internal */
      _prepare(isOneTimeQuery = true) {
        if (!this.session) {
          throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
        }
        const fieldsList = orderSelectedFields(this.config.fields);
        const query = this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
          this.dialect.sqlToQuery(this.getSQL()),
          fieldsList,
          "all",
          true
        );
        query.joinsNotNullableMap = this.joinsNotNullableMap;
        return query;
      }
      prepare() {
        return this._prepare(false);
      }
      run = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().run(placeholderValues);
      }, "run");
      all = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().all(placeholderValues);
      }, "all");
      get = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().get(placeholderValues);
      }, "get");
      values = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().values(placeholderValues);
      }, "values");
      async execute() {
        return this.all();
      }
    };
    applyMixins(SQLiteSelectBase, [QueryPromise]);
    __name(createSetOperator, "createSetOperator");
    getSQLiteSetOperators = /* @__PURE__ */ __name(() => ({
      union,
      unionAll,
      intersect,
      except
    }), "getSQLiteSetOperators");
    union = createSetOperator("union", false);
    unionAll = createSetOperator("union", true);
    intersect = createSetOperator("intersect", false);
    except = createSetOperator("except", false);
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/query-builder.js
var QueryBuilder;
var init_query_builder2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/query-builder.js"() {
    init_entity();
    init_selection_proxy();
    init_dialect();
    init_subquery();
    init_select2();
    QueryBuilder = class {
      static {
        __name(this, "QueryBuilder");
      }
      static [entityKind] = "SQLiteQueryBuilder";
      dialect;
      $with(alias) {
        const queryBuilder = this;
        return {
          as(qb) {
            if (typeof qb === "function") {
              qb = qb(queryBuilder);
            }
            return new Proxy(
              new WithSubquery(qb.getSQL(), qb.getSelectedFields(), alias, true),
              new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
            );
          }
        };
      }
      with(...queries) {
        const self2 = this;
        function select(fields) {
          return new SQLiteSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self2.getDialect(),
            withList: queries
          });
        }
        __name(select, "select");
        function selectDistinct(fields) {
          return new SQLiteSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self2.getDialect(),
            withList: queries,
            distinct: true
          });
        }
        __name(selectDistinct, "selectDistinct");
        return { select, selectDistinct };
      }
      select(fields) {
        return new SQLiteSelectBuilder({ fields: fields ?? void 0, session: void 0, dialect: this.getDialect() });
      }
      selectDistinct(fields) {
        return new SQLiteSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect(),
          distinct: true
        });
      }
      // Lazy load dialect to avoid circular dependency
      getDialect() {
        if (!this.dialect) {
          this.dialect = new SQLiteSyncDialect();
        }
        return this.dialect;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/select.types.js
var init_select_types = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/select.types.js"() {
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/update.js
var SQLiteUpdateBuilder, SQLiteUpdateBase;
var init_update = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/update.js"() {
    init_entity();
    init_query_promise();
    init_table3();
    init_utils();
    SQLiteUpdateBuilder = class {
      static {
        __name(this, "SQLiteUpdateBuilder");
      }
      constructor(table, session, dialect, withList) {
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.withList = withList;
      }
      static [entityKind] = "SQLiteUpdateBuilder";
      set(values) {
        return new SQLiteUpdateBase(
          this.table,
          mapUpdateSet(this.table, values),
          this.session,
          this.dialect,
          this.withList
        );
      }
    };
    SQLiteUpdateBase = class extends QueryPromise {
      static {
        __name(this, "SQLiteUpdateBase");
      }
      constructor(table, set, session, dialect, withList) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { set, table, withList };
      }
      static [entityKind] = "SQLiteUpdate";
      /** @internal */
      config;
      /**
       * Adds a 'where' clause to the query.
       *
       * Calling this method will update only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/update}
       *
       * @param where the 'where' clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be updated.
       *
       * ```ts
       * // Update all cars with green color
       * db.update(cars).set({ color: 'red' })
       *   .where(eq(cars.color, 'green'));
       * // or
       * db.update(cars).set({ color: 'red' })
       *   .where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Update all BMW cars with a green color
       * db.update(cars).set({ color: 'red' })
       *   .where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Update all cars with the green or blue color
       * db.update(cars).set({ color: 'red' })
       *   .where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        this.config.where = where;
        return this;
      }
      returning(fields = this.config.table[SQLiteTable.Symbol.Columns]) {
        this.config.returning = orderSelectedFields(fields);
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildUpdateQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(isOneTimeQuery = true) {
        return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
          this.dialect.sqlToQuery(this.getSQL()),
          this.config.returning,
          this.config.returning ? "all" : "run",
          true
        );
      }
      prepare() {
        return this._prepare(false);
      }
      run = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().run(placeholderValues);
      }, "run");
      all = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().all(placeholderValues);
      }, "all");
      get = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().get(placeholderValues);
      }, "get");
      values = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().values(placeholderValues);
      }, "values");
      async execute() {
        return this.config.returning ? this.all() : this.run();
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/index.js
var init_query_builders = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/index.js"() {
    init_delete();
    init_insert();
    init_query_builder2();
    init_select2();
    init_select_types();
    init_update();
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/query.js
var RelationalQueryBuilder, SQLiteRelationalQuery, SQLiteSyncRelationalQuery;
var init_query = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/query.js"() {
    init_entity();
    init_query_promise();
    init_relations();
    RelationalQueryBuilder = class {
      static {
        __name(this, "RelationalQueryBuilder");
      }
      constructor(mode, fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session) {
        this.mode = mode;
        this.fullSchema = fullSchema;
        this.schema = schema;
        this.tableNamesMap = tableNamesMap;
        this.table = table;
        this.tableConfig = tableConfig;
        this.dialect = dialect;
        this.session = session;
      }
      static [entityKind] = "SQLiteAsyncRelationalQueryBuilder";
      findMany(config2) {
        return this.mode === "sync" ? new SQLiteSyncRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config2 ? config2 : {},
          "many"
        ) : new SQLiteRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config2 ? config2 : {},
          "many"
        );
      }
      findFirst(config2) {
        return this.mode === "sync" ? new SQLiteSyncRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config2 ? { ...config2, limit: 1 } : { limit: 1 },
          "first"
        ) : new SQLiteRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config2 ? { ...config2, limit: 1 } : { limit: 1 },
          "first"
        );
      }
    };
    SQLiteRelationalQuery = class extends QueryPromise {
      static {
        __name(this, "SQLiteRelationalQuery");
      }
      constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session, config2, mode) {
        super();
        this.fullSchema = fullSchema;
        this.schema = schema;
        this.tableNamesMap = tableNamesMap;
        this.table = table;
        this.tableConfig = tableConfig;
        this.dialect = dialect;
        this.session = session;
        this.config = config2;
        this.mode = mode;
      }
      static [entityKind] = "SQLiteAsyncRelationalQuery";
      /** @internal */
      mode;
      /** @internal */
      getSQL() {
        return this.dialect.buildRelationalQuery({
          fullSchema: this.fullSchema,
          schema: this.schema,
          tableNamesMap: this.tableNamesMap,
          table: this.table,
          tableConfig: this.tableConfig,
          queryConfig: this.config,
          tableAlias: this.tableConfig.tsName
        }).sql;
      }
      /** @internal */
      _prepare(isOneTimeQuery = false) {
        const { query, builtQuery } = this._toSQL();
        return this.session[isOneTimeQuery ? "prepareOneTimeQuery" : "prepareQuery"](
          builtQuery,
          void 0,
          this.mode === "first" ? "get" : "all",
          true,
          (rawRows, mapColumnValue) => {
            const rows = rawRows.map(
              (row) => mapRelationalRow(this.schema, this.tableConfig, row, query.selection, mapColumnValue)
            );
            if (this.mode === "first") {
              return rows[0];
            }
            return rows;
          }
        );
      }
      prepare() {
        return this._prepare(false);
      }
      _toSQL() {
        const query = this.dialect.buildRelationalQuery({
          fullSchema: this.fullSchema,
          schema: this.schema,
          tableNamesMap: this.tableNamesMap,
          table: this.table,
          tableConfig: this.tableConfig,
          queryConfig: this.config,
          tableAlias: this.tableConfig.tsName
        });
        const builtQuery = this.dialect.sqlToQuery(query.sql);
        return { query, builtQuery };
      }
      toSQL() {
        return this._toSQL().builtQuery;
      }
      /** @internal */
      executeRaw() {
        if (this.mode === "first") {
          return this._prepare(false).get();
        }
        return this._prepare(false).all();
      }
      async execute() {
        return this.executeRaw();
      }
    };
    SQLiteSyncRelationalQuery = class extends SQLiteRelationalQuery {
      static {
        __name(this, "SQLiteSyncRelationalQuery");
      }
      static [entityKind] = "SQLiteSyncRelationalQuery";
      sync() {
        return this.executeRaw();
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/raw.js
var SQLiteRaw;
var init_raw = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/query-builders/raw.js"() {
    init_entity();
    init_query_promise();
    SQLiteRaw = class extends QueryPromise {
      static {
        __name(this, "SQLiteRaw");
      }
      constructor(execute, getSQL, action, dialect, mapBatchResult) {
        super();
        this.execute = execute;
        this.getSQL = getSQL;
        this.dialect = dialect;
        this.mapBatchResult = mapBatchResult;
        this.config = { action };
      }
      static [entityKind] = "SQLiteRaw";
      /** @internal */
      config;
      getQuery() {
        return { ...this.dialect.sqlToQuery(this.getSQL()), method: this.config.action };
      }
      mapResult(result, isFromBatch) {
        return isFromBatch ? this.mapBatchResult(result) : result;
      }
      _prepare() {
        return this;
      }
      /** @internal */
      isResponseInArrayMode() {
        return false;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/db.js
var BaseSQLiteDatabase;
var init_db = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/db.js"() {
    init_entity();
    init_selection_proxy();
    init_query_builders();
    init_subquery();
    init_query();
    init_raw();
    BaseSQLiteDatabase = class {
      static {
        __name(this, "BaseSQLiteDatabase");
      }
      constructor(resultKind, dialect, session, schema) {
        this.resultKind = resultKind;
        this.dialect = dialect;
        this.session = session;
        this._ = schema ? {
          schema: schema.schema,
          fullSchema: schema.fullSchema,
          tableNamesMap: schema.tableNamesMap
        } : {
          schema: void 0,
          fullSchema: {},
          tableNamesMap: {}
        };
        this.query = {};
        const query = this.query;
        if (this._.schema) {
          for (const [tableName, columns] of Object.entries(this._.schema)) {
            query[tableName] = new RelationalQueryBuilder(
              resultKind,
              schema.fullSchema,
              this._.schema,
              this._.tableNamesMap,
              schema.fullSchema[tableName],
              columns,
              dialect,
              session
            );
          }
        }
      }
      static [entityKind] = "BaseSQLiteDatabase";
      query;
      /**
       * Creates a subquery that defines a temporary named result set as a CTE.
       *
       * It is useful for breaking down complex queries into simpler parts and for reusing the result set in subsequent parts of the query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
       *
       * @param alias The alias for the subquery.
       *
       * Failure to provide an alias will result in a DrizzleTypeError, preventing the subquery from being referenced in other queries.
       *
       * @example
       *
       * ```ts
       * // Create a subquery with alias 'sq' and use it in the select query
       * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
       *
       * const result = await db.with(sq).select().from(sq);
       * ```
       *
       * To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query, you need to add aliases to them:
       *
       * ```ts
       * // Select an arbitrary SQL value as a field in a CTE and reference it in the main query
       * const sq = db.$with('sq').as(db.select({
       *   name: sql<string>`upper(${users.name})`.as('name'),
       * })
       * .from(users));
       *
       * const result = await db.with(sq).select({ name: sq.name }).from(sq);
       * ```
       */
      $with(alias) {
        return {
          as(qb) {
            if (typeof qb === "function") {
              qb = qb(new QueryBuilder());
            }
            return new Proxy(
              new WithSubquery(qb.getSQL(), qb.getSelectedFields(), alias, true),
              new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
            );
          }
        };
      }
      /**
       * Incorporates a previously defined CTE (using `$with`) into the main query.
       *
       * This method allows the main query to reference a temporary named result set.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
       *
       * @param queries The CTEs to incorporate into the main query.
       *
       * @example
       *
       * ```ts
       * // Define a subquery 'sq' as a CTE using $with
       * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
       *
       * // Incorporate the CTE 'sq' into the main query and select from it
       * const result = await db.with(sq).select().from(sq);
       * ```
       */
      with(...queries) {
        const self2 = this;
        function select(fields) {
          return new SQLiteSelectBuilder({
            fields: fields ?? void 0,
            session: self2.session,
            dialect: self2.dialect,
            withList: queries
          });
        }
        __name(select, "select");
        function selectDistinct(fields) {
          return new SQLiteSelectBuilder({
            fields: fields ?? void 0,
            session: self2.session,
            dialect: self2.dialect,
            withList: queries,
            distinct: true
          });
        }
        __name(selectDistinct, "selectDistinct");
        function update(table) {
          return new SQLiteUpdateBuilder(table, self2.session, self2.dialect, queries);
        }
        __name(update, "update");
        function insert(into) {
          return new SQLiteInsertBuilder(into, self2.session, self2.dialect, queries);
        }
        __name(insert, "insert");
        function delete_(from) {
          return new SQLiteDeleteBase(from, self2.session, self2.dialect, queries);
        }
        __name(delete_, "delete_");
        return { select, selectDistinct, update, insert, delete: delete_ };
      }
      select(fields) {
        return new SQLiteSelectBuilder({ fields: fields ?? void 0, session: this.session, dialect: this.dialect });
      }
      selectDistinct(fields) {
        return new SQLiteSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect,
          distinct: true
        });
      }
      /**
       * Creates an update query.
       *
       * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
       *
       * Use `.set()` method to specify which values to update.
       *
       * See docs: {@link https://orm.drizzle.team/docs/update}
       *
       * @param table The table to update.
       *
       * @example
       *
       * ```ts
       * // Update all rows in the 'cars' table
       * await db.update(cars).set({ color: 'red' });
       *
       * // Update rows with filters and conditions
       * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
       *
       * // Update with returning clause
       * const updatedCar: Car[] = await db.update(cars)
       *   .set({ color: 'red' })
       *   .where(eq(cars.id, 1))
       *   .returning();
       * ```
       */
      update(table) {
        return new SQLiteUpdateBuilder(table, this.session, this.dialect);
      }
      /**
       * Creates an insert query.
       *
       * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert}
       *
       * @param table The table to insert into.
       *
       * @example
       *
       * ```ts
       * // Insert one row
       * await db.insert(cars).values({ brand: 'BMW' });
       *
       * // Insert multiple rows
       * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
       *
       * // Insert with returning clause
       * const insertedCar: Car[] = await db.insert(cars)
       *   .values({ brand: 'BMW' })
       *   .returning();
       * ```
       */
      insert(into) {
        return new SQLiteInsertBuilder(into, this.session, this.dialect);
      }
      /**
       * Creates a delete query.
       *
       * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
       *
       * See docs: {@link https://orm.drizzle.team/docs/delete}
       *
       * @param table The table to delete from.
       *
       * @example
       *
       * ```ts
       * // Delete all rows in the 'cars' table
       * await db.delete(cars);
       *
       * // Delete rows with filters and conditions
       * await db.delete(cars).where(eq(cars.color, 'green'));
       *
       * // Delete with returning clause
       * const deletedCar: Car[] = await db.delete(cars)
       *   .where(eq(cars.id, 1))
       *   .returning();
       * ```
       */
      delete(from) {
        return new SQLiteDeleteBase(from, this.session, this.dialect);
      }
      run(query) {
        const sql4 = query.getSQL();
        if (this.resultKind === "async") {
          return new SQLiteRaw(
            async () => this.session.run(sql4),
            () => sql4,
            "run",
            this.dialect,
            this.session.extractRawRunValueFromBatchResult.bind(this.session)
          );
        }
        return this.session.run(sql4);
      }
      all(query) {
        const sql4 = query.getSQL();
        if (this.resultKind === "async") {
          return new SQLiteRaw(
            async () => this.session.all(sql4),
            () => sql4,
            "all",
            this.dialect,
            this.session.extractRawAllValueFromBatchResult.bind(this.session)
          );
        }
        return this.session.all(sql4);
      }
      get(query) {
        const sql4 = query.getSQL();
        if (this.resultKind === "async") {
          return new SQLiteRaw(
            async () => this.session.get(sql4),
            () => sql4,
            "get",
            this.dialect,
            this.session.extractRawGetValueFromBatchResult.bind(this.session)
          );
        }
        return this.session.get(sql4);
      }
      values(query) {
        const sql4 = query.getSQL();
        if (this.resultKind === "async") {
          return new SQLiteRaw(
            async () => this.session.values(sql4),
            () => sql4,
            "values",
            this.dialect,
            this.session.extractRawValuesValueFromBatchResult.bind(this.session)
          );
        }
        return this.session.values(sql4);
      }
      transaction(transaction, config2) {
        return this.session.transaction(transaction, config2);
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/alias.js
var init_alias2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/alias.js"() {
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/checks.js
var CheckBuilder, Check;
var init_checks = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/checks.js"() {
    init_entity();
    CheckBuilder = class {
      static {
        __name(this, "CheckBuilder");
      }
      constructor(name2, value) {
        this.name = name2;
        this.value = value;
      }
      static [entityKind] = "SQLiteCheckBuilder";
      brand;
      build(table) {
        return new Check(table, this);
      }
    };
    Check = class {
      static {
        __name(this, "Check");
      }
      constructor(table, builder) {
        this.table = table;
        this.name = builder.name;
        this.value = builder.value;
      }
      static [entityKind] = "SQLiteCheck";
      name;
      value;
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/indexes.js
var IndexBuilderOn, IndexBuilder, Index;
var init_indexes = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/indexes.js"() {
    init_entity();
    IndexBuilderOn = class {
      static {
        __name(this, "IndexBuilderOn");
      }
      constructor(name2, unique) {
        this.name = name2;
        this.unique = unique;
      }
      static [entityKind] = "SQLiteIndexBuilderOn";
      on(...columns) {
        return new IndexBuilder(this.name, columns, this.unique);
      }
    };
    IndexBuilder = class {
      static {
        __name(this, "IndexBuilder");
      }
      static [entityKind] = "SQLiteIndexBuilder";
      /** @internal */
      config;
      constructor(name2, columns, unique) {
        this.config = {
          name: name2,
          columns,
          unique,
          where: void 0
        };
      }
      /**
       * Condition for partial index.
       */
      where(condition) {
        this.config.where = condition;
        return this;
      }
      /** @internal */
      build(table) {
        return new Index(this.config, table);
      }
    };
    Index = class {
      static {
        __name(this, "Index");
      }
      static [entityKind] = "SQLiteIndex";
      config;
      constructor(config2, table) {
        this.config = { ...config2, table };
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/primary-keys.js
var PrimaryKeyBuilder2, PrimaryKey2;
var init_primary_keys2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/primary-keys.js"() {
    init_entity();
    init_table3();
    PrimaryKeyBuilder2 = class {
      static {
        __name(this, "PrimaryKeyBuilder");
      }
      static [entityKind] = "SQLitePrimaryKeyBuilder";
      /** @internal */
      columns;
      /** @internal */
      name;
      constructor(columns, name2) {
        this.columns = columns;
        this.name = name2;
      }
      /** @internal */
      build(table) {
        return new PrimaryKey2(table, this.columns, this.name);
      }
    };
    PrimaryKey2 = class {
      static {
        __name(this, "PrimaryKey");
      }
      constructor(table, columns, name2) {
        this.table = table;
        this.columns = columns;
        this.name = name2;
      }
      static [entityKind] = "SQLitePrimaryKey";
      columns;
      name;
      getName() {
        return this.name ?? `${this.table[SQLiteTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/session.js
var ExecuteResultSync, SQLitePreparedQuery, SQLiteSession, SQLiteTransaction;
var init_session = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/session.js"() {
    init_entity();
    init_errors();
    init_query_promise();
    init_db();
    ExecuteResultSync = class extends QueryPromise {
      static {
        __name(this, "ExecuteResultSync");
      }
      constructor(resultCb) {
        super();
        this.resultCb = resultCb;
      }
      static [entityKind] = "ExecuteResultSync";
      async execute() {
        return this.resultCb();
      }
      sync() {
        return this.resultCb();
      }
    };
    SQLitePreparedQuery = class {
      static {
        __name(this, "SQLitePreparedQuery");
      }
      constructor(mode, executeMethod, query) {
        this.mode = mode;
        this.executeMethod = executeMethod;
        this.query = query;
      }
      static [entityKind] = "PreparedQuery";
      /** @internal */
      joinsNotNullableMap;
      getQuery() {
        return this.query;
      }
      mapRunResult(result, _isFromBatch) {
        return result;
      }
      mapAllResult(_result, _isFromBatch) {
        throw new Error("Not implemented");
      }
      mapGetResult(_result, _isFromBatch) {
        throw new Error("Not implemented");
      }
      execute(placeholderValues) {
        if (this.mode === "async") {
          return this[this.executeMethod](placeholderValues);
        }
        return new ExecuteResultSync(() => this[this.executeMethod](placeholderValues));
      }
      mapResult(response, isFromBatch) {
        switch (this.executeMethod) {
          case "run": {
            return this.mapRunResult(response, isFromBatch);
          }
          case "all": {
            return this.mapAllResult(response, isFromBatch);
          }
          case "get": {
            return this.mapGetResult(response, isFromBatch);
          }
        }
      }
    };
    SQLiteSession = class {
      static {
        __name(this, "SQLiteSession");
      }
      constructor(dialect) {
        this.dialect = dialect;
      }
      static [entityKind] = "SQLiteSession";
      prepareOneTimeQuery(query, fields, executeMethod, isResponseInArrayMode) {
        return this.prepareQuery(query, fields, executeMethod, isResponseInArrayMode);
      }
      run(query) {
        const staticQuery = this.dialect.sqlToQuery(query);
        try {
          return this.prepareOneTimeQuery(staticQuery, void 0, "run", false).run();
        } catch (err) {
          throw new DrizzleError({ cause: err, message: `Failed to run the query '${staticQuery.sql}'` });
        }
      }
      /** @internal */
      extractRawRunValueFromBatchResult(result) {
        return result;
      }
      all(query) {
        return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), void 0, "run", false).all();
      }
      /** @internal */
      extractRawAllValueFromBatchResult(_result) {
        throw new Error("Not implemented");
      }
      get(query) {
        return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), void 0, "run", false).get();
      }
      /** @internal */
      extractRawGetValueFromBatchResult(_result) {
        throw new Error("Not implemented");
      }
      values(query) {
        return this.prepareOneTimeQuery(this.dialect.sqlToQuery(query), void 0, "run", false).values();
      }
      /** @internal */
      extractRawValuesValueFromBatchResult(_result) {
        throw new Error("Not implemented");
      }
    };
    SQLiteTransaction = class extends BaseSQLiteDatabase {
      static {
        __name(this, "SQLiteTransaction");
      }
      constructor(resultType, dialect, session, schema, nestedIndex = 0) {
        super(resultType, dialect, session, schema);
        this.schema = schema;
        this.nestedIndex = nestedIndex;
      }
      static [entityKind] = "SQLiteTransaction";
      rollback() {
        throw new TransactionRollbackError();
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/subquery.js
var init_subquery2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/subquery.js"() {
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/view-common.js
var SQLiteViewConfig;
var init_view_common2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/view-common.js"() {
    SQLiteViewConfig = /* @__PURE__ */ Symbol.for("drizzle:SQLiteViewConfig");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/utils.js
var init_utils2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/utils.js"() {
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/view.js
var ViewBuilderCore, ViewBuilder, ManualViewBuilder, SQLiteView;
var init_view = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/view.js"() {
    init_entity();
    init_selection_proxy();
    init_utils();
    init_query_builder2();
    init_table3();
    init_view_base();
    init_view_common2();
    ViewBuilderCore = class {
      static {
        __name(this, "ViewBuilderCore");
      }
      constructor(name2) {
        this.name = name2;
      }
      static [entityKind] = "SQLiteViewBuilderCore";
      config = {};
    };
    ViewBuilder = class extends ViewBuilderCore {
      static {
        __name(this, "ViewBuilder");
      }
      static [entityKind] = "SQLiteViewBuilder";
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(new QueryBuilder());
        }
        const selectionProxy = new SelectionProxyHandler({
          alias: this.name,
          sqlBehavior: "error",
          sqlAliasedBehavior: "alias",
          replaceOriginalName: true
        });
        const aliasedSelectedFields = qb.getSelectedFields();
        return new Proxy(
          new SQLiteView({
            sqliteConfig: this.config,
            config: {
              name: this.name,
              schema: void 0,
              selectedFields: aliasedSelectedFields,
              query: qb.getSQL().inlineParams()
            }
          }),
          selectionProxy
        );
      }
    };
    ManualViewBuilder = class extends ViewBuilderCore {
      static {
        __name(this, "ManualViewBuilder");
      }
      static [entityKind] = "SQLiteManualViewBuilder";
      columns;
      constructor(name2, columns) {
        super(name2);
        this.columns = getTableColumns(sqliteTable(name2, columns));
      }
      existing() {
        return new Proxy(
          new SQLiteView({
            sqliteConfig: void 0,
            config: {
              name: this.name,
              schema: void 0,
              selectedFields: this.columns,
              query: void 0
            }
          }),
          new SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
      as(query) {
        return new Proxy(
          new SQLiteView({
            sqliteConfig: this.config,
            config: {
              name: this.name,
              schema: void 0,
              selectedFields: this.columns,
              query: query.inlineParams()
            }
          }),
          new SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
    };
    SQLiteView = class extends SQLiteViewBase {
      static {
        __name(this, "SQLiteView");
      }
      static [entityKind] = "SQLiteView";
      /** @internal */
      [SQLiteViewConfig];
      constructor({ sqliteConfig, config: config2 }) {
        super(config2);
        this[SQLiteViewConfig] = sqliteConfig;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/index.js
var init_sqlite_core = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/sqlite-core/index.js"() {
    init_alias2();
    init_checks();
    init_columns();
    init_db();
    init_dialect();
    init_foreign_keys2();
    init_indexes();
    init_primary_keys2();
    init_query_builders();
    init_session();
    init_subquery2();
    init_table3();
    init_unique_constraint2();
    init_utils2();
    init_view();
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/d1/session.js
function d1ToRawMapping(results) {
  const rows = [];
  for (const row of results) {
    const entry = Object.keys(row).map((k) => row[k]);
    rows.push(entry);
  }
  return rows;
}
var SQLiteD1Session, D1Transaction, D1PreparedQuery;
var init_session2 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/d1/session.js"() {
    init_entity();
    init_logger();
    init_sql();
    init_sqlite_core();
    init_session();
    init_utils();
    SQLiteD1Session = class extends SQLiteSession {
      static {
        __name(this, "SQLiteD1Session");
      }
      constructor(client, dialect, schema, options = {}) {
        super(dialect);
        this.client = client;
        this.schema = schema;
        this.options = options;
        this.logger = options.logger ?? new NoopLogger();
      }
      static [entityKind] = "SQLiteD1Session";
      logger;
      prepareQuery(query, fields, executeMethod, isResponseInArrayMode, customResultMapper) {
        const stmt = this.client.prepare(query.sql);
        return new D1PreparedQuery(
          stmt,
          query,
          this.logger,
          fields,
          executeMethod,
          isResponseInArrayMode,
          customResultMapper
        );
      }
      async batch(queries) {
        const preparedQueries = [];
        const builtQueries = [];
        for (const query of queries) {
          const preparedQuery = query._prepare();
          const builtQuery = preparedQuery.getQuery();
          preparedQueries.push(preparedQuery);
          if (builtQuery.params.length > 0) {
            builtQueries.push(preparedQuery.stmt.bind(...builtQuery.params));
          } else {
            const builtQuery2 = preparedQuery.getQuery();
            builtQueries.push(
              this.client.prepare(builtQuery2.sql).bind(...builtQuery2.params)
            );
          }
        }
        const batchResults = await this.client.batch(builtQueries);
        return batchResults.map((result, i) => preparedQueries[i].mapResult(result, true));
      }
      extractRawAllValueFromBatchResult(result) {
        return result.results;
      }
      extractRawGetValueFromBatchResult(result) {
        return result.results[0];
      }
      extractRawValuesValueFromBatchResult(result) {
        return d1ToRawMapping(result.results);
      }
      async transaction(transaction, config2) {
        const tx = new D1Transaction("async", this.dialect, this, this.schema);
        await this.run(sql.raw(`begin${config2?.behavior ? " " + config2.behavior : ""}`));
        try {
          const result = await transaction(tx);
          await this.run(sql`commit`);
          return result;
        } catch (err) {
          await this.run(sql`rollback`);
          throw err;
        }
      }
    };
    D1Transaction = class _D1Transaction extends SQLiteTransaction {
      static {
        __name(this, "D1Transaction");
      }
      static [entityKind] = "D1Transaction";
      async transaction(transaction) {
        const savepointName = `sp${this.nestedIndex}`;
        const tx = new _D1Transaction("async", this.dialect, this.session, this.schema, this.nestedIndex + 1);
        await this.session.run(sql.raw(`savepoint ${savepointName}`));
        try {
          const result = await transaction(tx);
          await this.session.run(sql.raw(`release savepoint ${savepointName}`));
          return result;
        } catch (err) {
          await this.session.run(sql.raw(`rollback to savepoint ${savepointName}`));
          throw err;
        }
      }
    };
    __name(d1ToRawMapping, "d1ToRawMapping");
    D1PreparedQuery = class extends SQLitePreparedQuery {
      static {
        __name(this, "D1PreparedQuery");
      }
      constructor(stmt, query, logger, fields, executeMethod, _isResponseInArrayMode, customResultMapper) {
        super("async", executeMethod, query);
        this.logger = logger;
        this._isResponseInArrayMode = _isResponseInArrayMode;
        this.customResultMapper = customResultMapper;
        this.fields = fields;
        this.stmt = stmt;
      }
      static [entityKind] = "D1PreparedQuery";
      /** @internal */
      customResultMapper;
      /** @internal */
      fields;
      /** @internal */
      stmt;
      run(placeholderValues) {
        const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
        this.logger.logQuery(this.query.sql, params);
        return this.stmt.bind(...params).run();
      }
      async all(placeholderValues) {
        const { fields, query, logger, stmt, customResultMapper } = this;
        if (!fields && !customResultMapper) {
          const params = fillPlaceholders(query.params, placeholderValues ?? {});
          logger.logQuery(query.sql, params);
          return stmt.bind(...params).all().then(({ results }) => this.mapAllResult(results));
        }
        const rows = await this.values(placeholderValues);
        return this.mapAllResult(rows);
      }
      mapAllResult(rows, isFromBatch) {
        if (isFromBatch) {
          rows = d1ToRawMapping(rows.results);
        }
        if (!this.fields && !this.customResultMapper) {
          return rows;
        }
        if (this.customResultMapper) {
          return this.customResultMapper(rows);
        }
        return rows.map((row) => mapResultRow(this.fields, row, this.joinsNotNullableMap));
      }
      async get(placeholderValues) {
        const { fields, joinsNotNullableMap, query, logger, stmt, customResultMapper } = this;
        if (!fields && !customResultMapper) {
          const params = fillPlaceholders(query.params, placeholderValues ?? {});
          logger.logQuery(query.sql, params);
          return stmt.bind(...params).all().then(({ results }) => results[0]);
        }
        const rows = await this.values(placeholderValues);
        if (!rows[0]) {
          return void 0;
        }
        if (customResultMapper) {
          return customResultMapper(rows);
        }
        return mapResultRow(fields, rows[0], joinsNotNullableMap);
      }
      mapGetResult(result, isFromBatch) {
        if (isFromBatch) {
          result = d1ToRawMapping(result.results)[0];
        }
        if (!this.fields && !this.customResultMapper) {
          return result;
        }
        if (this.customResultMapper) {
          return this.customResultMapper([result]);
        }
        return mapResultRow(this.fields, result, this.joinsNotNullableMap);
      }
      values(placeholderValues) {
        const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
        this.logger.logQuery(this.query.sql, params);
        return this.stmt.bind(...params).raw();
      }
      /** @internal */
      isResponseInArrayMode() {
        return this._isResponseInArrayMode;
      }
    };
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/d1/driver.js
function drizzle(client, config2 = {}) {
  const dialect = new SQLiteAsyncDialect();
  let logger;
  if (config2.logger === true) {
    logger = new DefaultLogger();
  } else if (config2.logger !== false) {
    logger = config2.logger;
  }
  let schema;
  if (config2.schema) {
    const tablesConfig = extractTablesRelationalConfig(
      config2.schema,
      createTableRelationsHelpers
    );
    schema = {
      fullSchema: config2.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap
    };
  }
  const session = new SQLiteD1Session(client, dialect, schema, { logger });
  return new DrizzleD1Database("async", dialect, session, schema);
}
var DrizzleD1Database;
var init_driver = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/d1/driver.js"() {
    init_entity();
    init_logger();
    init_relations();
    init_db();
    init_dialect();
    init_session2();
    DrizzleD1Database = class extends BaseSQLiteDatabase {
      static {
        __name(this, "DrizzleD1Database");
      }
      static [entityKind] = "D1Database";
      async batch(batch) {
        return this.session.batch(batch);
      }
    };
    __name(drizzle, "drizzle");
  }
});

// ../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/d1/index.js
var d1_exports = {};
__export(d1_exports, {
  D1PreparedQuery: () => D1PreparedQuery,
  D1Transaction: () => D1Transaction,
  DrizzleD1Database: () => DrizzleD1Database,
  SQLiteD1Session: () => SQLiteD1Session,
  drizzle: () => drizzle
});
var init_d1 = __esm({
  "../../node_modules/.pnpm/drizzle-orm@0.33.0_@cloudfl_dfa21c7a7d0e6ad8d45f25cb48f585c6/node_modules/drizzle-orm/d1/index.js"() {
    init_driver();
    init_session2();
  }
});

// ../../packages/db/src/schema.ts
var users, staffAuthLinks, authFailures, pageEvents, customers, suppliers, products, deliveryDays, orders, deliveryRuns, stops, driverSessions, stockMovements, deliveryDayStock, stocktakeSessions, promoCodes, subscriptions, pushSubscriptions, notifications, processedWebhooks, auditLog, reels, config, businesses, businessMembers, receipts;
var init_schema = __esm({
  "../../packages/db/src/schema.ts"() {
    "use strict";
    init_sqlite_core();
    users = sqliteTable("users", {
      id: text("id").primaryKey(),
      // Clerk user ID
      email: text("email").notNull().unique(),
      name: text("name").notNull().default(""),
      role: text("role").notNull().default("staff"),
      // 'admin' | 'staff' | 'driver'
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      // When true, this user appears in driver lists and is allowed to use the
      // driver app even if role is not 'driver' (e.g. Seamus is role='admin' but
      // also drives). Implicitly true for role='driver' users.
      canDrive: integer("can_drive", { mode: "boolean" }).notNull().default(false),
      phone: text("phone"),
      address: text("address"),
      vehicleInfo: text("vehicle_info"),
      registrationNumber: text("registration_number"),
      licenseNumber: text("license_number"),
      nextOfKin: text("next_of_kin"),
      // JSON: { name, phone }
      zones: text("zones").notNull().default("[]"),
      // JSON: string[] of postcode prefixes
      startAddress: text("start_address"),
      // route starting point for drivers
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
    staffAuthLinks = sqliteTable("staff_auth_links", {
      id: text("id").primaryKey(),
      userId: text("user_id").notNull().references(() => users.id),
      clerkId: text("clerk_id").notNull().unique(),
      email: text("email").notNull(),
      source: text("source").notNull().default("manual"),
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
    authFailures = sqliteTable("auth_failures", {
      id: text("id").primaryKey(),
      supportId: text("support_id").notNull().unique(),
      code: text("code").notNull(),
      clerkId: text("clerk_id"),
      issuer: text("issuer"),
      tokenEmails: text("token_emails").notNull().default("[]"),
      path: text("path").notNull().default(""),
      userAgent: text("user_agent").notNull().default(""),
      createdAt: integer("created_at").notNull()
    });
    pageEvents = sqliteTable("page_events", {
      id: text("id").primaryKey(),
      path: text("path").notNull(),
      itemId: text("item_id"),
      sessionHash: text("session_hash").notNull(),
      referrerHost: text("referrer_host"),
      countryCode: text("country_code"),
      deviceType: text("device_type"),
      browser: text("browser"),
      os: text("os"),
      createdAt: integer("created_at").notNull()
    });
    customers = sqliteTable("customers", {
      id: text("id").primaryKey(),
      // UUID
      email: text("email").notNull().unique(),
      phone: text("phone").notNull().default(""),
      name: text("name").notNull(),
      addresses: text("addresses").notNull().default("[]"),
      // JSON: Address[]
      accountType: text("account_type").notNull().default("registered"),
      // 'registered' | 'guest'
      orderCount: integer("order_count").notNull().default(0),
      totalSpent: integer("total_spent").notNull().default(0),
      // cents
      blacklisted: integer("blacklisted", { mode: "boolean" }).notNull().default(false),
      blacklistReason: text("blacklist_reason"),
      notes: text("notes").notNull().default(""),
      clerkId: text("clerk_id").unique(),
      // set when customer creates an account
      squareCustomerId: text("square_customer_id"),
      // Square customer ID for card-on-file payments
      squareCardId: text("square_card_id"),
      // saved card ID for recurring charges
      squareCardLast4: text("square_card_last4"),
      // last 4 digits for display
      squareCardBrand: text("square_card_brand"),
      // VISA, MASTERCARD, etc.
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
    suppliers = sqliteTable("suppliers", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      contactName: text("contact_name").notNull().default(""),
      phone: text("phone").notNull().default(""),
      email: text("email").notNull().default(""),
      abn: text("abn").notNull().default(""),
      paymentTerms: text("payment_terms").notNull().default(""),
      notes: text("notes").notNull().default(""),
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      createdAt: integer("created_at").notNull()
    });
    products = sqliteTable("products", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      description: text("description").notNull().default(""),
      category: text("category").notNull(),
      // 'beef' | 'lamb' | 'pork' | 'chicken' | 'packs'
      isMeatPack: integer("is_meat_pack", { mode: "boolean" }).notNull().default(false),
      pricePerKg: integer("price_per_kg"),
      // cents/kg, null for packs
      fixedPrice: integer("fixed_price"),
      // cents, null for loose cuts
      weightOptions: text("weight_options"),
      // JSON: number[] (grams), null for packs
      packContents: text("pack_contents"),
      imageUrl: text("image_url").notNull().default(""),
      stockOnHand: real("stock_on_hand").notNull().default(0),
      // kg or units
      minThreshold: real("min_threshold").notNull().default(0),
      maxStock: real("max_stock"),
      supplierId: text("supplier_id").references(() => suppliers.id),
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      displayOrder: integer("display_order").notNull().default(0),
      gstApplicable: integer("gst_applicable", { mode: "boolean" }).notNull().default(true),
      seasonalStart: integer("seasonal_start"),
      // unix ms
      seasonalEnd: integer("seasonal_end"),
      cookingTips: text("cooking_tips"),
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
    deliveryDays = sqliteTable("delivery_days", {
      id: text("id").primaryKey(),
      date: integer("date").notNull(),
      // unix ms (start of day)
      dayOfWeek: integer("day_of_week").notNull(),
      // 0=Sun
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      frozen: integer("frozen", { mode: "boolean" }).notNull().default(false),
      cutoffTime: integer("cutoff_time").notNull(),
      // unix ms
      maxOrders: integer("max_orders").notNull().default(50),
      orderCount: integer("order_count").notNull().default(0),
      notes: text("notes"),
      routeGenerated: integer("route_generated", { mode: "boolean" }).notNull().default(false),
      routeGeneratedAt: integer("route_generated_at"),
      deliveryWindowStart: text("delivery_window_start").default("09:00"),
      // HH:MM 24-hr
      routeStartAddress: text("route_start_address"),
      routeStartLat: real("route_start_lat"),
      routeStartLng: real("route_start_lng"),
      routeFinishAddress: text("route_finish_address"),
      routeFinishLat: real("route_finish_lat"),
      routeFinishLng: real("route_finish_lng"),
      driverUid: text("driver_uid").references(() => users.id),
      zones: text("zones").default(""),
      // comma-separated area names e.g. "Rockhampton, Yeppoon, Biloela"
      type: text("type").notNull().default("delivery"),
      // 'delivery' | 'pickup'
      marketLocation: text("market_location"),
      // e.g. "Clinton Markets, 123 Main St"
      runStartedAt: integer("run_started_at"),
      runCompletedAt: integer("run_completed_at"),
      stockPoolId: text("stock_pool_id"),
      // if set, this day shares stock allocations from another day
      createdAt: integer("created_at").notNull()
    });
    orders = sqliteTable("orders", {
      id: text("id").primaryKey(),
      customerId: text("customer_id").notNull().references(() => customers.id),
      customerEmail: text("customer_email").notNull(),
      customerName: text("customer_name").notNull(),
      customerPhone: text("customer_phone").notNull().default(""),
      items: text("items").notNull(),
      // JSON: OrderItem[]
      subtotal: integer("subtotal").notNull(),
      // cents
      deliveryFee: integer("delivery_fee").notNull(),
      // cents
      gst: integer("gst").notNull(),
      // cents
      total: integer("total").notNull(),
      // cents
      promoCode: text("promo_code"),
      promoDiscount: integer("promo_discount").notNull().default(0),
      // cents
      status: text("status").notNull().default("pending_payment"),
      deliveryDayId: text("delivery_day_id").notNull().references(() => deliveryDays.id),
      deliveryAddress: text("delivery_address").notNull(),
      // JSON: Address
      fulfillmentType: text("fulfillment_type").notNull().default("delivery"),
      // 'delivery' | 'pickup'
      postcodeZone: text("postcode_zone").notNull().default(""),
      paymentIntentId: text("payment_intent_id").notNull().default(""),
      paymentProvider: text("payment_provider").notNull().default("stripe"),
      // Default is 'pending_payment', not 'paid' — see migration 0004. The old
      // 'paid' default was fail-OPEN: any code path that omitted paymentStatus
      // would silently confirm the order, which is how we ended up shipping
      // $2,210 of unpaid subscription boxes.
      paymentStatus: text("payment_status").notNull().default("pending_payment"),
      notes: text("notes"),
      internalNotes: text("internal_notes"),
      proofUrl: text("proof_url"),
      packedAt: integer("packed_at"),
      packedBy: text("packed_by"),
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
    deliveryRuns = sqliteTable("delivery_runs", {
      id: text("id").primaryKey(),
      deliveryDayId: text("delivery_day_id").notNull().references(() => deliveryDays.id),
      name: text("name").notNull(),
      // e.g. "Rockhampton North"
      zone: text("zone"),
      // postcode zone label
      color: text("color").notNull().default("#1B3A2E"),
      // hex for map/UI
      driverUid: text("driver_uid").references(() => users.id),
      status: text("status").notNull().default("pending"),
      // 'pending'|'in_progress'|'completed'
      sequence: integer("sequence").notNull().default(0),
      notes: text("notes"),
      createdAt: integer("created_at").notNull()
    });
    stops = sqliteTable("stops", {
      id: text("id").primaryKey(),
      orderId: text("order_id"),
      // nullable for manual stops
      deliveryDayId: text("delivery_day_id").notNull(),
      runId: text("run_id"),
      // nullable; null = unassigned
      customerId: text("customer_id"),
      // nullable for manual stops
      customerName: text("customer_name").notNull(),
      customerPhone: text("customer_phone").notNull().default(""),
      address: text("address").notNull(),
      // JSON: Address
      items: text("items").notNull(),
      // JSON: OrderItem[]
      sequence: integer("sequence").notNull().default(0),
      status: text("status").notNull().default("pending"),
      estimatedArrival: integer("estimated_arrival"),
      completedAt: integer("completed_at"),
      proofUrl: text("proof_url"),
      lat: real("lat"),
      lng: real("lng"),
      customerNote: text("customer_note"),
      driverNote: text("driver_note"),
      flagReason: text("flag_reason"),
      createdAt: integer("created_at").notNull()
    });
    driverSessions = sqliteTable("driver_sessions", {
      id: text("id").primaryKey(),
      driverUid: text("driver_uid").notNull().references(() => users.id),
      driverName: text("driver_name").notNull(),
      deliveryDayId: text("delivery_day_id").notNull().references(() => deliveryDays.id),
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      startedAt: integer("started_at").notNull(),
      completedAt: integer("completed_at"),
      lastLat: real("last_lat").notNull().default(0),
      lastLng: real("last_lng").notNull().default(0),
      lastUpdated: integer("last_updated").notNull(),
      breadcrumb: text("breadcrumb").notNull().default("[]"),
      // JSON: {lat,lng,ts}[]
      totalStops: integer("total_stops").notNull().default(0),
      completedStops: integer("completed_stops").notNull().default(0),
      flaggedStops: integer("flagged_stops").notNull().default(0)
    });
    stockMovements = sqliteTable("stock_movements", {
      id: text("id").primaryKey(),
      productId: text("product_id").notNull().references(() => products.id),
      productName: text("product_name").notNull(),
      type: text("type").notNull(),
      // 'sale' | 'adjustment' | 'stocktake_correction' | 'wastage' | 'supplier_delivery'
      qty: real("qty").notNull(),
      // positive = in, negative = out
      unit: text("unit").notNull(),
      // 'kg' | 'units'
      reason: text("reason"),
      orderId: text("order_id"),
      supplierId: text("supplier_id"),
      stocktakeSessionId: text("stocktake_session_id"),
      createdBy: text("created_by").notNull(),
      createdAt: integer("created_at").notNull()
    });
    deliveryDayStock = sqliteTable("delivery_day_stock", {
      id: text("id").primaryKey(),
      deliveryDayId: text("delivery_day_id").notNull().references(() => deliveryDays.id),
      productId: text("product_id").notNull().references(() => products.id),
      productName: text("product_name").notNull().default(""),
      allocated: real("allocated").notNull().default(0),
      // kg or units allocated for this day
      sold: real("sold").notNull().default(0),
      // kg or units sold so far
      createdAt: integer("created_at").notNull()
    });
    stocktakeSessions = sqliteTable("stocktake_sessions", {
      id: text("id").primaryKey(),
      date: integer("date").notNull(),
      status: text("status").notNull().default("in_progress"),
      // 'in_progress' | 'completed'
      categories: text("categories").notNull().default("[]"),
      // JSON: string[]
      items: text("items").notNull().default("[]"),
      // JSON: StocktakeItem[]
      totalVarianceKg: real("total_variance_kg").notNull().default(0),
      totalVarianceValue: integer("total_variance_value").notNull().default(0),
      // cents
      approvedBy: text("approved_by"),
      approvedAt: integer("approved_at"),
      createdBy: text("created_by").notNull(),
      createdAt: integer("created_at").notNull()
    });
    promoCodes = sqliteTable("promo_codes", {
      id: text("id").primaryKey(),
      code: text("code").notNull(),
      // e.g. 'WELCOME10'
      type: text("type").notNull().default("percentage"),
      // 'percentage' | 'fixed'
      value: integer("value").notNull(),
      // percentage (10 = 10%) or cents (1000 = $10)
      minOrder: integer("min_order").default(0),
      // minimum order subtotal in cents
      maxUses: integer("max_uses"),
      // null = unlimited
      usedCount: integer("used_count").notNull().default(0),
      expiresAt: integer("expires_at"),
      // unix ms, null = never
      deliveryDayIds: text("delivery_day_ids"),
      // JSON array of delivery_day ids; null = all days
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      createdAt: integer("created_at").notNull()
    });
    subscriptions = sqliteTable("subscriptions", {
      id: text("id").primaryKey(),
      customerId: text("customer_id").references(() => customers.id),
      email: text("email").notNull(),
      boxId: text("box_id").notNull(),
      boxName: text("box_name").notNull(),
      alternateBoxId: text("alternate_box_id"),
      alternateBoxName: text("alternate_box_name"),
      nextIsAlternate: integer("next_is_alternate", { mode: "boolean" }).notNull().default(false),
      frequency: text("frequency").notNull(),
      // 'weekly' | 'fortnightly' | 'monthly'
      status: text("status").notNull().default("active"),
      // 'active' | 'paused' | 'cancelled'
      lastOrderGeneratedAt: integer("last_order_generated_at"),
      // unix ms — when the last order was auto-created
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
    pushSubscriptions = sqliteTable("push_subscriptions", {
      id: text("id").primaryKey(),
      customerId: text("customer_id").notNull().references(() => customers.id),
      endpoint: text("endpoint").notNull().unique(),
      p256dh: text("p256dh").notNull(),
      auth: text("auth").notNull(),
      createdAt: integer("created_at").notNull()
    });
    notifications = sqliteTable("notifications", {
      id: text("id").primaryKey(),
      orderId: text("order_id"),
      customerId: text("customer_id"),
      type: text("type").notNull(),
      // 'order_confirmation' | 'day_before' | 'out_for_delivery' | etc.
      status: text("status").notNull().default("sent"),
      // 'sent' | 'failed'
      recipientEmail: text("recipient_email").notNull(),
      resendId: text("resend_id"),
      error: text("error"),
      sentAt: integer("sent_at").notNull()
    });
    processedWebhooks = sqliteTable("processed_webhooks", {
      id: text("id").primaryKey(),
      source: text("source").notNull(),
      // 'stripe' | 'square'
      receivedAt: integer("received_at").notNull()
    });
    auditLog = sqliteTable("audit_log", {
      id: text("id").primaryKey(),
      action: text("action").notNull(),
      entity: text("entity").notNull(),
      entityId: text("entity_id").notNull(),
      before: text("before").notNull().default("{}"),
      // JSON
      after: text("after").notNull().default("{}"),
      // JSON
      adminUid: text("admin_uid").notNull(),
      adminEmail: text("admin_email").notNull(),
      timestamp: integer("timestamp").notNull()
    });
    reels = sqliteTable("reels", {
      id: text("id").primaryKey(),
      title: text("title").notNull(),
      subtitle: text("subtitle").notNull().default(""),
      fbUrl: text("fb_url").notNull(),
      thumbnailUrl: text("thumbnail_url"),
      displayOrder: integer("display_order").notNull().default(0),
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
    config = sqliteTable("config", {
      key: text("key").primaryKey(),
      value: text("value").notNull(),
      // JSON
      updatedAt: integer("updated_at").notNull(),
      updatedBy: text("updated_by").notNull().default("system")
    });
    businesses = sqliteTable("businesses", {
      id: text("id").primaryKey(),
      // UUID-ish
      name: text("name").notNull(),
      // e.g. "O'Connor Agriculture"
      slug: text("slug").notNull().unique(),
      // url-safe identifier
      hubdocEmail: text("hubdoc_email"),
      // bookkeeper's upload inbox — receipts auto-forwarded here
      active: integer("active", { mode: "boolean" }).notNull().default(true),
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
    businessMembers = sqliteTable("business_members", {
      id: text("id").primaryKey(),
      businessId: text("business_id").notNull().references(() => businesses.id),
      userId: text("user_id").notNull().references(() => users.id),
      role: text("role").notNull().default("owner"),
      // 'owner' | 'member' | 'bookkeeper'
      createdAt: integer("created_at").notNull()
    });
    receipts = sqliteTable("receipts", {
      id: text("id").primaryKey(),
      businessId: text("business_id").notNull().references(() => businesses.id),
      capturedByUid: text("captured_by_uid").notNull().references(() => users.id),
      photoKey: text("photo_key").notNull(),
      // R2 object key, lives under receipts/<uuid>.<ext>
      contentType: text("content_type").notNull().default("image/jpeg"),
      notes: text("notes"),
      // optional user note ("fuel for truck", "feed pickup")
      amountCents: integer("amount_cents"),
      // optional manual entry
      merchant: text("merchant"),
      // optional manual entry
      hubdocForwardedAt: integer("hubdoc_forwarded_at"),
      // set when auto-email succeeds
      hubdocForwardError: text("hubdoc_forward_error"),
      // last failure reason if any
      capturedAt: integer("captured_at").notNull(),
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull()
    });
  }
});

// ../../packages/db/src/index.ts
var src_exports = {};
__export(src_exports, {
  auditLog: () => auditLog,
  authFailures: () => authFailures,
  businessMembers: () => businessMembers,
  businesses: () => businesses,
  config: () => config,
  customers: () => customers,
  deliveryDayStock: () => deliveryDayStock,
  deliveryDays: () => deliveryDays,
  deliveryRuns: () => deliveryRuns,
  driverSessions: () => driverSessions,
  notifications: () => notifications,
  orders: () => orders,
  pageEvents: () => pageEvents,
  processedWebhooks: () => processedWebhooks,
  products: () => products,
  promoCodes: () => promoCodes,
  pushSubscriptions: () => pushSubscriptions,
  receipts: () => receipts,
  reels: () => reels,
  staffAuthLinks: () => staffAuthLinks,
  stockMovements: () => stockMovements,
  stocktakeSessions: () => stocktakeSessions,
  stops: () => stops,
  subscriptions: () => subscriptions,
  suppliers: () => suppliers,
  users: () => users
});
var init_src = __esm({
  "../../packages/db/src/index.ts"() {
    "use strict";
    init_schema();
  }
});

// src/middleware/auth.ts
function b64url(s) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}
function normalizeEmail(email) {
  return (email ?? "").trim().toLowerCase();
}
function uniqueEmails(values) {
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}
function supportId() {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}
function authFailure(c, status, code, supportCode = supportId()) {
  const response = c.json({
    error: status === 401 ? "Unauthorized" : "Forbidden",
    code,
    supportId: supportCode,
    action: "reset_sign_in"
  }, status);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
function truncate(value, max2 = 500) {
  return (value ?? "").slice(0, max2);
}
function staffRescuePin(c) {
  return c.req.header("X-Staff-Rescue-Pin") ?? "";
}
function emailsFromTokenPayload(payload) {
  const candidates = [];
  for (const key of ["email", "email_address", "primary_email_address"]) {
    const value = payload[key];
    if (typeof value === "string") candidates.push(value);
  }
  return uniqueEmails(candidates);
}
function tokenHintFromAuthHeader(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) return { tokenEmails: [] };
  try {
    const [, payloadPart] = authHeader.slice(7).split(".");
    if (!payloadPart) return { tokenEmails: [] };
    const payload = JSON.parse(new TextDecoder().decode(b64url(payloadPart)));
    return {
      clerkId: typeof payload.sub === "string" ? payload.sub : void 0,
      issuer: typeof payload.iss === "string" ? payload.iss : void 0,
      tokenEmails: emailsFromTokenPayload(payload)
    };
  } catch {
    return { tokenEmails: [] };
  }
}
async function recordAuthFailure(db, failure) {
  try {
    await db.insert(authFailures).values({
      id: crypto.randomUUID(),
      supportId: failure.supportId,
      code: failure.code,
      clerkId: failure.clerkId ?? null,
      issuer: truncate(failure.issuer, 250),
      tokenEmails: JSON.stringify(uniqueEmails(failure.tokenEmails ?? [])),
      path: truncate(failure.path, 250),
      userAgent: truncate(failure.userAgent, 500),
      createdAt: Date.now()
    }).onConflictDoNothing({ target: authFailures.supportId });
  } catch (e) {
    console.warn("[auth] auth_failures record skipped:", String(e));
  }
}
async function findActiveStaffByEmail(db, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return void 0;
  const [dbUser] = await db.select().from(users).where(sql`lower(${users.email}) = ${normalized}`).limit(1);
  return dbUser?.active ? dbUser : void 0;
}
async function findFallbackAdmin(db) {
  const seamus = await findActiveStaffByEmail(db, "oconnoragriculture@gmail.com");
  if (seamus) return seamus;
  const [admin] = await db.select().from(users).where(sql`${users.active} = 1 AND lower(${users.role}) = 'admin'`).limit(1);
  return admin?.active ? admin : void 0;
}
async function rescueStaffUser(c, db) {
  const expected = c.env.STAFF_RESCUE_PIN;
  if (!expected || staffRescuePin(c) !== expected) return null;
  const dbUser = await findFallbackAdmin(db);
  if (!dbUser) return null;
  return { id: dbUser.id, email: dbUser.email, role: dbUser.role };
}
async function findStaffByAuthLink(db, clerkId) {
  try {
    const [link] = await db.select().from(staffAuthLinks).where(eq(staffAuthLinks.clerkId, clerkId)).limit(1);
    if (!link?.active) return void 0;
    const [dbUser] = await db.select().from(users).where(eq(users.id, link.userId)).limit(1);
    return dbUser?.active ? dbUser : void 0;
  } catch (e) {
    console.warn("[auth] staff_auth_links lookup skipped:", String(e));
    return void 0;
  }
}
async function rememberStaffAuthLink(db, dbUser, clerkId, source) {
  try {
    const now = Date.now();
    await db.insert(staffAuthLinks).values({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      clerkId,
      email: normalizeEmail(dbUser.email),
      source,
      active: true,
      createdAt: now,
      updatedAt: now
    }).onConflictDoUpdate({
      target: staffAuthLinks.clerkId,
      set: {
        userId: dbUser.id,
        email: normalizeEmail(dbUser.email),
        source,
        active: true,
        updatedAt: now
      }
    });
  } catch (e) {
    console.warn("[auth] staff_auth_links remember skipped:", String(e));
  }
}
async function clerkBackendEmails(secretKey, clerkId) {
  if (!secretKey) return [];
  try {
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });
    if (!clerkRes.ok) {
      console.warn("[auth] Clerk Backend lookup failed:", clerkRes.status);
      return [];
    }
    const clerkUser = await clerkRes.json();
    return uniqueEmails((clerkUser.email_addresses ?? []).map((e) => e.email_address));
  } catch (e) {
    console.warn("[auth] Clerk Backend lookup errored:", String(e));
    return [];
  }
}
async function verifyClerkToken(authHeader, secretKey) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken2(token, {
      secretKey,
      authorizedParties: clerkAuthorizedParties
    });
    if (!payload.sub) return null;
    const emails = emailsFromTokenPayload(payload);
    return {
      clerkId: payload.sub,
      email: emails[0] ?? "",
      emails,
      issuer: typeof payload.iss === "string" ? payload.iss : ""
    };
  } catch (e) {
    console.warn("[auth] Clerk token verification failed:", String(e));
    return null;
  }
}
async function requireAuth(c, next) {
  const db = drizzle(c.env.DB);
  const rescueUser = await rescueStaffUser(c, db);
  if (rescueUser) {
    c.set("user", rescueUser);
    await next();
    return;
  }
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return authFailure(c, 401, "AUTH_MISSING_TOKEN");
  }
  try {
    const clerk = await verifyClerkToken(authHeader, c.env.CLERK_SECRET_KEY);
    if (!clerk) {
      const code = supportId();
      const hint = tokenHintFromAuthHeader(authHeader);
      await recordAuthFailure(db, {
        supportId: code,
        code: "AUTH_INVALID_TOKEN",
        clerkId: hint.clerkId,
        issuer: hint.issuer,
        tokenEmails: hint.tokenEmails,
        path: new URL(c.req.url).pathname,
        userAgent: c.req.header("User-Agent") ?? ""
      });
      return authFailure(c, 401, "AUTH_INVALID_TOKEN", code);
    }
    const [directUser] = await db.select().from(users).where(eq(users.id, clerk.clerkId)).limit(1);
    let dbUser = directUser;
    let authSource = dbUser ? "users.id" : "";
    if (!dbUser) {
      dbUser = await findStaffByAuthLink(db, clerk.clerkId);
      if (dbUser) authSource = "staff_auth_links";
    }
    if (!dbUser) {
      for (const email of clerk.emails) {
        dbUser = await findActiveStaffByEmail(db, email);
        if (dbUser) {
          authSource = "jwt_email";
          break;
        }
      }
    }
    if (!dbUser) {
      const [linkedCustomer] = await db.select().from(customers).where(eq(customers.clerkId, clerk.clerkId)).limit(1);
      if (linkedCustomer?.email) {
        dbUser = await findActiveStaffByEmail(db, linkedCustomer.email);
        if (dbUser) {
          authSource = "customer_clerk";
          console.log("[auth] resolved customer-linked staff user:", linkedCustomer.email);
        }
      }
    }
    if (!dbUser) {
      const emails = await clerkBackendEmails(c.env.CLERK_SECRET_KEY, clerk.clerkId);
      for (const email of emails) {
        dbUser = await findActiveStaffByEmail(db, email);
        if (dbUser) {
          authSource = "clerk_backend_email";
          break;
        }
      }
    }
    if (!dbUser || !dbUser.active) {
      const code = supportId();
      const issuerHost = (() => {
        try {
          return new URL(clerk.issuer).host;
        } catch {
          return "unknown";
        }
      })();
      console.warn("[auth] staff access denied:", {
        supportId: code,
        clerkId: clerk.clerkId,
        issuer: issuerHost,
        tokenEmails: clerk.emails
      });
      await recordAuthFailure(db, {
        supportId: code,
        code: "ADMIN_AUTH_LINK_MISSING",
        clerkId: clerk.clerkId,
        issuer: clerk.issuer,
        tokenEmails: clerk.emails,
        path: new URL(c.req.url).pathname,
        userAgent: c.req.header("User-Agent") ?? ""
      });
      return authFailure(c, 403, "ADMIN_AUTH_LINK_MISSING", code);
    }
    await rememberStaffAuthLink(db, dbUser, clerk.clerkId, authSource || "resolved");
    c.set("user", { id: dbUser.id, email: dbUser.email, role: dbUser.role });
    await next();
  } catch (e) {
    console.error("[auth] requireAuth error:", e);
    return authFailure(c, 401, "AUTH_INVALID_TOKEN");
  }
}
function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get("user");
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
var clerkAuthorizedParties;
var init_auth = __esm({
  "src/middleware/auth.ts"() {
    "use strict";
    init_dist2();
    init_drizzle_orm();
    init_d1();
    init_src();
    clerkAuthorizedParties = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "https://oconner.pages.dev",
      "https://butcher-storefront.pages.dev",
      "https://butcher-admin.pages.dev",
      "https://butcher-driver.pages.dev",
      "https://admin.oconner.com.au",
      "https://driver.oconner.com.au",
      "https://oconnoragriculture.com.au",
      "https://www.oconnoragriculture.com.au",
      "https://admin.oconnoragriculture.com.au",
      "https://driver.oconnoragriculture.com.au"
    ];
    __name(b64url, "b64url");
    __name(normalizeEmail, "normalizeEmail");
    __name(uniqueEmails, "uniqueEmails");
    __name(supportId, "supportId");
    __name(authFailure, "authFailure");
    __name(truncate, "truncate");
    __name(staffRescuePin, "staffRescuePin");
    __name(emailsFromTokenPayload, "emailsFromTokenPayload");
    __name(tokenHintFromAuthHeader, "tokenHintFromAuthHeader");
    __name(recordAuthFailure, "recordAuthFailure");
    __name(findActiveStaffByEmail, "findActiveStaffByEmail");
    __name(findFallbackAdmin, "findFallbackAdmin");
    __name(rescueStaffUser, "rescueStaffUser");
    __name(findStaffByAuthLink, "findStaffByAuthLink");
    __name(rememberStaffAuthLink, "rememberStaffAuthLink");
    __name(clerkBackendEmails, "clerkBackendEmails");
    __name(verifyClerkToken, "verifyClerkToken");
    __name(requireAuth, "requireAuth");
    __name(requireRole, "requireRole");
  }
});

// src/lib/stock.ts
var stock_exports = {};
__export(stock_exports, {
  consumePromoCode: () => consumePromoCode,
  deductStock: () => deductStock,
  getStockDayId: () => getStockDayId,
  releaseDayStock: () => releaseDayStock,
  reserveDayStock: () => reserveDayStock,
  restoreStock: () => restoreStock
});
async function getStockDayId(db, deliveryDayId) {
  const [day] = await db.select({ stockPoolId: deliveryDays.stockPoolId }).from(deliveryDays).where(eq(deliveryDays.id, deliveryDayId)).limit(1);
  return day?.stockPoolId ?? deliveryDayId;
}
function getKgDelta(item, product) {
  const isPack = item.isMeatPack ?? product.isMeatPack ?? false;
  if (isPack) {
    return { delta: item.quantity ?? 1, unit: "units" };
  }
  const kg = item.weightKg ?? (item.weight ? item.weight / 1e3 : 0);
  return { delta: kg, unit: "kg" };
}
async function deductStock(db, items, orderId, now) {
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;
    const { delta: absDelta, unit } = getKgDelta(item, product);
    if (absDelta === 0) continue;
    const delta = -absDelta;
    await db.update(products).set({
      stockOnHand: sql`MAX(0, ${products.stockOnHand} + ${delta})`,
      updatedAt: now
    }).where(eq(products.id, item.productId));
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      type: "sale",
      qty: delta,
      unit,
      reason: `Order ${orderId}`,
      orderId,
      createdBy: "system",
      createdAt: now
    });
  }
}
async function reserveDayStock(db, allocations, items) {
  if (allocations.length === 0) return { ok: true };
  const reserved = [];
  for (const item of items) {
    const alloc = allocations.find((a) => a.productId === item.productId);
    if (!alloc) {
      await rollbackReservations(db, reserved);
      return { ok: false, error: `${item.productName} is not allocated for this delivery day` };
    }
    const qty = item.weight ? item.weight / 1e3 : item.weightKg ?? item.quantity ?? 1;
    if (qty <= 0) continue;
    const updated = await db.update(deliveryDayStock).set({ sold: sql`${deliveryDayStock.sold} + ${qty}` }).where(and(
      eq(deliveryDayStock.id, alloc.id),
      sql`${deliveryDayStock.sold} + ${qty} <= ${deliveryDayStock.allocated}`
    )).returning({ id: deliveryDayStock.id });
    if (!updated || updated.length === 0) {
      await rollbackReservations(db, reserved);
      return { ok: false, error: `${item.productName} is sold out for this delivery day` };
    }
    reserved.push({ allocId: alloc.id, qty });
  }
  return { ok: true };
}
async function releaseDayStock(db, deliveryDayId, items) {
  const stockDayId = await getStockDayId(db, deliveryDayId);
  const allocations = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, stockDayId));
  for (const item of items) {
    const alloc = allocations.find((a) => a.productId === item.productId);
    if (!alloc) continue;
    const qty = item.weight ? item.weight / 1e3 : item.weightKg ?? item.quantity ?? 1;
    if (qty <= 0) continue;
    await db.update(deliveryDayStock).set({ sold: sql`MAX(0, ${deliveryDayStock.sold} - ${qty})` }).where(eq(deliveryDayStock.id, alloc.id));
  }
}
async function rollbackReservations(db, reserved) {
  for (const r of reserved) {
    try {
      await db.update(deliveryDayStock).set({ sold: sql`${deliveryDayStock.sold} - ${r.qty}` }).where(eq(deliveryDayStock.id, r.allocId));
    } catch {
    }
  }
}
async function consumePromoCode(db, promoId, now) {
  const updated = await db.update(promoCodes).set({ usedCount: sql`${promoCodes.usedCount} + 1` }).where(and(
    eq(promoCodes.id, promoId),
    eq(promoCodes.active, true),
    or(
      isNull(promoCodes.maxUses),
      sql`${promoCodes.usedCount} < ${promoCodes.maxUses}`
    ),
    or(
      isNull(promoCodes.expiresAt),
      sql`${promoCodes.expiresAt} > ${now}`
    )
  )).returning({ id: promoCodes.id });
  if (!updated || updated.length === 0) {
    return { ok: false, error: "This promo code is no longer valid (expired, inactive, or fully redeemed)." };
  }
  return { ok: true };
}
async function restoreStock(db, items, orderId, now) {
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;
    const { delta, unit } = getKgDelta(item, product);
    if (delta === 0) continue;
    await db.update(products).set({
      stockOnHand: sql`${products.stockOnHand} + ${delta}`,
      updatedAt: now
    }).where(eq(products.id, item.productId));
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      type: "refund",
      qty: delta,
      unit,
      reason: `Refund for order ${orderId}`,
      orderId,
      createdBy: "system",
      createdAt: now
    });
  }
}
var init_stock = __esm({
  "src/lib/stock.ts"() {
    "use strict";
    init_drizzle_orm();
    init_src();
    __name(getStockDayId, "getStockDayId");
    __name(getKgDelta, "getKgDelta");
    __name(deductStock, "deductStock");
    __name(reserveDayStock, "reserveDayStock");
    __name(releaseDayStock, "releaseDayStock");
    __name(rollbackReservations, "rollbackReservations");
    __name(consumePromoCode, "consumePromoCode");
    __name(restoreStock, "restoreStock");
  }
});

// src/lib/email.ts
var email_exports = {};
__export(email_exports, {
  buildBroadcastEmail: () => buildBroadcastEmail,
  buildOrderEmail: () => buildOrderEmail,
  escapeHtml: () => escapeHtml,
  getSubject: () => getSubject,
  sendEmail: () => sendEmail
});
function escapeHtml(s) {
  if (s === null || s === void 0) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
async function sendEmail(opts) {
  if (!opts.apiKey) {
    console.warn("[email] RESEND_API_KEY not set \u2014 skipping send to", opts.to);
    return null;
  }
  if (!opts.from) {
    console.warn("[email] FROM_EMAIL not set \u2014 skipping send to", opts.to);
    return null;
  }
  try {
    const body = {
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html
    };
    if (opts.attachments?.length) {
      body.attachments = opts.attachments;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn("[email] Resend rejected request:", res.status, errBody.slice(0, 200));
      return null;
    }
    return res.json();
  } catch (e) {
    console.warn("[email] Resend network error:", String(e));
    return null;
  }
}
function getSubject(type, data) {
  const map = {
    order_confirmation: `Order Confirmed \u2014 #${data.orderId.slice(-8).toUpperCase()}`,
    day_before: "Your delivery is tomorrow \u{1F969}",
    out_for_delivery: "Your order is on its way!",
    delivered: "Delivered \u2713 \u2014 here's your proof of delivery",
    order_cancelled: `Your order has been cancelled \u2014 #${data.orderId.slice(-8).toUpperCase()}`,
    refund_confirmation: `Refund processed \u2014 $${(data.total / 100).toFixed(2)}`
  };
  return map[type] ?? "Order Update";
}
function buildOrderEmail(type, data) {
  const itemsHtml = data.orderItems.map((item) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.productName)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(item.lineTotal / 100).toFixed(2)}</td>
    </tr>`).join("");
  const bodies = {
    order_confirmation: `<p>Thank you for your order! We've confirmed <strong>#${data.orderId.slice(-8).toUpperCase()}</strong> for delivery on <strong>${escapeHtml(data.deliveryDate)}</strong>.</p>`,
    day_before: `<p>Your order is scheduled for delivery <strong>tomorrow, ${escapeHtml(data.deliveryDate)}</strong>.${escapeHtml(String(data.timeWindow ?? ""))} We'll notify you when it's on its way!</p>`,
    out_for_delivery: `<p>Your order is on its way! Our driver is heading to you now.</p>`,
    delivered: `<p>Your order has been successfully delivered. Thank you for choosing O'Connor Agriculture!</p>`,
    order_cancelled: `<p>Your order <strong>#${data.orderId.slice(-8).toUpperCase()}</strong> has been cancelled. Contact us if this is an error.</p>`,
    refund_confirmation: `<p>Your refund of <strong>$${(data.total / 100).toFixed(2)}</strong> has been processed and will appear within 3-5 business days.</p>`
  };
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#4E7732;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">O'Connor Agriculture</h1>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
    <p>Hi ${escapeHtml(data.customerName)},</p>
    ${bodies[type] ?? "<p>Your order has been updated.</p>"}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#4E7732;color:white">
        <th style="padding:8px;text-align:left">Item</th>
        <th style="padding:8px;text-align:right">Price</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr><td style="padding:8px;text-align:right" colspan="2">Subtotal: $${(data.subtotal / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;text-align:right" colspan="2">Delivery: $${(data.deliveryFee / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;text-align:right" colspan="2">GST: $${(data.gst / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;text-align:right" colspan="2">Total: $${(data.total / 100).toFixed(2)}</td></tr>
      </tfoot>
    </table>
    <p><strong>Delivery Address:</strong> ${escapeHtml(data.deliveryAddress)}</p>
    <p><a href="${escapeHtml(data.trackingUrl)}" style="background:#4E7732;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Track My Order</a></p>
    ${data.proofUrl ? `<p><a href="${escapeHtml(data.proofUrl)}">View Proof of Delivery</a></p>` : ""}
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#999">O'Connor Agriculture \u2014 Fresh quality meat delivered to your door.</p>
  </div>
</body>
</html>`;
}
function buildBroadcastEmail(opts) {
  const safeMessage = escapeHtml(opts.message).replace(/\n/g, "<br>");
  const cta = opts.ctaUrl && opts.ctaText ? `<p style="margin-top:24px"><a href="${escapeHtml(opts.ctaUrl)}" style="background:#4E7732;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">${escapeHtml(opts.ctaText)}</a></p>` : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#4E7732;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">O'Connor Agriculture</h1>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
    <p>Hi ${escapeHtml(opts.customerName)},</p>
    <p style="white-space:pre-wrap">${safeMessage}</p>
    ${cta}
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#999">\u2014 Seamus, O'Connor Agriculture</p>
  </div>
</body>
</html>`;
}
var init_email = __esm({
  "src/lib/email.ts"() {
    "use strict";
    __name(escapeHtml, "escapeHtml");
    __name(sendEmail, "sendEmail");
    __name(getSubject, "getSubject");
    __name(buildOrderEmail, "buildOrderEmail");
    __name(buildBroadcastEmail, "buildBroadcastEmail");
  }
});

// src/lib/time.ts
var time_exports = {};
__export(time_exports, {
  formatBrisbaneDate: () => formatBrisbaneDate,
  formatBrisbaneShortDate: () => formatBrisbaneShortDate,
  formatBrisbaneTime: () => formatBrisbaneTime
});
function formatBrisbaneTime(ms) {
  const s = new Date(ms).toLocaleString("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
  return s.toLowerCase().replace(/\s+/g, "").replace(/:00(?=[ap]m$)/, "");
}
function formatBrisbaneDate(ms, opts) {
  return new Date(ms).toLocaleDateString("en-AU", {
    timeZone: TZ,
    weekday: opts?.weekday ?? "long",
    day: "numeric",
    month: "long",
    ...opts?.year ? { year: opts.year } : {}
  });
}
function formatBrisbaneShortDate(ms, opts) {
  return new Date(ms).toLocaleDateString("en-AU", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    ...opts?.year ? { year: "numeric" } : {}
  });
}
var TZ;
var init_time = __esm({
  "src/lib/time.ts"() {
    "use strict";
    TZ = "Australia/Brisbane";
    __name(formatBrisbaneTime, "formatBrisbaneTime");
    __name(formatBrisbaneDate, "formatBrisbaneDate");
    __name(formatBrisbaneShortDate, "formatBrisbaneShortDate");
  }
});

// src/lib/webpush.ts
var webpush_exports = {};
__export(webpush_exports, {
  sendPush: () => sendPush
});
function b64u(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let str = "";
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function db64u(s) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}
function concat(...parts) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}
async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);
  return new Uint8Array(bits);
}
async function vapidJwt(endpoint, vapidPrivateKeyB64u, vapidPublicKeyB64u, contact) {
  const pubBytes = db64u(vapidPublicKeyB64u);
  const privKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: vapidPrivateKeyB64u,
      x: b64u(pubBytes.slice(1, 33)),
      y: b64u(pubBytes.slice(33, 65)),
      key_ops: ["sign"]
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const now = Math.floor(Date.now() / 1e3);
  const header = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: now + 43200,
    sub: contact
  })));
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privKey,
    enc.encode(`${header}.${payload}`)
  );
  return `${header}.${payload}.${b64u(sig)}`;
}
async function encryptPayload(p256dhB64u, authB64u, plaintext) {
  const authSecret = db64u(authB64u);
  const uaPubBytes = db64u(p256dhB64u);
  const senderKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPubBytes = new Uint8Array(await crypto.subtle.exportKey("raw", senderKP.publicKey));
  const uaPubKey = await crypto.subtle.importKey("raw", uaPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPubKey }, senderKP.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPubBytes, asPubBytes);
  const ikm = await hkdf(ecdhSecret, authSecret, keyInfo, 32);
  const cek = await hkdf(ikm, salt, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, enc.encode("Content-Encoding: nonce\0"), 12);
  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const padded = concat(enc.encode(plaintext), new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, padded));
  const rs = padded.byteLength + 16;
  const header = new Uint8Array(21 + asPubBytes.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = asPubBytes.length;
  header.set(asPubBytes, 21);
  return concat(header, ciphertext);
}
async function sendPush(subscription, notification, vapidPublicKey, vapidPrivateKey, vapidContact) {
  try {
    const encrypted = await encryptPayload(subscription.keys.p256dh, subscription.keys.auth, JSON.stringify(notification));
    const jwt = await vapidJwt(subscription.endpoint, vapidPrivateKey, vapidPublicKey, vapidContact);
    const resp = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400"
      },
      body: encrypted
    });
    if (resp.status === 410 || resp.status === 404) return false;
    return resp.status >= 200 && resp.status < 300;
  } catch {
    return false;
  }
}
var enc;
var init_webpush = __esm({
  "src/lib/webpush.ts"() {
    "use strict";
    enc = new TextEncoder();
    __name(b64u, "b64u");
    __name(db64u, "db64u");
    __name(concat, "concat");
    __name(hkdf, "hkdf");
    __name(vapidJwt, "vapidJwt");
    __name(encryptPayload, "encryptPayload");
    __name(sendPush, "sendPush");
  }
});

// src/routes/push.ts
var push_exports = {};
__export(push_exports, {
  default: () => push_default,
  notifyCustomer: () => notifyCustomer
});
async function notifyCustomer(db, customerId, notification, env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.customerId, customerId));
  const contact = `mailto:${env.FROM_EMAIL.replace(/.*<(.+)>/, "$1")}`;
  await Promise.allSettled(subs.map(
    (s) => sendPush(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      notification,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
      contact
    ).then((ok) => {
      if (!ok) {
        return db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
      }
    })
  ));
}
var app3, push_default;
var init_push = __esm({
  "src/routes/push.ts"() {
    "use strict";
    init_dist();
    init_d1();
    init_drizzle_orm();
    init_src();
    init_webpush();
    init_auth();
    app3 = new Hono2();
    app3.post("/subscribe", async (c) => {
      const clerk = await verifyClerkToken(c.req.header("Authorization") ?? null, c.env.CLERK_SECRET_KEY);
      if (!clerk) return c.json({ error: "Unauthorized" }, 401);
      const body = await c.req.json();
      if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
        return c.json({ error: "Invalid subscription data" }, 400);
      }
      const db = drizzle(c.env.DB);
      const [customer] = await db.select().from(customers).where(eq(customers.clerkId, clerk.clerkId)).limit(1);
      if (!customer) return c.json({ error: "Customer record not found" }, 404);
      await db.insert(pushSubscriptions).values({
        id: crypto.randomUUID(),
        customerId: customer.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        createdAt: Date.now()
      }).onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { p256dh: body.keys.p256dh, auth: body.keys.auth }
      });
      return c.json({ ok: true });
    });
    app3.delete("/subscribe", async (c) => {
      const clerk = await verifyClerkToken(c.req.header("Authorization") ?? null, c.env.CLERK_SECRET_KEY);
      if (!clerk) return c.json({ error: "Unauthorized" }, 401);
      const { endpoint } = await c.req.json();
      if (!endpoint) return c.json({ error: "Missing endpoint" }, 400);
      const db = drizzle(c.env.DB);
      const { and: dbAnd } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
      const [customer] = await db.select().from(customers).where(eq(customers.clerkId, clerk.clerkId)).limit(1);
      if (!customer) return c.json({ error: "Customer record not found" }, 404);
      await db.delete(pushSubscriptions).where(dbAnd(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.customerId, customer.id)
      ));
      return c.json({ ok: true });
    });
    __name(notifyCustomer, "notifyCustomer");
    push_default = app3;
  }
});

// src/lib/squareInvoices.ts
async function squareFetch(env, path, body) {
  if (!env.SQUARE_ACCESS_TOKEN) throw new Error("Square not configured");
  const res = await fetch(`${SQUARE_API2}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18"
    },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function invoiceDueDate(db, order) {
  if (order.deliveryDayId) {
    const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
    if (day?.date) {
      const deliveryDate = new Date(day.date);
      deliveryDate.setDate(deliveryDate.getDate() - 1);
      if (deliveryDate > /* @__PURE__ */ new Date()) return deliveryDate.toISOString().split("T")[0];
    }
  }
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
}
async function findOrCreateSquareCustomer(env, order) {
  const searchResult = await squareFetch(env, "/customers/search", {
    query: {
      filter: {
        email_address: { exact: order.customerEmail }
      }
    }
  });
  if (searchResult.errors) {
    throw new Error(`Square customer search failed: ${JSON.stringify(searchResult.errors).slice(0, 500)}`);
  }
  if (searchResult.customers?.length) return searchResult.customers[0].id;
  const createCustomerResult = await squareFetch(env, "/customers", {
    idempotency_key: crypto.randomUUID(),
    given_name: order.customerName?.split(" ")[0] ?? "",
    family_name: order.customerName?.split(" ").slice(1).join(" ") ?? "",
    email_address: order.customerEmail,
    phone_number: order.customerPhone ? `+61${order.customerPhone.replace(/^0/, "")}` : void 0
  });
  if (createCustomerResult.errors) {
    throw new Error(`Square customer creation failed: ${JSON.stringify(createCustomerResult.errors).slice(0, 500)}`);
  }
  const squareCustomerId = createCustomerResult.customer?.id;
  if (!squareCustomerId) throw new Error("Square customer created but no ID returned");
  return squareCustomerId;
}
async function createAndPublishSquareInvoiceForOrder(db, env, order) {
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    throw new Error("Square not configured");
  }
  const items = JSON.parse(order.items);
  const squareCustomerId = await findOrCreateSquareCustomer(env, order);
  const squareLineItems = items.map((item) => {
    const qty = item.quantity ?? 1;
    return {
      name: item.productName ?? "Item",
      quantity: String(qty),
      base_price_money: {
        amount: Math.round(item.lineTotal / qty),
        currency: "AUD"
      }
    };
  });
  if (order.deliveryFee > 0) {
    squareLineItems.push({
      name: "Delivery Fee",
      quantity: "1",
      base_price_money: { amount: order.deliveryFee, currency: "AUD" }
    });
  }
  const squareOrderResult = await squareFetch(env, "/orders", {
    idempotency_key: crypto.randomUUID(),
    order: {
      location_id: env.SQUARE_LOCATION_ID,
      customer_id: squareCustomerId,
      line_items: squareLineItems
    }
  });
  if (squareOrderResult.errors) {
    throw new Error(`Square order creation failed: ${JSON.stringify(squareOrderResult.errors).slice(0, 500)}`);
  }
  const squareOrderId = squareOrderResult.order?.id;
  if (!squareOrderId) throw new Error("Square order created but no ID returned");
  const invoiceResult = await squareFetch(env, "/invoices", {
    idempotency_key: crypto.randomUUID(),
    invoice: {
      location_id: env.SQUARE_LOCATION_ID,
      order_id: squareOrderId,
      primary_recipient: {
        customer_id: squareCustomerId
      },
      payment_requests: [{
        request_type: "BALANCE",
        due_date: await invoiceDueDate(db, order),
        automatic_payment_source: "NONE"
      }],
      delivery_method: "EMAIL",
      title: `O'Connor Agriculture - Order #${order.id.slice(0, 8).toUpperCase()}`,
      accepted_payment_methods: {
        card: true,
        square_gift_card: false,
        bank_account: false,
        buy_now_pay_later: false
      }
    }
  });
  if (invoiceResult.errors) {
    throw new Error(`Square invoice creation failed: ${JSON.stringify(invoiceResult.errors).slice(0, 500)}`);
  }
  const invoice = invoiceResult.invoice;
  if (invoice?.id) {
    const publishResult = await squareFetch(env, `/invoices/${invoice.id}/publish`, {
      idempotency_key: crypto.randomUUID(),
      version: invoice.version ?? 0
    });
    if (publishResult.errors) {
      throw new Error(`Square invoice publish failed: ${JSON.stringify(publishResult.errors).slice(0, 500)}`);
    }
  }
  const invoiceId = invoice?.id ?? null;
  await db.update(orders).set({
    paymentStatus: "invoice_sent",
    internalNotes: `${order.internalNotes ?? ""}
Square invoice sent: ${invoiceId ?? "unknown"}`.trim(),
    updatedAt: Date.now()
  }).where(eq(orders.id, order.id));
  return { invoiceId };
}
var SQUARE_API2;
var init_squareInvoices = __esm({
  "src/lib/squareInvoices.ts"() {
    "use strict";
    init_drizzle_orm();
    init_src();
    SQUARE_API2 = "https://connect.squareup.com/v2";
    __name(squareFetch, "squareFetch");
    __name(invoiceDueDate, "invoiceDueDate");
    __name(findOrCreateSquareCustomer, "findOrCreateSquareCustomer");
    __name(createAndPublishSquareInvoiceForOrder, "createAndPublishSquareInvoiceForOrder");
  }
});

// src/lib/subscriptions.ts
var subscriptions_exports = {};
__export(subscriptions_exports, {
  createSubscriptionOrder: () => createSubscriptionOrder
});
async function squareRequest(accessToken, path, body) {
  const res = await fetch(`${SQUARE_API3}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18"
    },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function createSubscriptionOrder(db, opts) {
  const { asc: asc2, and: and3, gte: gte2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  let nextDay;
  if (opts.deliveryDayId) {
    [nextDay] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, opts.deliveryDayId)).limit(1);
  } else {
    [nextDay] = await db.select().from(deliveryDays).where(and3(eq(deliveryDays.active, true), gte2(deliveryDays.date, opts.now))).orderBy(asc2(deliveryDays.date)).limit(1);
  }
  if (!nextDay) return null;
  const orderId = crypto.randomUUID();
  const gst = 0;
  const subtotal = opts.price;
  const item = {
    productId: opts.boxId,
    productName: opts.boxName,
    isMeatPack: true,
    quantity: 1,
    lineTotal: opts.price
  };
  let paymentStatus = "pending_payment";
  let paymentIntentId = "";
  let chargeFailureReason = null;
  if (opts.env?.SQUARE_ACCESS_TOKEN && opts.env?.SQUARE_LOCATION_ID) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, opts.customerId)).limit(1);
    if (cust?.squareCardId && cust?.squareCustomerId) {
      try {
        const chargeResult = await squareRequest(opts.env.SQUARE_ACCESS_TOKEN, "/payments", {
          idempotency_key: crypto.randomUUID(),
          source_id: cust.squareCardId,
          amount_money: { amount: opts.price, currency: "AUD" },
          customer_id: cust.squareCustomerId,
          location_id: opts.env.SQUARE_LOCATION_ID,
          autocomplete: true,
          note: `Subscription renewal: ${opts.boxName}`
        });
        if (chargeResult.errors) {
          console.error("Auto-charge failed:", JSON.stringify(chargeResult.errors));
          paymentStatus = "payment_failed";
          chargeFailureReason = JSON.stringify(chargeResult.errors).slice(0, 500);
        } else {
          paymentIntentId = chargeResult.payment?.id ?? "";
          paymentStatus = "paid";
        }
      } catch (e) {
        console.error("Auto-charge error:", e);
        paymentStatus = "payment_failed";
        chargeFailureReason = String(e).slice(0, 500);
      }
    }
  }
  if (paymentStatus === "payment_failed" && opts.subscriptionId) {
    try {
      await db.update(subscriptions).set({ status: "payment_action_required", updatedAt: opts.now }).where(eq(subscriptions.id, opts.subscriptionId));
      const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      const accountUrl = `${opts.env?.STOREFRONT_URL ?? "https://oconnoragriculture.com.au"}/account`;
      await sendEmail2({
        apiKey: opts.env?.RESEND_API_KEY ?? "",
        from: opts.env?.FROM_EMAIL ?? "O'Connor Agriculture <orders@oconnoragriculture.com.au>",
        to: opts.email,
        subject: "Action needed: update payment details for your O'Connor subscription",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#333">
            <h2 style="color:#4E7732">Your subscription needs a new card</h2>
            <p>Hi ${opts.name},</p>
            <p>We tried to charge your saved card for this fortnight's <strong>${opts.boxName}</strong> subscription delivery, but the payment didn't go through.</p>
            <p>Your subscription is paused until you re-enter card details. Click below to update \u2014 your usual schedule resumes as soon as a new card is on file.</p>
            <p style="text-align:center;margin:28px 0">
              <a href="${accountUrl}" style="background:#4E7732;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold">Update payment details</a>
            </p>
            <p style="color:#666;font-size:13px">If you've recently changed banks or your card expired, this is the most common reason. Once updated, your next box ships on the original schedule.</p>
          </div>`
      });
    } catch (e) {
      console.error("subscription pause/notify failed:", e);
    }
  }
  const orderStatus = paymentStatus === "paid" ? "confirmed" : "pending_payment";
  const freqSuffix = opts.frequency ? ` (${opts.frequency})` : "";
  const notes = `Subscription: ${opts.boxName}${freqSuffix}` + (paymentStatus === "payment_failed" ? " \u2014 AUTO-CHARGE FAILED" : "");
  const internalNotes = chargeFailureReason ? `Auto-charge failed: ${chargeFailureReason}` : "";
  const orderValues = {
    id: orderId,
    customerId: opts.customerId,
    customerEmail: opts.email,
    customerName: opts.name,
    customerPhone: opts.phone,
    items: JSON.stringify([item]),
    subtotal,
    deliveryFee: 0,
    gst,
    total: opts.price,
    status: orderStatus,
    deliveryDayId: nextDay.id,
    deliveryAddress: JSON.stringify(opts.address),
    postcodeZone: "",
    paymentIntentId,
    paymentProvider: "square",
    paymentStatus,
    notes,
    internalNotes,
    createdAt: opts.now,
    updatedAt: opts.now
  };
  await db.insert(orders).values(orderValues);
  if (paymentStatus === "pending_payment" && opts.env?.SQUARE_ACCESS_TOKEN && opts.env?.SQUARE_LOCATION_ID) {
    try {
      await createAndPublishSquareInvoiceForOrder(db, opts.env, orderValues);
    } catch (error) {
      console.error("subscription invoice send failed:", error);
      await db.update(orders).set({
        internalNotes: `${internalNotes}
Square invoice failed: ${String(error).slice(0, 500)}`.trim(),
        updatedAt: Date.now()
      }).where(eq(orders.id, orderId));
    }
  }
  await deductStock(db, [item], orderId, opts.now);
  await db.update(deliveryDays).set({ orderCount: sql`${deliveryDays.orderCount} + 1` }).where(eq(deliveryDays.id, nextDay.id));
  await db.update(customers).set({
    orderCount: sql`${customers.orderCount} + 1`,
    totalSpent: sql`${customers.totalSpent} + ${opts.price}`,
    updatedAt: opts.now
  }).where(eq(customers.id, opts.customerId));
  return orderId;
}
var SQUARE_API3;
var init_subscriptions = __esm({
  "src/lib/subscriptions.ts"() {
    "use strict";
    init_drizzle_orm();
    init_drizzle_orm();
    init_src();
    init_stock();
    init_squareInvoices();
    SQUARE_API3 = "https://connect.squareup.com/v2";
    __name(squareRequest, "squareRequest");
    __name(createSubscriptionOrder, "createSubscriptionOrder");
  }
});

// src/routes/subscriptions.ts
var subscriptions_exports2 = {};
__export(subscriptions_exports2, {
  default: () => subscriptions_default
});
async function cancelFutureSubscriptionOrders(db, sub) {
  const now = Date.now();
  const NOT_CANCELLABLE = /* @__PURE__ */ new Set(["delivered", "cancelled", "refunded", "out_for_delivery"]);
  let customerId = sub.customerId;
  if (!customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
    if (!cust) return { cancelled: 0 };
    customerId = cust.id;
  }
  const futureDays = await db.select({ id: deliveryDays.id }).from(deliveryDays).where(gte(deliveryDays.date, now));
  if (futureDays.length === 0) return { cancelled: 0 };
  const futureDayIds = futureDays.map((d) => d.id);
  const candidateOrders = await db.select().from(orders).where(
    and(
      eq(orders.customerId, customerId),
      inArray(orders.deliveryDayId, futureDayIds)
    )
  );
  let cancelled = 0;
  for (const order of candidateOrders) {
    if (NOT_CANCELLABLE.has(order.status)) continue;
    if (!order.notes?.startsWith("Subscription:")) continue;
    if (!order.notes.includes(sub.boxName)) continue;
    await db.update(orders).set({
      status: "cancelled",
      paymentStatus: "cancelled",
      internalNotes: (order.internalNotes ? order.internalNotes + "\n" : "") + `[auto-cancelled: subscription ${sub.id} (${sub.boxName} ${sub.frequency}) was deactivated]`,
      updatedAt: now
    }).where(eq(orders.id, order.id));
    await db.delete(stops).where(eq(stops.orderId, order.id));
    await db.update(deliveryDays).set({ orderCount: sql`${deliveryDays.orderCount} - 1` }).where(and(eq(deliveryDays.id, order.deliveryDayId), gte(deliveryDays.orderCount, 1)));
    await db.update(customers).set({
      orderCount: sql`${customers.orderCount} - 1`,
      totalSpent: sql`${customers.totalSpent} - ${order.total}`,
      updatedAt: now
    }).where(and(eq(customers.id, customerId), gte(customers.orderCount, 1)));
    cancelled++;
  }
  return { cancelled };
}
async function squareRequest2(accessToken, path, body) {
  const res = await fetch(`${SQUARE_API4}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18"
    },
    body: JSON.stringify(body)
  });
  return res.json();
}
var SQUARE_API4, BOX_PRICES, FREQUENCY_MAP, app14, subscriptions_default;
var init_subscriptions2 = __esm({
  "src/routes/subscriptions.ts"() {
    "use strict";
    init_dist();
    init_d1();
    init_drizzle_orm();
    init_src();
    init_subscriptions();
    __name(cancelFutureSubscriptionOrders, "cancelFutureSubscriptionOrders");
    SQUARE_API4 = "https://connect.squareup.com/v2";
    BOX_PRICES = {
      bbq: 29e3,
      // $290.00 in cents
      family: 29e3,
      double: 55e3,
      value: 22e3
    };
    FREQUENCY_MAP = {
      weekly: "WEEKLY",
      fortnightly: "EVERY_TWO_WEEKS",
      monthly: "MONTHLY"
    };
    __name(squareRequest2, "squareRequest");
    app14 = new Hono2();
    app14.post("/checkout", async (c) => {
      const body = await c.req.json();
      let price = BOX_PRICES[body.boxId];
      if (!price) {
        const db2 = drizzle(c.env.DB);
        const [prod] = await db2.select().from(products).where(eq(products.id, body.boxId)).limit(1);
        price = prod?.fixedPrice ?? 0;
      }
      if (!price) return c.json({ error: "Invalid box" }, 400);
      if (!FREQUENCY_MAP[body.frequency]) return c.json({ error: "Invalid frequency" }, 400);
      const storefrontUrl = c.env.STOREFRONT_URL || "https://oconnoragriculture.com.au";
      const accessToken = c.env.SQUARE_ACCESS_TOKEN;
      const locationId = c.env.SQUARE_LOCATION_ID;
      if (!accessToken || !locationId) {
        return c.json({ error: "Square not configured" }, 503);
      }
      const db = drizzle(c.env.DB);
      const now = Date.now();
      const subId = crypto.randomUUID();
      let customerId = null;
      const [existing] = await db.select().from(customers).where(eq(customers.email, body.email)).limit(1);
      if (existing) {
        customerId = existing.id;
      } else {
        customerId = crypto.randomUUID();
        await db.insert(customers).values({
          id: customerId,
          email: body.email,
          name: body.name,
          phone: body.phone,
          accountType: "registered",
          orderCount: 0,
          totalSpent: 0,
          blacklisted: false,
          notes: body.notes ? `Delivery notes: ${body.notes}` : "",
          createdAt: now,
          updatedAt: now
        });
      }
      if (body.sourceId) {
        try {
          let squareCustId = existing?.squareCustomerId ?? null;
          if (!squareCustId) {
            const custResult = await squareRequest2(accessToken, "/customers", {
              idempotency_key: crypto.randomUUID(),
              given_name: body.name.split(" ")[0] ?? "",
              family_name: body.name.split(" ").slice(1).join(" ") ?? "",
              email_address: body.email,
              phone_number: body.phone ? `+61${body.phone.replace(/^0/, "").replace(/\s/g, "")}` : void 0
            });
            squareCustId = custResult.customer?.id;
            if (!squareCustId) return c.json({ error: "Failed to create Square customer", details: custResult.errors }, 500);
          }
          const payResult = await squareRequest2(accessToken, "/payments", {
            idempotency_key: crypto.randomUUID(),
            source_id: body.sourceId,
            amount_money: { amount: price, currency: "AUD" },
            customer_id: squareCustId,
            location_id: locationId,
            autocomplete: true,
            note: `Subscription: ${body.boxName} (${body.frequency})`
          });
          if (payResult.errors) {
            return c.json({ error: "Payment failed", details: payResult.errors }, 400);
          }
          const cardResult = await squareRequest2(accessToken, "/cards", {
            idempotency_key: crypto.randomUUID(),
            source_id: body.sourceId,
            card: {
              customer_id: squareCustId
            }
          });
          const savedCard = cardResult.card ?? {};
          const cardId = savedCard.id ?? null;
          const cardLast4 = savedCard.last_4 ?? null;
          const cardBrand = savedCard.card_brand ?? null;
          await db.update(customers).set({
            squareCustomerId: squareCustId,
            squareCardId: cardId,
            squareCardLast4: cardLast4,
            squareCardBrand: cardBrand,
            updatedAt: now
          }).where(eq(customers.id, customerId));
          await db.insert(subscriptions).values({
            id: subId,
            customerId,
            email: body.email,
            boxId: body.boxId,
            boxName: body.boxName,
            alternateBoxId: body.alternateBoxId ?? null,
            alternateBoxName: body.alternateBoxName ?? null,
            nextIsAlternate: false,
            frequency: body.frequency,
            status: "active",
            createdAt: now,
            updatedAt: now
          });
          await createSubscriptionOrder(db, {
            customerId,
            email: body.email,
            name: body.name,
            phone: body.phone,
            address: { line1: body.address, suburb: body.suburb, state: "QLD", postcode: body.postcode },
            boxId: body.boxId,
            boxName: body.boxName,
            frequency: body.frequency,
            price,
            subscriptionId: subId,
            now,
            env: c.env
          });
          return c.json({ ok: true, subscriptionId: subId, cardLast4, cardBrand });
        } catch (e) {
          return c.json({ error: e?.message ?? "Subscription checkout failed" }, 500);
        }
      }
      await db.insert(subscriptions).values({
        id: subId,
        customerId,
        email: body.email,
        boxId: body.boxId,
        boxName: body.boxName,
        alternateBoxId: body.alternateBoxId ?? null,
        alternateBoxName: body.alternateBoxName ?? null,
        nextIsAlternate: false,
        frequency: body.frequency,
        status: "active",
        createdAt: now,
        updatedAt: now
      });
      const orderId = await createSubscriptionOrder(db, {
        customerId,
        email: body.email,
        name: body.name,
        phone: body.phone,
        address: { line1: body.address, suburb: body.suburb, state: "QLD", postcode: body.postcode },
        boxId: body.boxId,
        boxName: body.boxName,
        frequency: body.frequency,
        price,
        subscriptionId: subId,
        now
      });
      if (!orderId) {
        await db.update(subscriptions).set({ status: "cancelled", updatedAt: Date.now() }).where(eq(subscriptions.id, subId));
        return c.json({ error: "No upcoming delivery day available" }, 400);
      }
      const [createdOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!createdOrder) return c.json({ error: "Subscription order could not be created" }, 500);
      const orderItems = JSON.parse(createdOrder.items);
      const squareLineItems = orderItems.map((item) => {
        const qty = item.quantity ?? 1;
        return {
          name: item.productName ?? "Item",
          quantity: String(qty),
          base_price_money: { amount: Math.round(item.lineTotal / qty), currency: "AUD" }
        };
      });
      const result = await squareRequest2(accessToken, "/online-checkout/payment-links", {
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId,
          line_items: squareLineItems,
          metadata: { orderId, subscriptionId: subId }
        },
        checkout_options: {
          redirect_url: `${storefrontUrl}/checkout/success?orderId=${orderId}`,
          ask_for_shipping_address: false
        },
        pre_populated_data: {
          buyer_email: body.email,
          ...body.phone ? { buyer_phone_number: body.phone.replace(/^0/, "+61").replace(/\s/g, "") } : {}
        },
        payment_note: `O'Connor Agriculture \u2014 Order #${orderId.slice(0, 8).toUpperCase()} subscription: ${body.boxName} (${body.frequency})`
      });
      const paymentLink = result.payment_link;
      const paymentUrl = paymentLink?.url ?? paymentLink?.long_url;
      if (!paymentUrl) {
        console.error("Square checkout error:", JSON.stringify(result));
        await db.update(orders).set({
          internalNotes: `${createdOrder.internalNotes ?? ""}
Square subscription payment link failed: ${JSON.stringify(result.errors ?? result).slice(0, 500)}`.trim(),
          updatedAt: Date.now()
        }).where(eq(orders.id, orderId));
        return c.json({ error: "Failed to create checkout", details: result.errors ?? result }, 500);
      }
      await db.update(orders).set({
        paymentStatus: "awaiting_payment",
        paymentProvider: "square",
        internalNotes: `${createdOrder.internalNotes ?? ""}
Square payment link: ${paymentLink?.id ?? "unknown"}`.trim(),
        updatedAt: Date.now()
      }).where(eq(orders.id, orderId));
      return c.json({ url: paymentUrl });
    });
    app14.get("/", async (c) => {
      const db = drizzle(c.env.DB);
      const rows = await db.select({
        id: subscriptions.id,
        customerId: subscriptions.customerId,
        email: subscriptions.email,
        boxId: subscriptions.boxId,
        boxName: subscriptions.boxName,
        alternateBoxId: subscriptions.alternateBoxId,
        alternateBoxName: subscriptions.alternateBoxName,
        nextIsAlternate: subscriptions.nextIsAlternate,
        frequency: subscriptions.frequency,
        status: subscriptions.status,
        createdAt: subscriptions.createdAt,
        lastOrderGeneratedAt: subscriptions.lastOrderGeneratedAt,
        customerName: customers.name,
        customerPhone: customers.phone
      }).from(subscriptions).leftJoin(customers, eq(subscriptions.email, customers.email)).orderBy(desc(subscriptions.createdAt));
      return c.json(rows);
    });
    app14.post("/", async (c) => {
      const db = drizzle(c.env.DB);
      const body = await c.req.json();
      const now = Date.now();
      const id = crypto.randomUUID();
      const customerName = body.name ?? body.customerName;
      const customerPhone = body.phone ?? body.customerPhone ?? "";
      let manualFirstOrderGeneratedAt = null;
      if (body.skipInitialOrder) {
        manualFirstOrderGeneratedAt = now;
        if (body.firstOrderDeliveryDayId) {
          const [manualFirstDay] = await db.select({ date: deliveryDays.date }).from(deliveryDays).where(eq(deliveryDays.id, body.firstOrderDeliveryDayId)).limit(1);
          manualFirstOrderGeneratedAt = manualFirstDay?.date ?? now;
        }
      }
      let customerId = null;
      const [existing] = await db.select().from(customers).where(eq(customers.email, body.email)).limit(1);
      if (existing) {
        customerId = existing.id;
      } else if (customerName) {
        customerId = crypto.randomUUID();
        await db.insert(customers).values({
          id: customerId,
          email: body.email,
          name: customerName,
          phone: customerPhone,
          accountType: "registered",
          orderCount: 0,
          totalSpent: 0,
          blacklisted: false,
          notes: body.notes ? `Delivery notes: ${body.notes}` : "",
          createdAt: now,
          updatedAt: now
        });
      }
      await db.insert(subscriptions).values({
        id,
        customerId,
        email: body.email,
        boxId: body.boxId,
        boxName: body.boxName,
        alternateBoxId: body.alternateBoxId ?? null,
        alternateBoxName: body.alternateBoxName ?? null,
        nextIsAlternate: false,
        frequency: body.frequency,
        status: body.status ?? "pending",
        lastOrderGeneratedAt: manualFirstOrderGeneratedAt,
        createdAt: now,
        updatedAt: now
      });
      let orderPrice = BOX_PRICES[body.boxId];
      if (!orderPrice) {
        const [prod] = await db.select().from(products).where(eq(products.id, body.boxId)).limit(1);
        orderPrice = prod?.fixedPrice ?? 0;
      }
      if (!body.skipInitialOrder && customerId && body.address && orderPrice) {
        await createSubscriptionOrder(db, {
          customerId,
          email: body.email,
          name: customerName ?? body.email,
          phone: customerPhone,
          address: { line1: body.address, suburb: body.suburb ?? "", state: "QLD", postcode: body.postcode ?? "" },
          boxId: body.boxId,
          boxName: body.boxName,
          frequency: body.frequency,
          price: orderPrice,
          subscriptionId: id,
          now,
          env: c.env
        });
      }
      return c.json({ id }, 201);
    });
    app14.patch("/:id", async (c) => {
      const db = drizzle(c.env.DB);
      const subId = c.req.param("id");
      const body = await c.req.json();
      const allowed = {};
      for (const key of ["status", "boxId", "boxName", "alternateBoxId", "alternateBoxName", "nextIsAlternate", "frequency", "customerName", "customerPhone", "email", "createdAt", "lastOrderGeneratedAt"]) {
        if (body[key] !== void 0) allowed[key] = body[key];
      }
      allowed.updatedAt = Date.now();
      let cancelled = 0;
      if (allowed.status && allowed.status !== "active") {
        const [current] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
        if (current && current.status === "active") {
          const result = await cancelFutureSubscriptionOrders(db, current);
          cancelled = result.cancelled;
        }
      }
      await db.update(subscriptions).set(allowed).where(eq(subscriptions.id, subId));
      return c.json({ ok: true, cancelledFutureOrders: cancelled });
    });
    app14.delete("/:id", async (c) => {
      const db = drizzle(c.env.DB);
      const subId = c.req.param("id");
      const [current] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
      let cancelled = 0;
      if (current) {
        const result = await cancelFutureSubscriptionOrders(db, current);
        cancelled = result.cancelled;
      }
      await db.delete(subscriptions).where(eq(subscriptions.id, subId));
      return c.json({ ok: true, cancelledFutureOrders: cancelled });
    });
    app14.post("/:id/generate-order", async (c) => {
      const db = drizzle(c.env.DB);
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, c.req.param("id"))).limit(1);
      if (!sub) return c.json({ error: "Subscription not found" }, 404);
      if (sub.status !== "active") return c.json({ error: "Subscription is not active" }, 400);
      let customerId = sub.customerId;
      if (!customerId) {
        const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
        if (!cust) return c.json({ error: "Customer not found \u2014 create the customer first" }, 400);
        customerId = cust.id;
      }
      const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (!customer) return c.json({ error: "Customer not found" }, 400);
      const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
      const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;
      const { like: like2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
      let [boxProduct] = await db.select().from(products).where(eq(products.id, boxId)).limit(1);
      if (!boxProduct) {
        [boxProduct] = await db.select().from(products).where(eq(products.id, `prod-${boxId}-box`)).limit(1);
      }
      if (!boxProduct) {
        [boxProduct] = await db.select().from(products).where(like2(products.name, `%${boxName.replace(" Box", "")}%Box%`)).limit(1);
      }
      const price = boxProduct?.fixedPrice ?? 0;
      const resolvedBoxId = boxProduct?.id ?? boxId;
      if (!price) return c.json({ error: "Box product not found or has no price" }, 400);
      let address = { line1: "", suburb: "", state: "QLD", postcode: "" };
      try {
        const addresses = JSON.parse(customer.addresses ?? "[]");
        if (addresses.length > 0) address = addresses[0];
      } catch {
      }
      if (!address.line1) {
        const [lastOrder] = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)).limit(1);
        if (lastOrder) {
          try {
            address = JSON.parse(lastOrder.deliveryAddress);
          } catch {
          }
        }
      }
      if (!address.line1) {
        return c.json({ error: "Customer has no delivery address \u2014 add one in Customers first" }, 400);
      }
      const now = Date.now();
      const orderId = await createSubscriptionOrder(db, {
        customerId,
        email: sub.email,
        name: customer.name ?? sub.email,
        phone: customer.phone ?? "",
        address,
        boxId: resolvedBoxId,
        boxName,
        frequency: sub.frequency,
        price,
        subscriptionId: sub.id,
        now,
        env: c.env
      });
      if (!orderId) return c.json({ error: "No upcoming delivery day available" }, 400);
      const updateData = { lastOrderGeneratedAt: now, updatedAt: now };
      if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
      await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));
      return c.json({ orderId });
    });
    app14.post("/auto-generate", async (c) => {
      const db = drizzle(c.env.DB);
      const now = Date.now();
      const FREQ_MS = {
        weekly: 7 * 24 * 60 * 60 * 1e3,
        fortnightly: 14 * 24 * 60 * 60 * 1e3,
        monthly: 30 * 24 * 60 * 60 * 1e3
      };
      const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
      let created = 0;
      const errors = [];
      for (const sub of activeSubs) {
        const interval = FREQ_MS[sub.frequency] ?? FREQ_MS.fortnightly;
        const lastGenerated = sub.lastOrderGeneratedAt ?? sub.createdAt;
        if (now - lastGenerated < interval * 0.8) continue;
        let customerId = sub.customerId;
        if (!customerId) {
          const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
          if (!cust) {
            errors.push(`${sub.email}: no customer record`);
            continue;
          }
          customerId = cust.id;
        }
        const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
        if (!customer) {
          errors.push(`${sub.email}: customer not found`);
          continue;
        }
        let address = { line1: "", suburb: "", state: "QLD", postcode: "" };
        try {
          const addresses = JSON.parse(customer.addresses ?? "[]");
          if (addresses.length > 0) address = addresses[0];
        } catch {
        }
        if (!address.line1) {
          const [lastOrder] = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)).limit(1);
          if (lastOrder) {
            try {
              address = JSON.parse(lastOrder.deliveryAddress);
            } catch {
            }
          }
        }
        if (!address.line1) {
          errors.push(`${sub.email}: no delivery address`);
          continue;
        }
        const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
        const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;
        const { like: like2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
        let [boxProduct] = await db.select().from(products).where(eq(products.id, boxId)).limit(1);
        if (!boxProduct) {
          [boxProduct] = await db.select().from(products).where(eq(products.id, `prod-${boxId}-box`)).limit(1);
        }
        if (!boxProduct) {
          [boxProduct] = await db.select().from(products).where(like2(products.name, `%${boxName.replace(" Box", "")}%Box%`)).limit(1);
        }
        const price = boxProduct?.fixedPrice ?? 0;
        const resolvedBoxId = boxProduct?.id ?? boxId;
        if (!price) {
          errors.push(`${sub.email}: box product not found or no price`);
          continue;
        }
        const orderId = await createSubscriptionOrder(db, {
          customerId,
          email: sub.email,
          name: customer.name ?? sub.email,
          phone: customer.phone ?? "",
          address,
          boxId: resolvedBoxId,
          boxName,
          frequency: sub.frequency,
          price,
          subscriptionId: sub.id,
          now,
          env: c.env
        });
        if (!orderId) {
          errors.push(`${sub.email}: no upcoming delivery day`);
          continue;
        }
        const updateData = { lastOrderGeneratedAt: now, updatedAt: now };
        if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
        await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));
        created++;
      }
      return c.json({ created, skipped: activeSubs.length - created - errors.length, errors });
    });
    app14.post("/:id/mark-sent", async (c) => {
      const db = drizzle(c.env.DB);
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, c.req.param("id"))).limit(1);
      if (!sub) return c.json({ error: "Not found" }, 404);
      if (!sub.alternateBoxId) return c.json({ error: "No alternate box configured" }, 400);
      await db.update(subscriptions).set({ nextIsAlternate: !sub.nextIsAlternate, updatedAt: Date.now() }).where(eq(subscriptions.id, sub.id));
      return c.json({ nextIsAlternate: !sub.nextIsAlternate });
    });
    subscriptions_default = app14;
  }
});

// src/index.ts
init_dist();

// ../../node_modules/.pnpm/hono@4.12.8/node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/index.ts
init_auth();
init_d1();
init_drizzle_orm();
init_src();
init_stock();

// src/lib/promos.ts
function parsePromoDeliveryDayIds(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string" && id.trim().length > 0);
  } catch {
    return [];
  }
}
__name(parsePromoDeliveryDayIds, "parsePromoDeliveryDayIds");
function promoAllowsDeliveryDay(promo, deliveryDayId) {
  const allowedIds = parsePromoDeliveryDayIds(promo.deliveryDayIds);
  if (allowedIds.length === 0) return true;
  return Boolean(deliveryDayId && allowedIds.includes(deliveryDayId));
}
__name(promoAllowsDeliveryDay, "promoAllowsDeliveryDay");

// src/routes/orders.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
init_email();
init_time();
init_stock();

// src/lib/json.ts
function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
__name(parseJson, "parseJson");

// src/lib/zones.ts
function extractPostcodes(zones) {
  if (!zones) return [];
  const matches = zones.match(/\b\d{4}\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches));
}
__name(extractPostcodes, "extractPostcodes");
function dayServesPostcode(zones, customerPostcode) {
  const pc = (customerPostcode ?? "").trim();
  if (!pc) return true;
  const list = extractPostcodes(zones);
  if (list.length === 0) return true;
  return list.includes(pc);
}
__name(dayServesPostcode, "dayServesPostcode");

// src/routes/orders.ts
var app = new Hono2();
var STATUS_EMAIL_MAP = {
  confirmed: "order_confirmation",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "order_cancelled",
  refunded: "refund_confirmation"
};
function formatAddress(addr) {
  if (!addr) return "";
  return `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}, ${addr.suburb} ${addr.state} ${addr.postcode}`;
}
__name(formatAddress, "formatAddress");
async function ensureStopForPaidDeliveryOrder(db, order) {
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
  if (!day || day.type !== "delivery") return false;
  const [existing] = await db.select({ id: stops.id }).from(stops).where(eq(stops.orderId, order.id)).limit(1);
  if (existing) return false;
  const [seqRow] = await db.select({ maxSequence: sql`coalesce(max(${stops.sequence}), 0)` }).from(stops).where(eq(stops.deliveryDayId, order.deliveryDayId));
  const sequence = Number(seqRow?.maxSequence ?? 0) + 1;
  const runId = await ensureDriverRunForDeliveryDay(db, order.deliveryDayId);
  await db.insert(stops).values({
    id: crypto.randomUUID(),
    deliveryDayId: order.deliveryDayId,
    runId,
    orderId: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone ?? "",
    address: order.deliveryAddress,
    items: order.items,
    sequence,
    status: "pending",
    customerNote: order.notes ?? null,
    lat: null,
    lng: null,
    createdAt: Date.now()
  });
  return true;
}
__name(ensureStopForPaidDeliveryOrder, "ensureStopForPaidDeliveryOrder");
async function ensureDriverRunForDeliveryDay(db, deliveryDayId) {
  const existingRuns = await db.select().from(deliveryRuns).where(eq(deliveryRuns.deliveryDayId, deliveryDayId));
  if (existingRuns.length === 1) return existingRuns[0].id;
  if (existingRuns.length > 1) return null;
  const activeDrivers = await db.select().from(users).where(and(
    or(eq(users.role, "driver"), eq(users.canDrive, true)),
    eq(users.active, true)
  ));
  if (activeDrivers.length !== 1) return null;
  const driver = activeDrivers[0];
  const now = Date.now();
  const runId = crypto.randomUUID();
  await db.insert(deliveryRuns).values({
    id: runId,
    deliveryDayId,
    name: driver.name || driver.email || "Delivery Run",
    zone: "All stops",
    color: "#1B3A2E",
    driverUid: driver.id,
    status: "pending",
    sequence: 0,
    notes: "Auto-created for single active driver so paid delivery stops are visible in the driver app.",
    createdAt: now
  });
  await db.update(deliveryDays).set({
    driverUid: driver.id,
    routeGenerated: true,
    routeGeneratedAt: now
  }).where(eq(deliveryDays.id, deliveryDayId));
  return runId;
}
__name(ensureDriverRunForDeliveryDay, "ensureDriverRunForDeliveryDay");
app.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const { status } = c.req.query();
  let rows;
  if (status && status !== "all") {
    rows = await db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt));
  } else {
    rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  return c.json(rows.map((o) => ({ ...o, items: parseJson(o.items, []), deliveryAddress: parseJson(o.deliveryAddress, {}) })));
});
app.get("/today", async (c) => {
  const db = drizzle(c.env.DB);
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const rows = await db.select().from(orders).where(gte(orders.createdAt, todayStart.getTime())).orderBy(desc(orders.createdAt));
  return c.json(rows.map((o) => ({ ...o, items: parseJson(o.items, []), deliveryAddress: parseJson(o.deliveryAddress, {}) })));
});
app.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const [order] = await db.select().from(orders).where(eq(orders.id, c.req.param("id"))).limit(1);
  if (!order) return c.json({ error: "Not found" }, 404);
  const user = c.get("user");
  if (user.role !== "admin" && user.role !== "staff") {
    const [requesterCustomer] = await db.select().from(customers).where(eq(customers.email, user.email)).limit(1);
    if (!requesterCustomer || order.customerId !== requesterCustomer.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
  }
  return c.json({ ...order, items: parseJson(order.items, []), deliveryAddress: parseJson(order.deliveryAddress, {}) });
});
app.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const now = Date.now();
  const orderId = crypto.randomUUID();
  const fulfillmentType = body.fulfillmentType ?? "delivery";
  if (fulfillmentType !== "pickup" && body.deliveryDayId) {
    const [day] = await db.select({ zones: deliveryDays.zones, type: deliveryDays.type }).from(deliveryDays).where(eq(deliveryDays.id, body.deliveryDayId)).limit(1);
    if (day && day.type !== "pickup") {
      const customerPostcode = body.deliveryAddress?.postcode ?? "";
      if (!dayServesPostcode(day.zones, customerPostcode)) {
        return c.json({
          error: `Postcode ${customerPostcode || "(missing)"} isn't on this delivery day's route. Please choose a different day.`
        }, 400);
      }
    }
  }
  let customerId = body.customerId;
  if (!customerId) {
    const newId = crypto.randomUUID();
    const inserted = await db.insert(customers).values({
      id: newId,
      email: body.customerEmail,
      name: body.customerName ?? "",
      phone: body.customerPhone ?? "",
      clerkId: body.clerkId ?? null,
      accountType: "registered",
      orderCount: 0,
      totalSpent: 0,
      blacklisted: false,
      notes: "",
      createdAt: now,
      updatedAt: now
    }).onConflictDoUpdate({
      target: customers.email,
      set: { clerkId: sql`COALESCE(${customers.clerkId}, ${body.clerkId ?? null})`, updatedAt: now }
    }).returning({ id: customers.id });
    customerId = inserted[0]?.id ?? newId;
  }
  const subtotal = body.subtotal ?? 0;
  let discount = 0;
  const promoId = body.promoId;
  let appliedPromoId = null;
  if (promoId) {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, promoId)).limit(1);
    if (promo && promo.active) {
      if (!promoAllowsDeliveryDay(promo, body.deliveryDayId)) {
        return c.json({ error: "This promo code is only valid for selected delivery days. Please choose an eligible day or remove the code." }, 400);
      }
      if (promo.type === "percentage") {
        discount = Math.round(subtotal * (promo.value / 100));
      } else {
        discount = Math.min(promo.value, subtotal);
      }
      appliedPromoId = promo.id;
    }
  }
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const deliveryFee = 0;
  const gst = 0;
  const total = discountedSubtotal + deliveryFee;
  const stockDayId = await getStockDayId(db, body.deliveryDayId);
  const dayAllocations = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, stockDayId));
  const reserveResult = await reserveDayStock(db, dayAllocations, body.items);
  if (!reserveResult.ok) {
    return c.json({ error: reserveResult.error }, 400);
  }
  if (appliedPromoId) {
    const consumed = await consumePromoCode(db, appliedPromoId, now);
    if (!consumed.ok) {
      for (const item of body.items) {
        const alloc = dayAllocations.find((a) => a.productId === item.productId);
        if (!alloc) continue;
        const qty = item.weight ? item.weight / 1e3 : item.weightKg ?? item.quantity ?? 1;
        if (qty <= 0) continue;
        await db.update(deliveryDayStock).set({ sold: sql`${deliveryDayStock.sold} - ${qty}` }).where(eq(deliveryDayStock.id, alloc.id));
      }
      return c.json({ error: consumed.error }, 400);
    }
  }
  await db.insert(orders).values({
    id: orderId,
    customerId,
    customerEmail: body.customerEmail,
    customerName: body.customerName ?? "",
    customerPhone: body.customerPhone ?? "",
    items: JSON.stringify(body.items),
    subtotal: body.subtotal ?? 0,
    deliveryFee,
    gst,
    total,
    status: body.status ?? "confirmed",
    paymentStatus: body.paymentStatus ?? "pending_payment",
    deliveryDayId: body.deliveryDayId,
    deliveryAddress: JSON.stringify(body.deliveryAddress),
    internalNotes: body.internalNotes ?? "",
    fulfillmentType: body.fulfillmentType ?? "delivery",
    // Store the human-readable promo code (e.g. "BBQ20"), not the internal
    // UUID. Receipts, customer-facing emails and the admin order detail all
    // read this column expecting the code as the customer typed it.
    promoCode: body.promoCode ?? null,
    promoDiscount: discount ?? 0,
    createdAt: now,
    updatedAt: now
  });
  await deductStock(db, body.items, orderId, now);
  await db.update(deliveryDays).set({ orderCount: sql`${deliveryDays.orderCount} + 1` }).where(eq(deliveryDays.id, body.deliveryDayId));
  await db.update(customers).set({ orderCount: sql`${customers.orderCount} + 1`, totalSpent: sql`${customers.totalSpent} + ${total}`, updatedAt: now }).where(eq(customers.id, customerId));
  return c.json({ id: orderId }, 201);
});
var VALID_ORDER_STATUSES = /* @__PURE__ */ new Set([
  "pending_payment",
  "confirmed",
  "preparing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded"
]);
app.patch("/:id/status", async (c) => {
  const db = drizzle(c.env.DB);
  const { status, packedBy, internalNotes, paymentStatus } = await c.req.json();
  const user = c.get("user");
  const orderId = c.req.param("id");
  const now = Date.now();
  if (!VALID_ORDER_STATUSES.has(status)) {
    return c.json({ error: `Invalid status "${status}". Must be one of: ${[...VALID_ORDER_STATUSES].join(", ")}` }, 400);
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: "Not found" }, 404);
  const patch = { status, updatedAt: now };
  if (packedBy) {
    patch.packedBy = packedBy;
    patch.packedAt = now;
  }
  if (internalNotes !== void 0) patch.internalNotes = internalNotes;
  if (paymentStatus !== void 0) patch.paymentStatus = paymentStatus;
  await db.update(orders).set(patch).where(eq(orders.id, orderId));
  if (paymentStatus === "paid") {
    await ensureStopForPaidDeliveryOrder(db, { ...order, ...patch });
  }
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: "update_status",
    entity: "orders",
    entityId: orderId,
    before: JSON.stringify({ status: order.status, paymentStatus: order.paymentStatus }),
    after: JSON.stringify({ status, ...paymentStatus !== void 0 ? { paymentStatus } : {} }),
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: now
  });
  const emailType = STATUS_EMAIL_MAP[status];
  if (emailType) {
    const addrParsed = JSON.parse(order.deliveryAddress);
    const emailData = {
      customerName: order.customerName,
      orderId,
      orderItems: JSON.parse(order.items),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      gst: order.gst,
      total: order.total,
      deliveryDate: formatBrisbaneShortDate(order.createdAt, { year: true }),
      deliveryAddress: formatAddress(addrParsed),
      trackingUrl: `${c.env.STOREFRONT_URL}/track/${orderId}`,
      proofUrl: order.proofUrl ?? void 0
    };
    const result = await sendEmail({
      apiKey: c.env.RESEND_API_KEY,
      from: c.env.FROM_EMAIL,
      to: order.customerEmail,
      subject: getSubject(emailType, emailData),
      html: buildOrderEmail(emailType, emailData)
    });
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      orderId,
      customerId: order.customerId,
      type: emailType,
      status: result ? "sent" : "failed",
      recipientEmail: order.customerEmail,
      resendId: result?.id ?? null,
      sentAt: now
    });
  }
  return c.json({ ok: true });
});
app.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  const orderId = c.req.param("id");
  const now = Date.now();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json();
  const patch = { updatedAt: now };
  if (body.customerName !== void 0) patch.customerName = body.customerName;
  if (body.customerEmail !== void 0) patch.customerEmail = body.customerEmail;
  if (body.customerPhone !== void 0) patch.customerPhone = body.customerPhone;
  if (body.items !== void 0) patch.items = JSON.stringify(body.items);
  if (body.subtotal !== void 0) patch.subtotal = body.subtotal;
  if (body.deliveryFee !== void 0) patch.deliveryFee = body.deliveryFee;
  if (body.gst !== void 0) patch.gst = body.gst;
  if (body.total !== void 0) patch.total = body.total;
  if (body.deliveryAddress !== void 0) patch.deliveryAddress = JSON.stringify(body.deliveryAddress);
  if (body.notes !== void 0) patch.notes = body.notes;
  if (body.internalNotes !== void 0) patch.internalNotes = body.internalNotes;
  if (body.status !== void 0) patch.status = body.status;
  if (body.paymentStatus !== void 0) patch.paymentStatus = body.paymentStatus;
  const deliveryDayChanged = body.deliveryDayId !== void 0 && body.deliveryDayId !== order.deliveryDayId;
  let reassignedRunId;
  if (deliveryDayChanged && body.deliveryDayId) {
    await db.update(deliveryDays).set({ orderCount: sql`MAX(0, ${deliveryDays.orderCount} - 1)` }).where(eq(deliveryDays.id, order.deliveryDayId));
    await db.update(deliveryDays).set({ orderCount: sql`${deliveryDays.orderCount} + 1` }).where(eq(deliveryDays.id, body.deliveryDayId));
    patch.deliveryDayId = body.deliveryDayId;
    if ((body.paymentStatus ?? order.paymentStatus) === "paid") {
      reassignedRunId = await ensureDriverRunForDeliveryDay(db, body.deliveryDayId);
    }
  }
  if (body.total !== void 0 && body.total !== order.total && order.customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
    if (cust) {
      const newSpent = Math.max(0, cust.totalSpent - order.total + body.total);
      await db.update(customers).set({ totalSpent: newSpent, updatedAt: now }).where(eq(customers.id, cust.id));
    }
  }
  const effectiveOrder = { ...order, ...patch };
  const stopPatch = {};
  if (body.customerName !== void 0) stopPatch.customerName = body.customerName;
  if (body.customerPhone !== void 0) stopPatch.customerPhone = body.customerPhone ?? "";
  if (body.items !== void 0) stopPatch.items = JSON.stringify(body.items);
  if (body.notes !== void 0) stopPatch.customerNote = body.notes ?? null;
  if (body.deliveryAddress !== void 0) {
    stopPatch.address = JSON.stringify(body.deliveryAddress);
    stopPatch.lat = null;
    stopPatch.lng = null;
  }
  if (deliveryDayChanged && body.deliveryDayId) {
    stopPatch.deliveryDayId = body.deliveryDayId;
    stopPatch.runId = reassignedRunId ?? null;
  }
  await db.update(orders).set(patch).where(eq(orders.id, orderId));
  if (Object.keys(stopPatch).length > 0) {
    await db.update(stops).set(stopPatch).where(eq(stops.orderId, orderId));
  }
  if (effectiveOrder.paymentStatus === "paid") {
    await ensureStopForPaidDeliveryOrder(db, effectiveOrder);
  }
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: "update_order",
    entity: "orders",
    entityId: orderId,
    before: JSON.stringify({ customerName: order.customerName, total: order.total, items: order.items }),
    after: JSON.stringify(body),
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: now
  });
  const [updated] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return c.json({ ...updated, items: JSON.parse(updated.items), deliveryAddress: JSON.parse(updated.deliveryAddress) });
});
app.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  const orderId = c.req.param("id");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: "Not found" }, 404);
  if (order.deliveryDayId) {
    const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
    if (day) await db.update(deliveryDays).set({ orderCount: Math.max(0, day.orderCount - 1) }).where(eq(deliveryDays.id, day.id));
  }
  if (order.customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
    if (cust) {
      await db.update(customers).set({
        orderCount: Math.max(0, cust.orderCount - 1),
        totalSpent: Math.max(0, cust.totalSpent - order.total),
        updatedAt: Date.now()
      }).where(eq(customers.id, cust.id));
    }
  }
  await db.delete(stops).where(eq(stops.orderId, orderId));
  const items = JSON.parse(order.items);
  const { restoreStock: restoreStock2 } = await Promise.resolve().then(() => (init_stock(), stock_exports));
  await restoreStock2(db, items, orderId, Date.now());
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: "delete_order",
    entity: "orders",
    entityId: orderId,
    before: JSON.stringify({ customerName: order.customerName, total: order.total, status: order.status }),
    after: JSON.stringify({ deleted: true }),
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: Date.now()
  });
  await db.delete(orders).where(eq(orders.id, orderId));
  return c.json({ ok: true });
});
var SQUARE_API = "https://connect.squareup.com/v2";
app.post("/:id/invoice", async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) return c.json({ error: "Square not configured" }, 400);
  const db = drizzle(c.env.DB);
  const orderId = c.req.param("id");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  const items = JSON.parse(order.items);
  const squareFetch2 = /* @__PURE__ */ __name(async (path, body) => {
    const res = await fetch(`${SQUARE_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18"
      },
      body: JSON.stringify(body)
    });
    return res.json();
  }, "squareFetch");
  try {
    const searchResult = await squareFetch2("/customers/search", {
      query: {
        filter: {
          email_address: { exact: order.customerEmail }
        }
      }
    });
    let squareCustomerId;
    if (searchResult.customers?.length) {
      squareCustomerId = searchResult.customers[0].id;
    } else {
      const createCustomerResult = await squareFetch2("/customers", {
        idempotency_key: crypto.randomUUID(),
        given_name: order.customerName?.split(" ")[0] ?? "",
        family_name: order.customerName?.split(" ").slice(1).join(" ") ?? "",
        email_address: order.customerEmail,
        phone_number: order.customerPhone ? `+61${order.customerPhone.replace(/^0/, "")}` : void 0
      });
      if (createCustomerResult.errors) {
        return c.json({ error: "Failed to create Square customer", details: createCustomerResult.errors }, 400);
      }
      squareCustomerId = createCustomerResult.customer?.id;
      if (!squareCustomerId) {
        return c.json({ error: "Square customer created but no ID returned" }, 500);
      }
    }
    const squareLineItems = items.map((i) => {
      const qty = i.quantity ?? 1;
      return {
        name: i.productName ?? "Item",
        quantity: String(qty),
        base_price_money: {
          amount: Math.round(i.lineTotal / qty),
          currency: "AUD"
        }
      };
    });
    if (order.deliveryFee > 0) {
      squareLineItems.push({
        name: "Delivery Fee",
        quantity: "1",
        base_price_money: { amount: order.deliveryFee, currency: "AUD" }
      });
    }
    const orderResult = await squareFetch2("/orders", {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: locationId,
        customer_id: squareCustomerId,
        line_items: squareLineItems
      }
    });
    if (orderResult.errors) {
      return c.json({ error: "Failed to create Square order", details: orderResult.errors }, 400);
    }
    const squareOrderId = orderResult.order?.id;
    if (!squareOrderId) {
      return c.json({ error: "Square order created but no ID returned" }, 500);
    }
    const invoiceResult = await squareFetch2("/invoices", {
      idempotency_key: crypto.randomUUID(),
      invoice: {
        location_id: locationId,
        order_id: squareOrderId,
        primary_recipient: {
          customer_id: squareCustomerId
        },
        payment_requests: [{
          request_type: "BALANCE",
          due_date: await (async () => {
            if (order.deliveryDayId) {
              const [dd] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
              if (dd?.date) {
                const deliveryDate = new Date(dd.date);
                deliveryDate.setDate(deliveryDate.getDate() - 1);
                if (deliveryDate > /* @__PURE__ */ new Date()) return deliveryDate.toISOString().split("T")[0];
              }
            }
            return new Date(Date.now() + 3 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
          })(),
          automatic_payment_source: "NONE"
        }],
        delivery_method: "EMAIL",
        title: `O'Connor Agriculture \u2014 Order #${orderId.slice(0, 8).toUpperCase()}`,
        accepted_payment_methods: {
          card: true,
          square_gift_card: false,
          bank_account: false,
          buy_now_pay_later: false
        }
      }
    });
    if (invoiceResult.errors) {
      return c.json({ error: "Failed to create invoice", details: invoiceResult.errors }, 400);
    }
    const invoice = invoiceResult.invoice;
    if (invoice?.id) {
      const publishResult = await squareFetch2(`/invoices/${invoice.id}/publish`, {
        idempotency_key: crypto.randomUUID(),
        version: invoice.version ?? 0
      });
      if (publishResult.errors) {
        return c.json({ error: "Invoice created but failed to send", details: publishResult.errors }, 400);
      }
    }
    await db.update(orders).set({
      paymentStatus: "invoice_sent",
      internalNotes: `${order.internalNotes ?? ""}
Square invoice sent: ${invoice?.id ?? "unknown"}`.trim(),
      updatedAt: Date.now()
    }).where(eq(orders.id, orderId));
    return c.json({ ok: true, method: "invoice", invoiceId: invoice?.id });
  } catch (e) {
    return c.json({ error: e?.message ?? "Invoice creation failed" }, 500);
  }
});
app.post("/:id/invoice/cancel", async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) return c.json({ error: "Square not configured" }, 400);
  const db = drizzle(c.env.DB);
  const orderId = c.req.param("id");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  const notes = order.internalNotes ?? "";
  const matches = [...notes.matchAll(/Square invoice sent:\s*(inv:[^\s\n]+)/g)];
  const invoiceId = matches.length ? matches[matches.length - 1][1] : null;
  if (!invoiceId) {
    return c.json({ error: "No Square invoice ID found on this order" }, 400);
  }
  const squareFetch2 = /* @__PURE__ */ __name(async (method, path, body) => {
    const res = await fetch(`${SQUARE_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18"
      },
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    return res.json();
  }, "squareFetch");
  try {
    const fetched = await squareFetch2("GET", `/invoices/${invoiceId}`);
    if (fetched.errors) {
      return c.json({ error: "Failed to load invoice from Square", details: fetched.errors }, 400);
    }
    const invoice = fetched.invoice;
    if (!invoice) {
      return c.json({ error: "Square returned no invoice for that ID" }, 404);
    }
    const CANCELLABLE = /* @__PURE__ */ new Set(["DRAFT", "SCHEDULED", "UNPAID", "PARTIALLY_PAID"]);
    if (!CANCELLABLE.has(invoice.status)) {
      return c.json({
        error: `Invoice is in state ${invoice.status} and can't be cancelled. Paid invoices need a manual refund in the Square Dashboard.`
      }, 400);
    }
    const cancelResult = await squareFetch2("POST", `/invoices/${invoiceId}/cancel`, {
      version: invoice.version ?? 0
    });
    if (cancelResult.errors) {
      return c.json({ error: "Square refused to cancel the invoice", details: cancelResult.errors }, 400);
    }
    const newPaymentStatus = order.status === "cancelled" ? "cancelled" : "pending_payment";
    await db.update(orders).set({
      paymentStatus: newPaymentStatus,
      internalNotes: `${order.internalNotes ?? ""}
Square invoice cancelled: ${invoiceId}`.trim(),
      updatedAt: Date.now()
    }).where(eq(orders.id, orderId));
    return c.json({ ok: true, invoiceId, paymentStatus: newPaymentStatus });
  } catch (e) {
    return c.json({ error: e?.message ?? "Invoice cancellation failed" }, 500);
  }
});
app.post("/:id/payment-link", async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  const storefrontUrl = c.env.STOREFRONT_URL ?? "https://oconnoragriculture.com.au";
  if (!accessToken || !locationId) return c.json({ error: "Square not configured" }, 400);
  const db = drizzle(c.env.DB);
  const orderId = c.req.param("id");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  const items = JSON.parse(order.items);
  const promoDiscount = Math.max(0, order.promoDiscount ?? 0);
  const promoCode = (order.promoCode ?? "").trim();
  const metadata = promoCode ? { orderId, promoCode } : { orderId };
  try {
    const squareLineItems = items.map((i) => {
      const qty = i.quantity ?? 1;
      return {
        name: i.productName ?? "Item",
        quantity: String(qty),
        base_price_money: {
          amount: Math.round(i.lineTotal / qty),
          currency: "AUD"
        }
      };
    });
    if (order.deliveryFee > 0) {
      squareLineItems.push({
        name: "Delivery Fee",
        quantity: "1",
        base_price_money: { amount: order.deliveryFee, currency: "AUD" }
      });
    }
    const res = await fetch(`${SQUARE_API}/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18"
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId,
          line_items: squareLineItems,
          discounts: promoDiscount > 0 ? [{
            uid: "promo_discount",
            name: promoCode ? `Promo ${promoCode}` : "Promo discount",
            type: "FIXED_AMOUNT",
            scope: "ORDER",
            amount_money: { amount: promoDiscount, currency: "AUD" }
          }] : void 0,
          metadata
        },
        checkout_options: {
          redirect_url: `${storefrontUrl}/checkout/success?orderId=${orderId}`,
          merchant_support_email: "orders@oconnoragriculture.com.au"
        },
        payment_note: `O'Connor Agriculture \u2014 Order #${orderId.slice(0, 8).toUpperCase()}`
      })
    });
    const data = await res.json();
    if (data.errors) {
      return c.json({ error: "Failed to create payment link", details: data.errors }, 400);
    }
    const paymentUrl = data.payment_link?.url ?? data.payment_link?.long_url;
    const paymentLinkId = data.payment_link?.id;
    if (!paymentUrl) {
      return c.json({ error: "Payment link created but no URL returned" }, 500);
    }
    await db.update(orders).set({
      paymentStatus: "awaiting_payment",
      paymentProvider: "square",
      internalNotes: `${order.internalNotes ?? ""}
Square payment link: ${paymentLinkId ?? "unknown"}`.trim(),
      updatedAt: Date.now()
    }).where(eq(orders.id, orderId));
    return c.json({ ok: true, paymentUrl, paymentLinkId });
  } catch (e) {
    return c.json({ error: e?.message ?? "Payment link creation failed" }, 500);
  }
});
var orders_default = app;

// src/routes/products.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
var app2 = new Hono2();
app2.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const { activeOnly } = c.req.query();
  let rows;
  if (activeOnly === "true") {
    rows = await db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.displayOrder));
  } else {
    rows = await db.select().from(products).orderBy(asc(products.displayOrder));
  }
  return c.json(rows.map((p) => ({ ...p, weightOptions: p.weightOptions ? JSON.parse(p.weightOptions) : null })));
});
app2.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const [product] = await db.select().from(products).where(eq(products.id, c.req.param("id"))).limit(1);
  if (!product) return c.json({ error: "Not found" }, 404);
  return c.json({ ...product, weightOptions: product.weightOptions ? JSON.parse(product.weightOptions) : null });
});
app2.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(products).values({
    ...body,
    id,
    weightOptions: body.weightOptions ? JSON.stringify(body.weightOptions) : null,
    createdAt: now,
    updatedAt: now
  });
  return c.json({ id }, 201);
});
app2.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const body = await c.req.json();
  const now = Date.now();
  const productId = c.req.param("id");
  const [before] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);
  await db.update(products).set({
    ...body,
    weightOptions: body.weightOptions ? JSON.stringify(body.weightOptions) : before.weightOptions,
    updatedAt: now
  }).where(eq(products.id, productId));
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: "update",
    entity: "products",
    entityId: productId,
    before: JSON.stringify(before),
    after: JSON.stringify(body),
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: now
  });
  return c.json({ ok: true });
});
app2.patch("/:id/stock", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const { delta, reason, type } = await c.req.json();
  const productId = c.req.param("id");
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return c.json({ error: "Not found" }, 404);
  const newStock = Math.max(0, product.stockOnHand + delta);
  const now = Date.now();
  await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, productId));
  await db.insert(stockMovements).values({
    id: crypto.randomUUID(),
    productId,
    productName: product.name,
    type: type ?? "adjustment",
    qty: delta,
    unit: product.isMeatPack ? "units" : "kg",
    reason: reason ?? null,
    createdBy: user.email,
    createdAt: now
  });
  return c.json({ stockOnHand: newStock });
});
app2.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  const productId = c.req.param("id");
  const { hard } = c.req.query();
  const [before] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);
  if (hard === "true") {
    await db.delete(stockMovements).where(eq(stockMovements.productId, productId));
    await db.delete(deliveryDayStock).where(eq(deliveryDayStock.productId, productId));
    await db.delete(products).where(eq(products.id, productId));
  } else {
    await db.update(products).set({ active: false, updatedAt: Date.now() }).where(eq(products.id, productId));
  }
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: hard === "true" ? "delete" : "soft_delete",
    entity: "products",
    entityId: productId,
    before: JSON.stringify(before),
    after: "{}",
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: Date.now()
  });
  return c.json({ ok: true });
});
var products_default = app2;

// src/routes/deliveryDays.ts
init_dist();
init_push();
init_d1();
init_drizzle_orm();
init_src();
init_stock();
init_email();

// src/lib/sms.ts
function normalizePhoneAU(raw2) {
  if (!raw2) return null;
  const cleaned = raw2.replace(/[\s\-()]/g, "");
  if (!cleaned) return null;
  if (/^\+61[2-478]\d{8}$/.test(cleaned)) return cleaned;
  if (/^0[2-478]\d{8}$/.test(cleaned)) return "+61" + cleaned.slice(1);
  if (/^61[2-478]\d{8}$/.test(cleaned)) return "+" + cleaned;
  if (/^[2-478]\d{8}$/.test(cleaned)) return "+61" + cleaned;
  return null;
}
__name(normalizePhoneAU, "normalizePhoneAU");
async function sendSms(env, to, body) {
  if (!env.CLICKSEND_USERNAME || !env.CLICKSEND_API_KEY || !env.CLICKSEND_FROM) {
    return { ok: false, error: "ClickSend secrets not configured" };
  }
  const normalized = normalizePhoneAU(to);
  if (!normalized) return { ok: false, error: `Invalid phone: ${to}` };
  const auth = btoa(`${env.CLICKSEND_USERNAME}:${env.CLICKSEND_API_KEY}`);
  try {
    const res = await fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{
          source: "oconnor-api",
          from: env.CLICKSEND_FROM,
          to: normalized,
          body
        }]
      })
    });
    if (!res.ok) {
      const text2 = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${text2.slice(0, 200)}` };
    }
    const json = await res.json();
    const message = json?.data?.messages?.[0];
    if (message?.status && message.status !== "SUCCESS") {
      return { ok: false, error: `ClickSend: ${message.status}` };
    }
    return { ok: true, messageId: message?.message_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
__name(sendSms, "sendSms");

// src/routes/deliveryDays.ts
init_time();
var app4 = new Hono2();
app4.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const { upcoming, withStock } = c.req.query();
  let rows;
  if (upcoming === "true") {
    const now = Date.now();
    rows = await db.select().from(deliveryDays).where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, now))).orderBy(asc(deliveryDays.date));
  } else {
    rows = await db.select().from(deliveryDays).orderBy(asc(deliveryDays.date));
  }
  if (withStock === "true") {
    const allStock = await db.select().from(deliveryDayStock);
    const result = rows.map((day) => {
      const effectiveId = day.stockPoolId ?? day.id;
      const dayStock = allStock.filter((s) => s.deliveryDayId === effectiveId && s.allocated > 0);
      const available = dayStock.map((s) => ({
        productId: s.productId,
        remaining: s.allocated - s.sold
      }));
      return { ...day, stockAvailability: available };
    });
    return c.json(result);
  }
  return c.json(rows);
});
app4.get("/today", async (c) => {
  const db = drizzle(c.env.DB);
  const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1e3;
  const nowBrisbaneMs = Date.now() + BRISBANE_OFFSET_MS;
  const brisbaneDay = new Date(nowBrisbaneMs);
  brisbaneDay.setUTCHours(0, 0, 0, 0);
  const todayStartMs = brisbaneDay.getTime() - BRISBANE_OFFSET_MS;
  const todayEndMs = todayStartMs + 24 * 60 * 60 * 1e3;
  const { lt: lt2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const [day] = await db.select().from(deliveryDays).where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, todayStartMs), lt2(deliveryDays.date, todayEndMs))).limit(1);
  if (!day) return c.json({ error: "No delivery day today" }, 404);
  return c.json(day);
});
app4.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, c.req.param("id"))).limit(1);
  if (!day) return c.json({ error: "Not found" }, 404);
  return c.json(day);
});
app4.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const now = Date.now();
  const dateObj = new Date(body.date);
  const cutoffTime = body.cutoffTime ?? body.date - 24 * 60 * 60 * 1e3;
  const dayOfWeek = body.dayOfWeek ?? dateObj.getDay();
  await db.insert(deliveryDays).values({ ...body, id, dayOfWeek, cutoffTime, createdAt: now });
  return c.json({ id }, 201);
});
app4.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  if (user.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  await db.update(deliveryDays).set({ active: false }).where(eq(deliveryDays.id, c.req.param("id")));
  return c.json({ ok: true });
});
async function geocodeAddress(address) {
  try {
    const q = encodeURIComponent(`${address.line1}, ${address.suburb}, ${address.postcode}, Queensland, Australia`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=au`, {
      headers: { "User-Agent": "OConnorAgriculture/1.0 (orders@oconnoragriculture.com.au)" }
    });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
  }
  return null;
}
__name(geocodeAddress, "geocodeAddress");
async function geocodeFreeformAddress(address) {
  const clean = address.trim();
  if (!clean) return null;
  try {
    const q = encodeURIComponent(`${clean}, Queensland, Australia`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=au`, {
      headers: { "User-Agent": "OConnorAgriculture/1.0 (orders@oconnoragriculture.com.au)" }
    });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
  }
  return null;
}
__name(geocodeFreeformAddress, "geocodeFreeformAddress");
function orderItemQty(item) {
  const qty = item.weight ? item.weight / 1e3 : item.weightKg ?? item.quantity ?? 1;
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}
__name(orderItemQty, "orderItemQty");
function buildStockPaymentBreakdown(dayOrders) {
  const breakdown = /* @__PURE__ */ new Map();
  const ensure = /* @__PURE__ */ __name((productId) => {
    const existing = breakdown.get(productId);
    if (existing) return existing;
    const next = { paid: 0, awaitingPayment: 0, cancelled: 0, other: 0 };
    breakdown.set(productId, next);
    return next;
  }, "ensure");
  for (const order of dayOrders) {
    let items = [];
    try {
      items = JSON.parse(order.items);
    } catch {
      continue;
    }
    const paymentStatus = order.paymentStatus ?? "";
    const orderStatus = order.status ?? "";
    const isCancelled = ["cancelled", "refunded", "failed"].includes(orderStatus) || ["cancelled", "refunded", "failed"].includes(paymentStatus);
    const isPaid = paymentStatus === "paid" && !isCancelled;
    const isAwaiting = !isCancelled && (["pending_payment", "awaiting_payment", "invoice_sent", "payment_failed"].includes(paymentStatus) || ["pending_payment"].includes(orderStatus));
    for (const item of items) {
      if (!item.productId) continue;
      const qty = orderItemQty(item);
      if (qty <= 0) continue;
      const row = ensure(item.productId);
      if (isPaid) row.paid += qty;
      else if (isAwaiting) row.awaitingPayment += qty;
      else if (isCancelled) row.cancelled += qty;
      else row.other += qty;
    }
  }
  return breakdown;
}
__name(buildStockPaymentBreakdown, "buildStockPaymentBreakdown");
app4.patch("/:id/route-endpoints", async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param("id");
  const body = await c.req.json();
  const routeStartAddress = body.routeStartAddress?.trim() || null;
  const routeFinishAddress = body.routeFinishAddress?.trim() || null;
  const startGeo = routeStartAddress ? await geocodeFreeformAddress(routeStartAddress) : null;
  const finishGeo = routeFinishAddress ? await geocodeFreeformAddress(routeFinishAddress) : null;
  if (routeStartAddress && !startGeo) return c.json({ error: "Could not find the start address" }, 400);
  if (routeFinishAddress && !finishGeo) return c.json({ error: "Could not find the finish address" }, 400);
  await db.update(deliveryDays).set({
    routeStartAddress,
    routeStartLat: startGeo?.lat ?? null,
    routeStartLng: startGeo?.lng ?? null,
    routeFinishAddress,
    routeFinishLat: finishGeo?.lat ?? null,
    routeFinishLng: finishGeo?.lng ?? null
  }).where(eq(deliveryDays.id, id));
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, id)).limit(1);
  return c.json(day);
});
app4.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  await db.update(deliveryDays).set(body).where(eq(deliveryDays.id, c.req.param("id")));
  return c.json({ ok: true });
});
app4.post("/:id/generate-stops", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const now = Date.now();
  const FREQ_MS = {
    weekly: 7 * 24 * 60 * 60 * 1e3,
    fortnightly: 14 * 24 * 60 * 60 * 1e3,
    monthly: 30 * 24 * 60 * 60 * 1e3
  };
  const [thisDay] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  const deliveryDate = thisDay?.date ?? now;
  const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
  const existingOrders = await db.select({ customerId: orders.customerId, notes: orders.notes }).from(orders).where(eq(orders.deliveryDayId, dayId));
  const subsWithOrders = new Set(
    existingOrders.filter((o) => o.notes && o.notes.startsWith("Subscription:")).map((o) => o.customerId)
  );
  for (const sub of activeSubs) {
    const interval = FREQ_MS[sub.frequency] ?? FREQ_MS.fortnightly;
    const lastGenerated = sub.lastOrderGeneratedAt ?? sub.createdAt;
    const nextDueDate = lastGenerated + interval;
    if (deliveryDate < nextDueDate - interval * 0.2) continue;
    let customerId = sub.customerId;
    if (!customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
      if (!cust) continue;
      customerId = cust.id;
    }
    if (subsWithOrders.has(customerId)) continue;
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) continue;
    let address = { line1: "", line2: "", suburb: "", state: "QLD", postcode: "" };
    try {
      const addresses = JSON.parse(customer.addresses ?? "[]");
      if (addresses.length > 0) address = addresses[0];
    } catch {
    }
    if (!address.line1) {
      const { desc: descOrd } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
      const [lastOrder] = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(descOrd(orders.createdAt)).limit(1);
      if (lastOrder) {
        try {
          address = JSON.parse(lastOrder.deliveryAddress);
        } catch {
        }
      }
    }
    if (!address.line1) continue;
    const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
    const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;
    const { like: like2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
    let [boxProduct] = await db.select().from(products).where(eq(products.id, boxId)).limit(1);
    if (!boxProduct) {
      [boxProduct] = await db.select().from(products).where(eq(products.id, `prod-${boxId}-box`)).limit(1);
    }
    if (!boxProduct) {
      [boxProduct] = await db.select().from(products).where(like2(products.name, `%${boxName.replace(" Box", "")}%Box%`)).limit(1);
    }
    const price = boxProduct?.fixedPrice ?? 0;
    if (!price) continue;
    const resolvedBoxId = boxProduct.id;
    const { createSubscriptionOrder: createSubscriptionOrder2 } = await Promise.resolve().then(() => (init_subscriptions(), subscriptions_exports));
    const orderId = await createSubscriptionOrder2(db, {
      customerId,
      email: sub.email,
      name: customer.name ?? sub.email,
      phone: customer.phone ?? "",
      address,
      boxId: resolvedBoxId,
      boxName,
      frequency: sub.frequency,
      price,
      subscriptionId: sub.id,
      now,
      env: c.env,
      deliveryDayId: dayId
    });
    if (!orderId) continue;
    const updateData = { lastOrderGeneratedAt: now, updatedAt: now };
    if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
    await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));
  }
  const DELIVERABLE_STATUSES = /* @__PURE__ */ new Set([
    "pending_payment",
    "confirmed",
    "preparing",
    "packed",
    "out_for_delivery"
  ]);
  const FULFILLABLE_PAYMENT_STATUSES = /* @__PURE__ */ new Set(["paid"]);
  const dayOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const existingStops = await db.select({ orderId: stops.orderId }).from(stops).where(eq(stops.deliveryDayId, dayId));
  const existingOrderIds = new Set(existingStops.map((s) => s.orderId));
  let created = 0;
  for (const order of dayOrders) {
    if (existingOrderIds.has(order.id)) continue;
    if (!DELIVERABLE_STATUSES.has(order.status)) continue;
    const isInvoicedSubscription = order.paymentStatus === "invoice_sent" && (order.notes ?? "").startsWith("Subscription:");
    if (!FULFILLABLE_PAYMENT_STATUSES.has(order.paymentStatus) && !isInvoicedSubscription) continue;
    const addr = JSON.parse(order.deliveryAddress);
    const geo = await geocodeAddress(addr);
    await db.insert(stops).values({
      id: crypto.randomUUID(),
      deliveryDayId: dayId,
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? "",
      address: order.deliveryAddress,
      items: order.items,
      sequence: created,
      status: "pending",
      customerNote: order.notes ?? null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      createdAt: Date.now()
    });
    created++;
    if (created < dayOrders.length) await new Promise((r) => setTimeout(r, 1100));
  }
  const existingRuns = await db.select().from(deliveryRuns).where(eq(deliveryRuns.deliveryDayId, dayId));
  if (existingRuns.length === 0) {
    const activeDrivers = await db.select().from(users).where(and(
      or(eq(users.role, "driver"), eq(users.canDrive, true)),
      eq(users.active, true)
    ));
    const RUN_COLORS = ["#1B3A2E", "#4E7732", "#2563EB", "#7C3AED", "#DC2626", "#EA580C", "#0891B2", "#BE185D"];
    let runSeq = 0;
    const allDayStops = await db.select().from(stops).where(eq(stops.deliveryDayId, dayId));
    for (const driver of activeDrivers) {
      const driverZones = (() => {
        try {
          return JSON.parse(driver.zones ?? "[]");
        } catch {
          return [];
        }
      })();
      if (driverZones.length === 0) continue;
      const matchingStopIds = [];
      for (const stop of allDayStops) {
        if (stop.runId) continue;
        try {
          const addr = JSON.parse(stop.address);
          if (addr.postcode && driverZones.some((z) => addr.postcode.startsWith(z))) {
            matchingStopIds.push(stop.id);
          }
        } catch {
        }
      }
      if (matchingStopIds.length === 0) continue;
      const runId = crypto.randomUUID();
      await db.insert(deliveryRuns).values({
        id: runId,
        deliveryDayId: dayId,
        name: driver.name || driver.email,
        zone: driverZones.join(", "),
        color: RUN_COLORS[runSeq % RUN_COLORS.length],
        driverUid: driver.id,
        status: "pending",
        sequence: runSeq++,
        createdAt: Date.now()
      });
      for (const stopId of matchingStopIds) {
        await db.update(stops).set({ runId }).where(eq(stops.id, stopId));
        const idx = allDayStops.findIndex((s) => s.id === stopId);
        if (idx >= 0) allDayStops[idx] = { ...allDayStops[idx], runId };
      }
    }
    const stillUnassigned = allDayStops.filter((stop) => !stop.runId);
    if (runSeq === 0 && activeDrivers.length === 1 && stillUnassigned.length > 0) {
      const driver = activeDrivers[0];
      const runId = crypto.randomUUID();
      await db.insert(deliveryRuns).values({
        id: runId,
        deliveryDayId: dayId,
        name: driver.name || driver.email || "Delivery Run",
        zone: "All stops",
        color: RUN_COLORS[0],
        driverUid: driver.id,
        status: "pending",
        sequence: 0,
        notes: "Auto-created for single active driver with no zone split.",
        createdAt: Date.now()
      });
      await db.update(stops).set({ runId }).where(and(eq(stops.deliveryDayId, dayId), or(isNull(stops.runId), eq(stops.runId, ""))));
      await db.update(deliveryDays).set({
        driverUid: driver.id,
        routeGenerated: true,
        routeGeneratedAt: Date.now()
      }).where(eq(deliveryDays.id, dayId));
    }
  } else if (existingRuns.length === 1) {
    await db.update(stops).set({ runId: existingRuns[0].id }).where(and(eq(stops.deliveryDayId, dayId), or(isNull(stops.runId), eq(stops.runId, ""))));
  }
  return c.json({ created, total: dayOrders.length });
});
app4.post("/:id/geocode-stops", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const { isNull: isNull2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const ungeocoded = await db.select().from(stops).where(and(eq(stops.deliveryDayId, dayId), isNull2(stops.lat)));
  let updated = 0;
  for (const stop of ungeocoded) {
    const addr = JSON.parse(stop.address);
    const geo = await geocodeAddress(addr);
    if (geo) {
      await db.update(stops).set({ lat: geo.lat, lng: geo.lng }).where(eq(stops.id, stop.id));
      updated++;
    }
    if (updated < ungeocoded.length) await new Promise((r) => setTimeout(r, 1100));
  }
  return c.json({ updated, total: ungeocoded.length });
});
app4.post("/:id/send-reminders", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: "Not found" }, 404);
  const allOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const pendingOrders = allOrders.filter((o) => !["cancelled", "refunded", "delivered", "pending_payment"].includes(o.status));
  const allStops = await db.select().from(stops).where(eq(stops.deliveryDayId, dayId));
  const dateLabel = formatBrisbaneDate(day.date);
  let sent = 0;
  for (const order of pendingOrders) {
    const stop = allStops.find((s) => s.orderId === order.id);
    let timeWindowText = "";
    if (stop?.estimatedArrival) {
      const eta = stop.estimatedArrival;
      const windowStart = formatBrisbaneTime(eta - 60 * 60 * 1e3);
      const windowEnd = formatBrisbaneTime(eta + 60 * 60 * 1e3);
      timeWindowText = ` We expect to arrive between <strong>${windowStart} and ${windowEnd}</strong>. Please ensure someone is home during this window.`;
    }
    const emailData = {
      customerName: order.customerName,
      orderId: order.id,
      orderItems: JSON.parse(order.items),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      gst: order.gst,
      total: order.total,
      deliveryDate: dateLabel,
      deliveryAddress: order.deliveryAddress,
      trackingUrl: `${c.env.STOREFRONT_URL}/track/${order.id}`,
      timeWindow: timeWindowText
    };
    const result = await sendEmail({
      apiKey: c.env.RESEND_API_KEY,
      from: c.env.FROM_EMAIL,
      to: order.customerEmail,
      subject: getSubject("day_before", emailData),
      html: buildOrderEmail("day_before", emailData)
    });
    if (result) sent++;
    await notifyCustomer(db, order.customerId, {
      title: "O'Connor \u2014 Delivery Tomorrow",
      body: stop?.estimatedArrival ? `Your delivery is scheduled for tomorrow ${dateLabel}. Expected arrival between ${formatBrisbaneTime(stop.estimatedArrival - 36e5)} and ${formatBrisbaneTime(stop.estimatedArrival + 36e5)}. Please ensure someone is home.` : `Your order is on its way ${dateLabel}. Check your order summary for details.`,
      url: `${c.env.STOREFRONT_URL}/track/${order.id}`
    }, c.env);
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      orderId: order.id,
      customerId: order.customerId,
      type: "day_before",
      status: result ? "sent" : "failed",
      recipientEmail: order.customerEmail,
      resendId: result?.id ?? null,
      sentAt: Date.now()
    });
  }
  return c.json({ sent, total: pendingOrders.length });
});
app4.post("/:id/broadcast", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const body = await c.req.json();
  const message = (body.message ?? "").trim();
  if (!message) return c.json({ error: "Message is required" }, 400);
  const subject = (body.subject ?? "").trim() || "Update from O'Connor Agriculture";
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: "Not found" }, 404);
  const allStops = await db.select().from(stops).where(eq(stops.deliveryDayId, dayId));
  const allOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const ordersById = new Map(allOrders.map((o) => [o.id, o]));
  let smsSent = 0, smsFailed = 0, emailSent = 0, emailFailed = 0;
  const now = Date.now();
  for (const stop of allStops) {
    const order = stop.orderId ? ordersById.get(stop.orderId) ?? null : null;
    if (order && ["cancelled", "refunded", "delivered", "pending_payment"].includes(order.status)) continue;
    const recipientName = stop.customerName ?? order?.customerName ?? "there";
    const recipientPhone = stop.customerPhone || order?.customerPhone || "";
    const recipientEmail = order?.customerEmail ?? "";
    if (recipientPhone) {
      const smsBody = `O'Connor Agriculture: ${message}`;
      const smsResult = await sendSms(c.env, recipientPhone, smsBody);
      if (smsResult.ok) smsSent++;
      else smsFailed++;
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        orderId: order?.id ?? null,
        customerId: order?.customerId ?? null,
        type: "admin_broadcast_sms",
        status: smsResult.ok ? "sent" : "failed",
        // notifications.recipientEmail is NOT NULL. For SMS-only sends we
        // store the phone number here so the audit row still has a recipient.
        recipientEmail: recipientEmail || recipientPhone,
        error: smsResult.ok ? null : smsResult.error ?? "sms send failed",
        sentAt: now
      });
    }
    if (recipientEmail) {
      const result = await sendEmail({
        apiKey: c.env.RESEND_API_KEY,
        from: c.env.FROM_EMAIL,
        to: recipientEmail,
        subject,
        html: buildBroadcastEmail({
          customerName: recipientName,
          message,
          ctaUrl: order ? `${c.env.STOREFRONT_URL}/track/${order.id}` : void 0,
          ctaText: order ? "Track my order" : void 0
        })
      });
      if (result) emailSent++;
      else emailFailed++;
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        orderId: order?.id ?? null,
        customerId: order?.customerId ?? null,
        type: "admin_broadcast_email",
        status: result ? "sent" : "failed",
        recipientEmail,
        resendId: result?.id ?? null,
        sentAt: now
      });
    }
    if (order?.customerId) {
      try {
        await notifyCustomer(db, order.customerId, {
          title: subject,
          body: message,
          url: `${c.env.STOREFRONT_URL}/track/${order.id}`
        }, c.env);
      } catch {
      }
    }
  }
  return c.json({
    sms: { sent: smsSent, failed: smsFailed },
    email: { sent: emailSent, failed: emailFailed },
    totalStops: allStops.length
  });
});
app4.get("/:id/stock", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const stockDayId = await getStockDayId(db, dayId);
  const rows = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, stockDayId));
  const poolDays = stockDayId !== dayId ? await db.select({ id: deliveryDays.id, date: deliveryDays.date }).from(deliveryDays).where(eq(deliveryDays.stockPoolId, stockDayId)) : await db.select({ id: deliveryDays.id, date: deliveryDays.date }).from(deliveryDays).where(eq(deliveryDays.stockPoolId, dayId));
  if (stockDayId !== dayId) {
    const [source] = await db.select({ id: deliveryDays.id, date: deliveryDays.date }).from(deliveryDays).where(eq(deliveryDays.id, stockDayId)).limit(1);
    if (source) poolDays.unshift(source);
  }
  const poolDayIds = [.../* @__PURE__ */ new Set([stockDayId, ...poolDays.map((d) => d.id)])];
  const dayOrders = poolDayIds.length > 0 ? await db.select().from(orders).where(inArray(orders.deliveryDayId, poolDayIds)) : [];
  const breakdown = buildStockPaymentBreakdown(dayOrders);
  const allocations = rows.map((row) => {
    const productBreakdown = breakdown.get(row.productId) ?? { paid: 0, awaitingPayment: 0, cancelled: 0, other: 0 };
    return {
      ...row,
      paidSold: productBreakdown.paid,
      awaitingPayment: productBreakdown.awaitingPayment,
      cancelledQty: productBreakdown.cancelled,
      otherQty: productBreakdown.other
    };
  });
  return c.json({ allocations, poolSourceId: stockDayId !== dayId ? stockDayId : null, poolDays: poolDays.length > 0 ? poolDays : void 0 });
});
app4.put("/:id/stock", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: "Delivery day not found" }, 404);
  const stockDayId = day.stockPoolId ?? day.id;
  if (day.stockPoolId) {
    const [stockSource] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, stockDayId)).limit(1);
    if (!stockSource) {
      return c.json({ error: "This delivery day is linked to a missing stock pool. Unlink and relink the delivery days, then save again." }, 400);
    }
  }
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Stock allocation request was not valid JSON" }, 400);
  }
  if (!Array.isArray(body.allocations)) {
    return c.json({ error: "Stock allocation request is missing allocations" }, 400);
  }
  const now = Date.now();
  const existing = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, stockDayId));
  const soldMap = new Map(existing.map((e) => [e.productId, e.sold]));
  const productRows = await db.select({ id: products.id, name: products.name }).from(products);
  const productsById = new Map(productRows.map((p) => [p.id, p]));
  const seenProductIds = /* @__PURE__ */ new Set();
  const values = [];
  for (const raw2 of body.allocations) {
    const productId = typeof raw2.productId === "string" ? raw2.productId.trim() : "";
    const allocated = Number(raw2.allocated);
    if (!productId) return c.json({ error: "Each stock allocation needs a product" }, 400);
    if (seenProductIds.has(productId)) return c.json({ error: `Duplicate product allocation for ${productId}` }, 400);
    seenProductIds.add(productId);
    if (!Number.isFinite(allocated) || allocated < 0) {
      return c.json({ error: "Stock allocations must be zero or above" }, 400);
    }
    const product = productsById.get(productId);
    if (!product) return c.json({ error: `Product ${productId} no longer exists. Refresh products and try again.` }, 400);
    const sold = soldMap.get(productId) ?? 0;
    if (allocated < sold) {
      return c.json({ error: `Allocation for ${product.name} cannot be below ${sold} already sold.` }, 400);
    }
    if (allocated > 0) {
      const providedName = typeof raw2.productName === "string" ? raw2.productName.trim() : "";
      values.push({
        id: crypto.randomUUID(),
        deliveryDayId: stockDayId,
        productId,
        productName: providedName || product.name,
        allocated,
        sold,
        createdAt: now
      });
    }
  }
  for (const existingRow of existing) {
    if (existingRow.sold > 0 && !seenProductIds.has(existingRow.productId)) {
      return c.json({
        error: `Cannot remove ${existingRow.productName} because ${existingRow.sold} has already sold. Leave its allocation at ${existingRow.sold} or higher.`
      }, 400);
    }
  }
  const statements = [
    c.env.DB.prepare("DELETE FROM delivery_day_stock WHERE delivery_day_id = ?").bind(stockDayId),
    ...values.map((v) => c.env.DB.prepare(
      "INSERT INTO delivery_day_stock (id, delivery_day_id, product_id, product_name, allocated, sold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(v.id, v.deliveryDayId, v.productId, v.productName, v.allocated, v.sold, v.createdAt))
  ];
  try {
    await c.env.DB.batch(statements);
  } catch (error) {
    console.error("Failed to save stock allocations", { dayId, stockDayId, error });
    return c.json({ error: "Could not save stock allocations. Please try again." }, 500);
  }
  return c.json({ ok: true, saved: values.length, stockDayId });
});
app4.put("/:id/stock-pool", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const { poolSourceId } = await c.req.json();
  if (poolSourceId) {
    const [source] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, poolSourceId)).limit(1);
    if (!source) return c.json({ error: "Source day not found" }, 404);
    if (source.stockPoolId) return c.json({ error: "Cannot chain pools \u2014 source day is already linked to another pool" }, 400);
    if (poolSourceId === dayId) return c.json({ error: "Cannot link a day to itself" }, 400);
  }
  let migratedSummary;
  const [currentDay] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (poolSourceId === null && currentDay?.stockPoolId) {
    const poolRows = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, currentDay.stockPoolId));
    if (poolRows.length > 0) {
      const existingOnDay = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
      if (existingOnDay.length === 0) {
        await db.insert(deliveryDayStock).values(poolRows.map((r) => ({
          id: crypto.randomUUID(),
          deliveryDayId: dayId,
          productId: r.productId,
          productName: r.productName,
          allocated: r.allocated,
          sold: 0,
          createdAt: Date.now()
        })));
        migratedSummary = { added: [], merged: [], orphansDeleted: 0, copiedDown: poolRows.length };
      }
    }
  }
  if (poolSourceId) {
    const orphans = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
    if (orphans.length > 0) {
      const poolRows = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, poolSourceId));
      const poolByProduct = new Map(poolRows.map((r) => [r.productId, r]));
      const added = [];
      const merged = [];
      const now = Date.now();
      for (const orphan of orphans) {
        const existing = poolByProduct.get(orphan.productId);
        if (existing) {
          const newAlloc = Math.max(existing.allocated, orphan.allocated);
          const newSold = existing.sold + orphan.sold;
          if (newAlloc !== existing.allocated || newSold !== existing.sold) {
            await db.update(deliveryDayStock).set({ allocated: newAlloc, sold: newSold }).where(eq(deliveryDayStock.id, existing.id));
            merged.push(orphan.productName);
          }
        } else {
          await db.insert(deliveryDayStock).values({
            id: crypto.randomUUID(),
            deliveryDayId: poolSourceId,
            productId: orphan.productId,
            productName: orphan.productName,
            allocated: orphan.allocated,
            sold: orphan.sold,
            createdAt: now
          });
          added.push(orphan.productName);
        }
      }
      await db.delete(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
      migratedSummary = { added, merged, orphansDeleted: orphans.length };
    }
  }
  await db.update(deliveryDays).set({ stockPoolId: poolSourceId }).where(eq(deliveryDays.id, dayId));
  try {
    const user = c.get("user");
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      action: poolSourceId ? "link_stock_pool" : "unlink_stock_pool",
      entity: "delivery_days",
      entityId: dayId,
      before: JSON.stringify({}),
      after: JSON.stringify({ stockPoolId: poolSourceId, migrated: migratedSummary }),
      adminUid: user?.id ?? null,
      adminEmail: user?.email ?? null,
      timestamp: Date.now()
    });
  } catch {
  }
  return c.json({ ok: true, migrated: migratedSummary });
});
app4.post("/:id/stock/copy-from/:sourceId", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const sourceId = c.req.param("sourceId");
  const now = Date.now();
  const source = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, sourceId));
  if (source.length === 0) return c.json({ error: "No allocations to copy" }, 404);
  await db.delete(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
  const values = source.map((s) => ({
    id: crypto.randomUUID(),
    deliveryDayId: dayId,
    productId: s.productId,
    productName: s.productName,
    allocated: s.allocated,
    sold: 0,
    createdAt: now
  }));
  await db.insert(deliveryDayStock).values(values);
  return c.json({ copied: values.length });
});
app4.post("/:id/generate-post", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param("id");
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: "Day not found" }, 404);
  const allocs = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
  const dayOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const dateStr = formatBrisbaneDate(day.date, { weekday: "long", year: "numeric" });
  const zones = day.zones || "";
  const isPickup = day.type === "pickup";
  const marketLocation = day.marketLocation || "";
  const productList = allocs.length > 0 ? allocs.filter((a) => a.allocated > 0).map((a) => `${a.productName} (${a.allocated - a.sold} available)`).join(", ") : "All premium grass fed beef products";
  const spotsLeft = (day.maxOrders ?? 40) - (day.orderCount ?? 0);
  const orderUrl = "https://oconnoragriculture.com.au/shop";
  const prompt = `You are the social media manager for O'Connor Agriculture, a grass fed beef farm in Central Queensland, Australia. Write an engaging Facebook post for an upcoming ${isPickup ? "market day" : "delivery day"}.

Details:
- Date: ${dateStr}
- ${isPickup ? `Market Location: ${marketLocation}` : `Delivery Areas: ${zones}`}
- Products available: ${productList}
- ${spotsLeft} spots remaining
- Order link: ${orderUrl}
- All beef is grass fed and finished with no inputs
- Free delivery on orders over $100

Write a short, punchy Facebook post (max 150 words) that:
1. Creates urgency (limited spots)
2. Mentions the date and areas
3. Highlights 2-3 key products
4. Includes a call to action with the order link
5. Uses a friendly, rural Australian tone
6. Include 2-3 relevant emojis but don't overdo it

Do NOT use hashtags. Just the post text.`;
  try {
    const ai = c.env.AI;
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300
    });
    const postText = response.response ?? "";
    return c.json({
      postText,
      dateStr,
      zones,
      isPickup,
      marketLocation,
      products: allocs.filter((a) => a.allocated > 0).map((a) => ({ name: a.productName, available: a.allocated - a.sold })),
      spotsLeft,
      orderUrl
    });
  } catch (err) {
    console.error("AI post generation error:", err);
    const fallback = isPickup ? `\u{1F969} Market Day this ${dateStr}!

Come see us at ${marketLocation}. Fresh grass fed beef \u2014 ${productList}.

${spotsLeft} spots left. Order ahead: ${orderUrl}` : `\u{1F69A} Delivery day coming up \u2014 ${dateStr}!

We're delivering to ${zones}. Fresh grass fed beef \u2014 ${productList}.

${spotsLeft} spots remaining. Free delivery over $100!

Order now: ${orderUrl}`;
    return c.json({
      postText: fallback,
      dateStr,
      zones,
      isPickup,
      marketLocation,
      products: allocs.filter((a) => a.allocated > 0).map((a) => ({ name: a.productName, available: a.allocated - a.sold })),
      spotsLeft,
      orderUrl
    });
  }
});
var deliveryDays_default = app4;

// src/routes/stops.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
init_push();
async function alreadySent(db, orderId, type) {
  const [row] = await db.select().from(notifications).where(and(eq(notifications.orderId, orderId), eq(notifications.type, type), eq(notifications.status, "sent"))).limit(1);
  return !!row;
}
__name(alreadySent, "alreadySent");
var app5 = new Hono2();
var ACTIVE_STOP_STATUSES = ["en_route", "arrived"];
var NON_DELIVERABLE_ORDER_STATUSES = /* @__PURE__ */ new Set([
  "cancelled",
  "refunded",
  "failed",
  "pending_payment",
  "awaiting_payment",
  "delivered"
]);
function serializeStop(stop, order) {
  return {
    ...stop,
    address: parseJson(stop.address, {}),
    items: parseJson(stop.items, []),
    orderTotal: order?.total,
    orderPaymentStatus: order?.paymentStatus,
    orderPaymentProvider: order?.paymentProvider,
    orderPaymentIntentId: order?.paymentIntentId
  };
}
__name(serializeStop, "serializeStop");
async function attachOrderPaymentDetails(db, rows) {
  const orderIds = [...new Set(rows.map((s) => s.orderId).filter((id) => Boolean(id)))];
  if (orderIds.length === 0) return rows.map((s) => serializeStop(s));
  const orderRows = await db.select().from(orders).where(inArray(orders.id, orderIds));
  const byId = new Map(orderRows.map((order) => [order.id, order]));
  return rows.map((s) => serializeStop(s, s.orderId ? byId.get(s.orderId) : null));
}
__name(attachOrderPaymentDetails, "attachOrderPaymentDetails");
async function hasOtherActiveStop(db, deliveryDayId, stopId) {
  const rows = await db.select({ id: stops.id }).from(stops).where(and(
    eq(stops.deliveryDayId, deliveryDayId),
    ne(stops.id, stopId),
    inArray(stops.status, ACTIVE_STOP_STATUSES)
  )).limit(1);
  return rows.length > 0;
}
__name(hasOtherActiveStop, "hasOtherActiveStop");
async function clearOtherActiveStops(db, deliveryDayId, stopId, now = Date.now()) {
  const rows = await db.select({ id: stops.id, orderId: stops.orderId }).from(stops).where(and(
    eq(stops.deliveryDayId, deliveryDayId),
    ne(stops.id, stopId),
    inArray(stops.status, ACTIVE_STOP_STATUSES)
  ));
  if (rows.length === 0) return;
  await db.update(stops).set({ status: "pending" }).where(inArray(stops.id, rows.map((s) => s.id)));
  const orderIds = rows.map((s) => s.orderId).filter((id) => Boolean(id));
  if (orderIds.length === 0) return;
  await db.update(orders).set({ status: "confirmed", updatedAt: now }).where(and(
    inArray(orders.id, orderIds),
    eq(orders.status, "out_for_delivery")
  ));
}
__name(clearOtherActiveStops, "clearOtherActiveStops");
function isDeliverableLinkedOrder(order) {
  return !!order && order.paymentStatus === "paid" && !NON_DELIVERABLE_ORDER_STATUSES.has(order.status);
}
__name(isDeliverableLinkedOrder, "isDeliverableLinkedOrder");
async function findNextDeliverableStop(db, currentStop) {
  const candidates = await db.select().from(stops).where(and(
    eq(stops.deliveryDayId, currentStop.deliveryDayId),
    gt(stops.sequence, currentStop.sequence)
  )).orderBy(asc(stops.sequence)).limit(20);
  for (const candidate of candidates) {
    if (candidate.status !== "pending") continue;
    if (!candidate.orderId) return candidate;
    const [linkedOrder] = await db.select({
      status: orders.status,
      paymentStatus: orders.paymentStatus
    }).from(orders).where(eq(orders.id, candidate.orderId)).limit(1);
    if (isDeliverableLinkedOrder(linkedOrder)) return candidate;
  }
  return null;
}
__name(findNextDeliverableStop, "findNextDeliverableStop");
app5.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const { deliveryDayId, runId, unassigned } = c.req.query();
  if (!deliveryDayId && !runId) return c.json({ error: "deliveryDayId or runId required" }, 400);
  let condition;
  if (runId) {
    condition = eq(stops.runId, runId);
  } else if (unassigned === "true") {
    condition = and(eq(stops.deliveryDayId, deliveryDayId), isNull(stops.runId));
  } else {
    condition = eq(stops.deliveryDayId, deliveryDayId);
  }
  const rows = await db.select().from(stops).where(condition).orderBy(asc(stops.sequence));
  return c.json(await attachOrderPaymentDetails(db, rows));
});
app5.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const [stop] = await db.select().from(stops).where(eq(stops.id, c.req.param("id"))).limit(1);
  if (!stop) return c.json({ error: "Not found" }, 404);
  const [serialized] = await attachOrderPaymentDetails(db, [stop]);
  return c.json(serialized);
});
app5.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const isManual = !body.orderId || String(body.orderId).startsWith("manual");
  let runId = body.runId ?? null;
  if (!runId && body.deliveryDayId) {
    const existingRuns = await db.select({ id: deliveryRuns.id }).from(deliveryRuns).where(eq(deliveryRuns.deliveryDayId, body.deliveryDayId));
    if (existingRuns.length === 1) runId = existingRuns[0].id;
  }
  await db.insert(stops).values({
    ...body,
    runId,
    id,
    orderId: isManual ? null : body.orderId,
    customerId: isManual ? null : body.customerId,
    address: JSON.stringify(body.address ?? {}),
    items: JSON.stringify(body.items ?? []),
    createdAt: Date.now()
  });
  return c.json({ id }, 201);
});
app5.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const stopId = c.req.param("id");
  const body = await c.req.json();
  const patch = {};
  if (body.customerName !== void 0) patch.customerName = body.customerName;
  if (body.customerPhone !== void 0) patch.customerPhone = body.customerPhone;
  if (body.customerNote !== void 0) patch.customerNote = body.customerNote;
  if (body.address !== void 0) {
    patch.address = JSON.stringify(body.address);
    patch.lat = null;
    patch.lng = null;
  }
  if (Object.keys(patch).length === 0) return c.json({ ok: true });
  await db.update(stops).set(patch).where(eq(stops.id, stopId));
  return c.json({ ok: true });
});
app5.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  await db.delete(stops).where(eq(stops.id, c.req.param("id")));
  return c.json({ ok: true });
});
app5.patch("/:id/status", async (c) => {
  const db = drizzle(c.env.DB);
  const { status, driverNote, flagReason, proofUrl } = await c.req.json();
  const stopId = c.req.param("id");
  const now = Date.now();
  const [priorStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);
  if (!priorStop) return c.json({ error: "Not found" }, 404);
  const wasTerminal = priorStop?.status === "delivered" || priorStop?.status === "failed";
  const isTerminal = status === "delivered" || status === "failed";
  const isUndo = wasTerminal && !isTerminal;
  if ((status === "en_route" || status === "arrived" || status === "delivered") && priorStop.orderId) {
    const [linkedOrder] = await db.select({ paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.id, priorStop.orderId)).limit(1);
    if (linkedOrder?.paymentStatus !== "paid") {
      return c.json({ error: "Payment must be marked paid before this delivery can continue." }, 409);
    }
  }
  const patch = { status };
  if (driverNote !== void 0) patch.driverNote = driverNote;
  if (flagReason !== void 0) patch.flagReason = flagReason;
  if (proofUrl !== void 0) patch.proofUrl = proofUrl;
  if (isTerminal) patch.completedAt = now;
  if (isUndo) {
    patch.completedAt = null;
    if (priorStop?.status === "delivered") patch.proofUrl = null;
  }
  if ((status === "en_route" || status === "arrived") && priorStop) {
    await clearOtherActiveStops(db, priorStop.deliveryDayId, priorStop.id, now);
  }
  await db.update(stops).set(patch).where(eq(stops.id, stopId));
  const [currentStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);
  if (status === "delivered" && currentStop) {
    if (currentStop.orderId) {
      await db.update(orders).set({ status: "delivered", proofUrl: proofUrl ?? null, updatedAt: now }).where(eq(orders.id, currentStop.orderId));
    }
    if (proofUrl && currentStop.customerPhone && currentStop.orderId && !await alreadySent(db, currentStop.orderId, "delivered_with_photo")) {
      const storefrontUrl = c.env.STOREFRONT_URL || "https://oconnoragriculture.com.au";
      const trackingUrl = `${storefrontUrl}/track/${currentStop.orderId}`;
      const firstName = (currentStop.customerName ?? "").trim().split(/\s+/)[0] || "there";
      const smsBody = `Hi ${firstName}, your O'Connor Agriculture delivery has arrived. Proof photo: ${trackingUrl}`;
      const result = await sendSms(c.env, currentStop.customerPhone, smsBody);
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        orderId: currentStop.orderId,
        customerId: currentStop.customerId,
        type: "delivered_with_photo",
        status: result.ok ? "sent" : "failed",
        recipientEmail: currentStop.customerPhone,
        // table field is misnamed; stores whatever channel identifier was used
        resendId: result.messageId ?? null,
        error: result.error ?? null,
        sentAt: now
      });
    }
  }
  if (isUndo && priorStop?.status === "delivered" && currentStop?.orderId) {
    await db.update(orders).set({ status: "out_for_delivery", proofUrl: null, updatedAt: now }).where(eq(orders.id, currentStop.orderId));
  }
  if ((status === "delivered" || status === "failed") && currentStop) {
    const hasActiveStop = await hasOtherActiveStop(db, currentStop.deliveryDayId, currentStop.id);
    if (hasActiveStop) return c.json({ ok: true });
    const nextStop = await findNextDeliverableStop(db, currentStop);
    if (nextStop) {
      await db.update(stops).set({ status: "en_route" }).where(eq(stops.id, nextStop.id));
      if (nextStop.orderId) {
        await db.update(orders).set({ status: "out_for_delivery", updatedAt: now }).where(eq(orders.id, nextStop.orderId));
      }
      const storefrontUrl = c.env.STOREFRONT_URL || "https://oconnoragriculture.com.au";
      const trackingUrl = nextStop.orderId ? `${storefrontUrl}/track/${nextStop.orderId}` : storefrontUrl;
      if (nextStop.customerId) {
        try {
          await notifyCustomer(db, nextStop.customerId, {
            title: "O'Connor Agriculture \u2014 Driver On The Way",
            body: "Your delivery is next! Track your driver live.",
            url: trackingUrl
          }, c.env);
        } catch {
        }
      }
      if (nextStop.customerPhone && nextStop.orderId && !await alreadySent(db, nextStop.orderId, "sms_pre_alert")) {
        const firstName = (nextStop.customerName ?? "").trim().split(/\s+/)[0] || "there";
        const smsBody = `Hi ${firstName}, your O'Connor Agriculture delivery is next \u2014 the driver is on the way. Track: ${trackingUrl}`;
        const result = await sendSms(c.env, nextStop.customerPhone, smsBody);
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          orderId: nextStop.orderId,
          customerId: nextStop.customerId,
          type: "sms_pre_alert",
          status: result.ok ? "sent" : "failed",
          recipientEmail: nextStop.customerPhone,
          resendId: result.messageId ?? null,
          error: result.error ?? null,
          sentAt: now
        });
      }
    }
  }
  return c.json({ ok: true });
});
app5.patch("/:id/sequence", async (c) => {
  const db = drizzle(c.env.DB);
  const { sequence, estimatedArrival } = await c.req.json();
  const patch = { sequence };
  if (estimatedArrival !== void 0) patch.estimatedArrival = estimatedArrival;
  await db.update(stops).set(patch).where(eq(stops.id, c.req.param("id")));
  return c.json({ ok: true });
});
app5.patch("/:id/run", async (c) => {
  const db = drizzle(c.env.DB);
  const { runId } = await c.req.json();
  await db.update(stops).set({ runId: runId ?? null }).where(eq(stops.id, c.req.param("id")));
  return c.json({ ok: true });
});
var stops_default = app5;

// src/routes/customers.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
var app6 = new Hono2();
app6.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
  return c.json(rows.map((c2) => ({ ...c2, addresses: JSON.parse(c2.addresses) })));
});
app6.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customers).where(eq(customers.id, c.req.param("id"))).limit(1);
  if (!customer) return c.json({ error: "Not found" }, 404);
  return c.json({ ...customer, addresses: JSON.parse(customer.addresses) });
});
app6.get("/:id/orders", async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(orders).where(eq(orders.customerId, c.req.param("id"))).orderBy(desc(orders.createdAt));
  return c.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items), deliveryAddress: JSON.parse(o.deliveryAddress) })));
});
app6.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(customers).values({
    ...body,
    id,
    addresses: JSON.stringify(body.addresses ?? []),
    createdAt: now,
    updatedAt: now
  });
  return c.json({ id }, 201);
});
app6.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const patch = { ...body, updatedAt: Date.now() };
  if (body.addresses) patch.addresses = JSON.stringify(body.addresses);
  await db.update(customers).set(patch).where(eq(customers.id, c.req.param("id")));
  return c.json({ ok: true });
});
app6.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param("id");
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.customerId, id));
  await db.delete(subscriptions).where(eq(subscriptions.customerId, id));
  await db.delete(stops).where(eq(stops.customerId, id));
  await db.delete(orders).where(eq(orders.customerId, id));
  await db.delete(customers).where(eq(customers.id, id));
  return c.json({ ok: true });
});
var customers_default = app6;

// src/routes/users.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
var app7 = new Hono2();
app7.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(users);
  return c.json(rows);
});
app7.get("/drivers", async (c) => {
  const db = drizzle(c.env.DB);
  const { or: or2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const rows = await db.select().from(users).where(or2(eq(users.role, "driver"), eq(users.canDrive, true)));
  return c.json(rows);
});
app7.get("/me", async (c) => {
  const user = c.get("user");
  const db = drizzle(c.env.DB);
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});
app7.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const caller = c.get("user");
  if (caller.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const now = Date.now();
  await db.insert(users).values({
    id: body.id,
    email: body.email,
    name: body.name,
    role: body.role,
    active: body.active ?? true,
    phone: body.phone ?? null,
    address: body.address ?? null,
    vehicleInfo: body.vehicleInfo ?? null,
    registrationNumber: body.registrationNumber ?? null,
    licenseNumber: body.licenseNumber ?? null,
    nextOfKin: body.nextOfKin ?? null,
    zones: body.zones ?? "[]",
    startAddress: body.startAddress ?? null,
    createdAt: now,
    updatedAt: now
  });
  return c.json({ id: body.id }, 201);
});
app7.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const caller = c.get("user");
  if (caller.role !== "admin" && caller.id !== c.req.param("id")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = await c.req.json();
  await db.update(users).set({ ...body, updatedAt: Date.now() }).where(eq(users.id, c.req.param("id")));
  return c.json({ ok: true });
});
app7.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const caller = c.get("user");
  if (caller.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  const id = c.req.param("id");
  if (id === caller.id) return c.json({ error: "Cannot delete yourself" }, 400);
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return c.json({ error: "Not found" }, 404);
  await db.delete(driverSessions).where(eq(driverSessions.driverUid, id));
  await db.update(deliveryRuns).set({ driverUid: null }).where(eq(deliveryRuns.driverUid, id));
  await db.update(deliveryDays).set({ driverUid: null }).where(eq(deliveryDays.driverUid, id));
  await db.delete(users).where(eq(users.id, id));
  return c.json({ ok: true });
});
app7.post("/lookup", async (c) => {
  const caller = c.get("user");
  if (caller.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "Email required" }, 400);
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address[]=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}` } }
  );
  if (!res.ok) return c.json({ error: "Clerk lookup failed" }, 500);
  const found = await res.json();
  if (!found.length) {
    return c.json({ error: "No Clerk account found for this email. They must sign up at the storefront first." }, 404);
  }
  const u = found[0];
  return c.json({
    clerkId: u.id,
    email: u.email_addresses?.[0]?.email_address ?? email,
    name: [u.first_name, u.last_name].filter(Boolean).join(" ") || email
  });
});
var users_default = app7;

// src/routes/drivers.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
init_email();
var app8 = new Hono2();
app8.get("/active", async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(driverSessions).where(eq(driverSessions.active, true));
  return c.json(rows.map((s) => ({ ...s, breadcrumb: parseJson(s.breadcrumb, []) })));
});
app8.post("/session", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const { deliveryDayId, totalStops } = await c.req.json();
  const now = Date.now();
  const [existing] = await db.select().from(driverSessions).where(and(
    eq(driverSessions.driverUid, user.id),
    eq(driverSessions.deliveryDayId, deliveryDayId),
    eq(driverSessions.active, true)
  )).limit(1);
  if (existing) {
    return c.json({ id: existing.id, reused: true }, 200);
  }
  const id = crypto.randomUUID();
  await db.insert(driverSessions).values({
    id,
    driverUid: user.id,
    driverName: user.email,
    deliveryDayId,
    active: true,
    startedAt: now,
    lastUpdated: now,
    totalStops
  });
  return c.json({ id }, 201);
});
app8.patch("/session/:id/ping", async (c) => {
  const db = drizzle(c.env.DB);
  const { lat, lng } = await c.req.json();
  const now = Date.now();
  const sessionId = c.req.param("id");
  const [session] = await db.select().from(driverSessions).where(eq(driverSessions.id, sessionId)).limit(1);
  if (!session) return c.json({ error: "Not found" }, 404);
  const breadcrumb = parseJson(session.breadcrumb, []);
  breadcrumb.push({ lat, lng, ts: now });
  if (breadcrumb.length > 500) breadcrumb.shift();
  await db.update(driverSessions).set({
    lastLat: lat,
    lastLng: lng,
    lastUpdated: now,
    breadcrumb: JSON.stringify(breadcrumb)
  }).where(eq(driverSessions.id, sessionId));
  return c.json({ ok: true });
});
app8.patch("/session/:id/complete", async (c) => {
  const db = drizzle(c.env.DB);
  await db.update(driverSessions).set({
    active: false,
    completedAt: Date.now()
  }).where(eq(driverSessions.id, c.req.param("id")));
  return c.json({ ok: true });
});
app8.post("/invite", async (c) => {
  const { name: name2, email } = await c.req.json();
  if (!name2 || !email) return c.json({ error: "name and email required" }, 400);
  const appUrl = c.env.DRIVER_APP_URL ?? "https://driver.oconnoragriculture.com.au";
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1B3A2E;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">O'Connor Agriculture</h1>
    <p style="color:#a3ce8f;margin:4px 0 0;font-size:14px">Driver App Access</p>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
    <p>Hi ${name2},</p>
    <p>You've been added as a driver for O'Connor Agriculture. Use the button below to access the driver app on your phone.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${appUrl}" style="background:#1B3A2E;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;display:inline-block;font-size:16px;font-weight:bold">Open Driver App</a>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:0 0 10px;font-weight:bold;font-size:14px">\u{1F4F1} Install on your phone for best experience:</p>
      <p style="margin:0 0 8px;font-size:13px"><strong>iPhone (Safari):</strong> Open the link \u2192 tap the Share button \u2192 tap <em>Add to Home Screen</em></p>
      <p style="margin:0;font-size:13px"><strong>Android (Chrome):</strong> Open the link \u2192 tap the menu (\u22EE) \u2192 tap <em>Add to Home Screen</em> or accept the install prompt</p>
    </div>
    <p style="font-size:13px;color:#666">Once installed, you'll see the app icon on your home screen and it'll work just like a native app \u2014 even offline.</p>
    <p style="font-size:13px;color:#666">Sign in with this email address: <strong>${email}</strong></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#999">O'Connor Agriculture \u2014 If you weren't expecting this, please ignore this email.</p>
  </div>
</body>
</html>`;
  const result = await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL,
    to: email,
    subject: `You're invited to the O'Connor Driver App`,
    html
  });
  if (!result) return c.json({ error: "Failed to send email" }, 500);
  return c.json({ ok: true });
});
var drivers_default = app8;

// src/routes/driverRescue.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
var app9 = new Hono2();
var ACTIVE_STOP_STATUSES2 = ["en_route", "arrived"];
var NON_DELIVERABLE_ORDER_STATUSES2 = /* @__PURE__ */ new Set([
  "cancelled",
  "refunded",
  "failed",
  "pending_payment",
  "awaiting_payment",
  "delivered"
]);
function rescuePin(c) {
  return c.req.header("X-Driver-Rescue-Pin") ?? c.req.query("pin") ?? "";
}
__name(rescuePin, "rescuePin");
function unauthorized(c) {
  const res = c.json({ error: "Unauthorized" }, 401);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
__name(unauthorized, "unauthorized");
function requireRescuePin(c) {
  const expected = c.env.DRIVER_RESCUE_PIN;
  return !!expected && rescuePin(c) === expected;
}
__name(requireRescuePin, "requireRescuePin");
function serializeStop2(stop, order) {
  return {
    ...stop,
    address: parseJson(stop.address, {}),
    items: parseJson(stop.items, []),
    orderTotal: order?.total,
    orderPaymentStatus: order?.paymentStatus,
    orderPaymentProvider: order?.paymentProvider,
    orderPaymentIntentId: order?.paymentIntentId
  };
}
__name(serializeStop2, "serializeStop");
async function attachOrderPaymentDetails2(db, rows) {
  const orderIds = [...new Set(rows.map((s) => s.orderId).filter((id) => Boolean(id)))];
  if (orderIds.length === 0) return rows.map((s) => serializeStop2(s));
  const orderRows = await db.select().from(orders).where(inArray(orders.id, orderIds));
  const byId = new Map(orderRows.map((order) => [order.id, order]));
  return rows.map((s) => serializeStop2(s, s.orderId ? byId.get(s.orderId) : null));
}
__name(attachOrderPaymentDetails2, "attachOrderPaymentDetails");
async function hasOtherActiveStop2(db, deliveryDayId, stopId) {
  const rows = await db.select({ id: stops.id }).from(stops).where(and(
    eq(stops.deliveryDayId, deliveryDayId),
    ne(stops.id, stopId),
    inArray(stops.status, ACTIVE_STOP_STATUSES2)
  )).limit(1);
  return rows.length > 0;
}
__name(hasOtherActiveStop2, "hasOtherActiveStop");
async function clearOtherActiveStops2(db, deliveryDayId, stopId, now = Date.now()) {
  const rows = await db.select({ id: stops.id, orderId: stops.orderId }).from(stops).where(and(
    eq(stops.deliveryDayId, deliveryDayId),
    ne(stops.id, stopId),
    inArray(stops.status, ACTIVE_STOP_STATUSES2)
  ));
  if (rows.length === 0) return;
  await db.update(stops).set({ status: "pending" }).where(inArray(stops.id, rows.map((s) => s.id)));
  const orderIds = rows.map((s) => s.orderId).filter((id) => Boolean(id));
  if (orderIds.length === 0) return;
  await db.update(orders).set({ status: "confirmed", updatedAt: now }).where(and(
    inArray(orders.id, orderIds),
    eq(orders.status, "out_for_delivery")
  ));
}
__name(clearOtherActiveStops2, "clearOtherActiveStops");
function isDeliverableLinkedOrder2(order) {
  return !!order && order.paymentStatus === "paid" && !NON_DELIVERABLE_ORDER_STATUSES2.has(order.status);
}
__name(isDeliverableLinkedOrder2, "isDeliverableLinkedOrder");
async function findNextDeliverableStop2(db, currentStop) {
  const candidates = await db.select().from(stops).where(and(
    eq(stops.deliveryDayId, currentStop.deliveryDayId),
    gt(stops.sequence, currentStop.sequence)
  )).orderBy(asc(stops.sequence)).limit(20);
  for (const candidate of candidates) {
    if (candidate.status !== "pending") continue;
    if (!candidate.orderId) return candidate;
    const [linkedOrder] = await db.select({
      status: orders.status,
      paymentStatus: orders.paymentStatus
    }).from(orders).where(eq(orders.id, candidate.orderId)).limit(1);
    if (isDeliverableLinkedOrder2(linkedOrder)) return candidate;
  }
  return null;
}
__name(findNextDeliverableStop2, "findNextDeliverableStop");
async function findTodayDeliveryDay(db) {
  const now = Date.now();
  const from = now - 20 * 60 * 60 * 1e3;
  const to = now + 30 * 60 * 60 * 1e3;
  const days = await db.select().from(deliveryDays).where(and(
    eq(deliveryDays.active, true),
    eq(deliveryDays.type, "delivery"),
    gte(deliveryDays.date, from),
    lte(deliveryDays.date, to)
  )).orderBy(asc(deliveryDays.date));
  return days.sort((a, b) => Math.abs(a.date - now) - Math.abs(b.date - now))[0] ?? null;
}
__name(findTodayDeliveryDay, "findTodayDeliveryDay");
app9.get("/today", async (c) => {
  if (!requireRescuePin(c)) return unauthorized(c);
  const db = drizzle(c.env.DB);
  const day = await findTodayDeliveryDay(db);
  if (!day) return c.json({ deliveryDay: null, stops: [] }, 404);
  const rows = await db.select().from(stops).where(eq(stops.deliveryDayId, day.id)).orderBy(asc(stops.sequence));
  const res = c.json({ deliveryDay: day, stops: await attachOrderPaymentDetails2(db, rows) });
  res.headers.set("Cache-Control", "no-store");
  return res;
});
app9.post("/sms-access", async (c) => {
  if (!requireRescuePin(c)) return unauthorized(c);
  const db = drizzle(c.env.DB);
  let body = {};
  try {
    body = await c.req.json();
  } catch {
  }
  const [seamus] = await db.select().from(users).where(eq(users.email, "oconnoragriculture@gmail.com")).limit(1);
  const to = body.phone ?? seamus?.phone ?? "";
  const pin = c.env.DRIVER_RESCUE_PIN ?? "";
  const appUrl = c.env.DRIVER_APP_URL ?? "https://driver.oconnoragriculture.com.au";
  const message = body.message ?? `O'Connor Agriculture driver app access: open ${appUrl}/login, use Emergency driver access PIN ${pin}, then tap Open. This bypasses Google sign-in while we fix it.`;
  const result = await sendSms(c.env, to, message);
  const res = c.json(result.ok ? { ok: true, messageId: result.messageId } : { ok: false, error: result.error }, result.ok ? 200 : 502);
  res.headers.set("Cache-Control", "no-store");
  return res;
});
app9.get("/stops/:id", async (c) => {
  if (!requireRescuePin(c)) return unauthorized(c);
  const db = drizzle(c.env.DB);
  const [stop] = await db.select().from(stops).where(eq(stops.id, c.req.param("id"))).limit(1);
  if (!stop) return c.json({ error: "Not found" }, 404);
  const [serialized] = await attachOrderPaymentDetails2(db, [stop]);
  const res = c.json(serialized);
  res.headers.set("Cache-Control", "no-store");
  return res;
});
app9.patch("/stops/:id/status", async (c) => {
  if (!requireRescuePin(c)) return unauthorized(c);
  const db = drizzle(c.env.DB);
  const stopId = c.req.param("id");
  const { status, driverNote, flagReason, proofUrl } = await c.req.json();
  const now = Date.now();
  const [priorStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);
  if (!priorStop) return c.json({ error: "Not found" }, 404);
  const wasTerminal = priorStop.status === "delivered" || priorStop.status === "failed";
  const isTerminal = status === "delivered" || status === "failed";
  const isUndo = wasTerminal && !isTerminal;
  if ((status === "en_route" || status === "arrived" || status === "delivered") && priorStop.orderId) {
    const [linkedOrder] = await db.select({ paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.id, priorStop.orderId)).limit(1);
    if (linkedOrder?.paymentStatus !== "paid") {
      const res2 = c.json({ error: "Payment must be marked paid before this delivery can continue." }, 409);
      res2.headers.set("Cache-Control", "no-store");
      return res2;
    }
  }
  const patch = { status };
  if (driverNote !== void 0) patch.driverNote = driverNote;
  if (flagReason !== void 0) patch.flagReason = flagReason;
  if (proofUrl !== void 0) patch.proofUrl = proofUrl;
  if (isTerminal) patch.completedAt = now;
  if (isUndo) {
    patch.completedAt = null;
    if (priorStop.status === "delivered") patch.proofUrl = null;
  }
  if (status === "en_route" || status === "arrived") {
    await clearOtherActiveStops2(db, priorStop.deliveryDayId, priorStop.id, now);
  }
  await db.update(stops).set(patch).where(eq(stops.id, stopId));
  const [currentStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);
  if (status === "delivered" && currentStop?.orderId) {
    await db.update(orders).set({ status: "delivered", proofUrl: proofUrl ?? null, updatedAt: now }).where(eq(orders.id, currentStop.orderId));
  }
  if (isUndo && priorStop.status === "delivered" && currentStop?.orderId) {
    await db.update(orders).set({ status: "out_for_delivery", proofUrl: null, updatedAt: now }).where(eq(orders.id, currentStop.orderId));
  }
  if ((status === "delivered" || status === "failed") && currentStop) {
    const hasActiveStop = await hasOtherActiveStop2(db, currentStop.deliveryDayId, currentStop.id);
    if (hasActiveStop) {
      const res2 = c.json({ ok: true });
      res2.headers.set("Cache-Control", "no-store");
      return res2;
    }
    const nextStop = await findNextDeliverableStop2(db, currentStop);
    if (nextStop) {
      await db.update(stops).set({ status: "en_route" }).where(eq(stops.id, nextStop.id));
      if (nextStop.orderId) {
        await db.update(orders).set({ status: "out_for_delivery", updatedAt: now }).where(eq(orders.id, nextStop.orderId));
      }
    }
  }
  const res = c.json({ ok: true });
  res.headers.set("Cache-Control", "no-store");
  return res;
});
var driverRescue_default = app9;

// src/routes/adminRescue.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
var app10 = new Hono2();
function rescuePin2(c) {
  return c.req.header("X-Staff-Rescue-Pin") ?? "";
}
__name(rescuePin2, "rescuePin");
function unauthorized2(c) {
  const res = c.json({ error: "Unauthorized" }, 401);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
__name(unauthorized2, "unauthorized");
function requireStaffRescuePin(c) {
  const expected = c.env.STAFF_RESCUE_PIN;
  return !!expected && rescuePin2(c) === expected;
}
__name(requireStaffRescuePin, "requireStaffRescuePin");
async function createClerkSignInToken(env, userId, expiresInSeconds) {
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      user_id: userId,
      expires_in_seconds: expiresInSeconds
    })
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Clerk sign-in token failed: ${JSON.stringify(data.errors ?? data).slice(0, 500)}`);
  }
  return data;
}
__name(createClerkSignInToken, "createClerkSignInToken");
app10.post("/sign-in-link", async (c) => {
  if (!requireStaffRescuePin(c)) return unauthorized2(c);
  let body = {};
  try {
    body = await c.req.json();
  } catch {
  }
  const email = (body.email ?? "oconnoragriculture@gmail.com").trim().toLowerCase();
  const db = drizzle(c.env.DB);
  const [staff] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (!staff?.active) return c.json({ error: "Active staff user not found" }, 404);
  const expiresInSeconds = Math.max(60, Math.min(body.expiresInSeconds ?? 20 * 60, 60 * 60));
  const token = await createClerkSignInToken(c.env, staff.id, expiresInSeconds);
  const signInToken = token.token;
  if (!signInToken) throw new Error("Clerk sign-in token response did not include a token");
  const adminUrl = c.env.ADMIN_APP_URL ?? "https://admin.oconnoragriculture.com.au";
  const link = `${adminUrl}/ticket?token=${encodeURIComponent(signInToken)}`;
  let sms = null;
  if (body.sendSms !== false) {
    const to = body.phone ?? staff.phone ?? "";
    sms = await sendSms(c.env, to, `O'Connor admin access link: ${link} This one-time link expires in ${Math.round(expiresInSeconds / 60)} minutes.`);
  }
  const res = c.json({
    ok: true,
    email: staff.email,
    link,
    clerkUrl: token.url,
    sms: sms ? { ok: sms.ok, messageId: sms.messageId, error: sms.error } : null,
    expiresInSeconds
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
});
app10.post("/session", async (c) => {
  if (!requireStaffRescuePin(c)) return unauthorized2(c);
  const db = drizzle(c.env.DB);
  const [staff] = await db.select().from(users).where(sql`lower(${users.email}) = 'oconnoragriculture@gmail.com'`).limit(1);
  if (!staff?.active) return c.json({ error: "Active staff user not found" }, 404);
  const res = c.json({
    ok: true,
    user: {
      email: staff.email,
      name: staff.name,
      role: staff.role
    }
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
});
app10.post("/sms", async (c) => {
  if (!requireStaffRescuePin(c)) return unauthorized2(c);
  let body = {};
  try {
    body = await c.req.json();
  } catch {
  }
  const message = (body.message ?? "").trim();
  if (!message) return c.json({ error: "Message is required" }, 400);
  const db = drizzle(c.env.DB);
  const [staff] = await db.select().from(users).where(sql`lower(${users.email}) = 'oconnoragriculture@gmail.com'`).limit(1);
  const to = body.phone ?? staff?.phone ?? "";
  const sms = await sendSms(c.env, to, message);
  const res = c.json(sms.ok ? { ok: true, messageId: sms.messageId } : { ok: false, error: sms.error }, sms.ok ? 200 : 502);
  res.headers.set("Cache-Control", "no-store");
  return res;
});
var adminRescue_default = app10;

// src/routes/deliveryRuns.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
var app11 = new Hono2();
app11.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.query("deliveryDayId");
  if (!dayId) return c.json({ error: "deliveryDayId required" }, 400);
  const runs = await db.select().from(deliveryRuns).where(eq(deliveryRuns.deliveryDayId, dayId)).orderBy(deliveryRuns.sequence);
  const driverIds = runs.map((r) => r.driverUid).filter(Boolean);
  const drivers = driverIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, driverIds)).all() : [];
  const allStops = await db.select({ id: stops.id, runId: stops.runId, status: stops.status }).from(stops).where(eq(stops.deliveryDayId, dayId));
  return c.json(runs.map((r) => {
    const driver = drivers.find((d) => d.id === r.driverUid) ?? null;
    const runStops = allStops.filter((s) => s.runId === r.id);
    return {
      ...r,
      driver,
      stopCount: runStops.length,
      completedCount: runStops.filter((s) => s.status === "delivered").length
    };
  }));
});
app11.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const { deliveryDayId, name: name2, zone, color, driverUid, notes } = body;
  if (!deliveryDayId || !name2) return c.json({ error: "deliveryDayId and name required" }, 400);
  const existing = await db.select({ id: deliveryRuns.id }).from(deliveryRuns).where(eq(deliveryRuns.deliveryDayId, deliveryDayId));
  const id = crypto.randomUUID();
  await db.insert(deliveryRuns).values({
    id,
    deliveryDayId,
    name: name2,
    zone: zone ?? null,
    color: color ?? "#1B3A2E",
    driverUid: driverUid ?? null,
    status: "pending",
    sequence: existing.length,
    notes: notes ?? null,
    createdAt: Date.now()
  });
  return c.json({ id }, 201);
});
app11.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const runId = c.req.param("id");
  const body = await c.req.json();
  await db.update(deliveryRuns).set({
    ...body.name !== void 0 && { name: body.name },
    ...body.zone !== void 0 && { zone: body.zone },
    ...body.color !== void 0 && { color: body.color },
    ...body.driverUid !== void 0 && { driverUid: body.driverUid },
    ...body.status !== void 0 && { status: body.status },
    ...body.notes !== void 0 && { notes: body.notes },
    ...body.sequence !== void 0 && { sequence: body.sequence }
  }).where(eq(deliveryRuns.id, runId));
  return c.json({ ok: true });
});
app11.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const runId = c.req.param("id");
  await db.update(stops).set({ runId: null }).where(eq(stops.runId, runId));
  await db.delete(deliveryRuns).where(eq(deliveryRuns.id, runId));
  return c.json({ ok: true });
});
app11.patch("/:id/assign-stop", async (c) => {
  const db = drizzle(c.env.DB);
  const runId = c.req.param("id");
  const { stopId } = await c.req.json();
  await db.update(stops).set({ runId }).where(eq(stops.id, stopId));
  return c.json({ ok: true });
});
app11.post("/:id/auto-assign", async (c) => {
  const db = drizzle(c.env.DB);
  const runId = c.req.param("id");
  const [run] = await db.select().from(deliveryRuns).where(eq(deliveryRuns.id, runId)).limit(1);
  if (!run) return c.json({ error: "Run not found" }, 404);
  const { postcodes } = await c.req.json();
  if (!postcodes?.length) return c.json({ error: "postcodes array required" }, 400);
  const dayStops = await db.select().from(stops).where(and(eq(stops.deliveryDayId, run.deliveryDayId), isNull(stops.runId)));
  let assigned = 0;
  for (const stop of dayStops) {
    const addr = JSON.parse(stop.address);
    if (postcodes.some((pc) => addr.postcode?.startsWith(pc))) {
      await db.update(stops).set({ runId }).where(eq(stops.id, stop.id));
      assigned++;
    }
  }
  return c.json({ assigned });
});
app11.get("/my-run", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const dayId = c.req.query("deliveryDayId");
  if (!dayId) return c.json({ error: "deliveryDayId required" }, 400);
  const [run] = await db.select().from(deliveryRuns).where(and(eq(deliveryRuns.deliveryDayId, dayId), eq(deliveryRuns.driverUid, user.id))).limit(1);
  return c.json(run ?? null);
});
var deliveryRuns_default = app11;

// src/routes/stripe.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
init_email();
init_time();
init_stock();
var app12 = new Hono2();
var STRIPE_TIMESTAMP_TOLERANCE_S = 300;
async function verifyStripeSignature(payload, sigHeader, secret) {
  const pairs = sigHeader.split(",");
  let timestamp = "";
  const signatures = [];
  for (const pair of pairs) {
    const [k, v] = pair.split("=");
    if (k === "t") timestamp = v;
    if (k === "v1") signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) throw new Error("Invalid signature header");
  const tsSec = Number(timestamp);
  if (!Number.isFinite(tsSec)) throw new Error("Invalid signature timestamp");
  const nowSec = Math.floor(Date.now() / 1e3);
  if (Math.abs(nowSec - tsSec) > STRIPE_TIMESTAMP_TOLERANCE_S) {
    throw new Error("Stripe webhook timestamp outside tolerance window");
  }
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (!signatures.includes(computed)) throw new Error("Signature mismatch");
  return JSON.parse(payload);
}
__name(verifyStripeSignature, "verifyStripeSignature");
app12.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const sig = c.req.header("stripe-signature") ?? "";
  let event;
  try {
    event = await verifyStripeSignature(rawBody, sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }
  const db = drizzle(c.env.DB);
  if (event.id) {
    try {
      await db.insert(processedWebhooks).values({
        id: event.id,
        source: "stripe",
        receivedAt: Date.now()
      });
    } catch {
      return c.json({ ok: true, duplicate: true });
    }
  }
  const obj = event.data.object;
  if (event.type === "payment_intent.succeeded") {
    const orderId = obj.metadata?.orderId;
    if (orderId) {
      const now = Date.now();
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      await db.update(orders).set({ paymentStatus: "paid", status: "confirmed", updatedAt: now }).where(eq(orders.id, orderId));
      if (order) {
        const items = parseJson(order.items, []);
        await deductStock(db, items, orderId, now);
        const addrParsed = parseJson(order.deliveryAddress, {});
        const addr = `${addrParsed.line1 ?? ""}${addrParsed.line2 ? ", " + addrParsed.line2 : ""}, ${addrParsed.suburb ?? ""} ${addrParsed.state ?? ""} ${addrParsed.postcode ?? ""}`;
        const emailData = {
          customerName: order.customerName,
          orderId,
          orderItems: items,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          gst: order.gst,
          total: order.total,
          deliveryDate: formatBrisbaneShortDate(order.createdAt, { year: true }),
          deliveryAddress: addr,
          trackingUrl: `${c.env.STOREFRONT_URL}/track/${orderId}`
        };
        const result = await sendEmail({
          apiKey: c.env.RESEND_API_KEY,
          from: c.env.FROM_EMAIL,
          to: order.customerEmail,
          subject: getSubject("order_confirmation", emailData),
          html: buildOrderEmail("order_confirmation", emailData)
        });
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          orderId,
          customerId: order.customerId,
          type: "order_confirmation",
          status: result ? "sent" : "failed",
          recipientEmail: order.customerEmail,
          resendId: result?.id ?? null,
          sentAt: now
        });
      }
    }
  }
  if (event.type === "payment_intent.payment_failed") {
    const orderId = obj.metadata?.orderId;
    if (orderId) {
      await db.update(orders).set({ paymentStatus: "failed", status: "cancelled", updatedAt: Date.now() }).where(eq(orders.id, orderId));
    }
  }
  if (event.type === "charge.refunded") {
    const orderId = obj.metadata?.orderId;
    if (orderId) {
      const now = Date.now();
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      await db.update(orders).set({ paymentStatus: "refunded", status: "refunded", updatedAt: now }).where(eq(orders.id, orderId));
      if (order) {
        const items = parseJson(order.items, []);
        await restoreStock(db, items, orderId, now);
      }
    }
  }
  return c.json({ received: true });
});
var stripe_default = app12;

// src/routes/stock.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
var app13 = new Hono2();
app13.get("/movements", async (c) => {
  const db = drizzle(c.env.DB);
  const { productId, limit: limitParam } = c.req.query();
  const limitVal = Math.min(parseInt(limitParam ?? "100", 10), 500);
  let rows;
  if (productId) {
    rows = await db.select().from(stockMovements).where(eq(stockMovements.productId, productId)).orderBy(desc(stockMovements.createdAt)).limit(limitVal);
  } else {
    rows = await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(limitVal);
  }
  return c.json(rows);
});
app13.post("/adjust", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const body = await c.req.json();
  const { productId, delta, reason, type = "adjustment" } = body;
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return c.json({ error: "Product not found" }, 404);
  const newStock = Math.max(0, product.stockOnHand + delta);
  const now = Date.now();
  await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, productId));
  await db.insert(stockMovements).values({
    id: crypto.randomUUID(),
    productId,
    productName: product.name,
    type,
    qty: delta,
    unit: product.isMeatPack ? "units" : "kg",
    reason: reason ?? null,
    orderId: null,
    supplierId: null,
    stocktakeSessionId: null,
    createdBy: user.email,
    createdAt: now
  });
  return c.json({ ok: true, stockOnHand: newStock });
});
var stock_default = app13;

// src/index.ts
init_subscriptions2();
init_push();

// src/routes/reports.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
init_auth();
var app15 = new Hono2();
app15.use("*", requireRole("admin"));
app15.get("/revenue", async (c) => {
  const db = drizzle(c.env.DB);
  const period = c.req.query("period") ?? "weekly";
  const now = Date.now();
  let fromTs = Number(c.req.query("from") || 0);
  let toTs = Number(c.req.query("to") || now);
  if (!c.req.query("from")) {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    switch (period) {
      case "weekly":
        d.setDate(d.getDate() - 12 * 7);
        break;
      case "fortnightly":
        d.setDate(d.getDate() - 12 * 14);
        break;
      case "monthly":
        d.setMonth(d.getMonth() - 12);
        break;
      case "yearly":
        d.setFullYear(d.getFullYear() - 5);
        break;
    }
    fromTs = d.getTime();
  }
  const rows = await db.select({
    id: orders.id,
    total: orders.total,
    subtotal: orders.subtotal,
    deliveryFee: orders.deliveryFee,
    gst: orders.gst,
    status: orders.status,
    items: orders.items,
    createdAt: orders.createdAt
  }).from(orders).where(and(gte(orders.createdAt, fromTs), lt(orders.createdAt, toTs))).orderBy(desc(orders.createdAt));
  const paidStatuses = ["confirmed", "preparing", "packed", "out_for_delivery", "delivered"];
  const buckets = /* @__PURE__ */ new Map();
  function getBucketKey(ts) {
    const d = new Date(ts);
    if (period === "yearly") {
      const year = d.getFullYear();
      const start = new Date(year, 0, 1).getTime();
      const end2 = new Date(year + 1, 0, 1).getTime();
      return { key: `${year}`, label: `${year}`, from: start, to: end2 };
    }
    if (period === "monthly") {
      const year = d.getFullYear();
      const month = d.getMonth();
      const start = new Date(year, month, 1).getTime();
      const end2 = new Date(year, month + 1, 1).getTime();
      const label2 = d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      return { key: `${year}-${String(month).padStart(2, "0")}`, label: label2, from: start, to: end2 };
    }
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    if (period === "fortnightly") {
      const jan1 = new Date(monday.getFullYear(), 0, 1);
      const weekNum = Math.floor((monday.getTime() - jan1.getTime()) / (7 * 864e5));
      if (weekNum % 2 !== 0) monday.setDate(monday.getDate() - 7);
      const end2 = new Date(monday);
      end2.setDate(end2.getDate() + 14);
      const label2 = `${monday.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} \u2013 ${new Date(end2.getTime() - 864e5).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
      return { key: `fn-${monday.getTime()}`, label: label2, from: monday.getTime(), to: end2.getTime() };
    }
    const end = new Date(monday);
    end.setDate(end.getDate() + 7);
    const label = `${monday.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} \u2013 ${new Date(end.getTime() - 864e5).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
    return { key: `w-${monday.getTime()}`, label, from: monday.getTime(), to: end.getTime() };
  }
  __name(getBucketKey, "getBucketKey");
  for (const row of rows) {
    if (!paidStatuses.includes(row.status)) continue;
    const { key, label, from, to } = getBucketKey(row.createdAt);
    if (!buckets.has(key)) {
      buckets.set(key, { label, from, to, revenue: 0, orderCount: 0, itemCount: 0, avgOrderValue: 0, deliveryFees: 0, gst: 0 });
    }
    const b = buckets.get(key);
    b.revenue += row.total ?? 0;
    b.orderCount += 1;
    b.deliveryFees += row.deliveryFee ?? 0;
    b.gst += row.gst ?? 0;
    try {
      const items = JSON.parse(row.items);
      b.itemCount += items.length;
    } catch {
    }
  }
  for (const b of buckets.values()) {
    b.avgOrderValue = b.orderCount > 0 ? Math.round(b.revenue / b.orderCount) : 0;
  }
  const sorted = [...buckets.values()].sort((a, b) => a.from - b.from);
  const totalRevenue = rows.filter((r) => paidStatuses.includes(r.status)).reduce((s, r) => s + (r.total ?? 0), 0);
  const totalOrders = rows.filter((r) => paidStatuses.includes(r.status)).length;
  const cancelledOrders = rows.filter((r) => r.status === "cancelled").length;
  const refundedOrders = rows.filter((r) => r.status === "refunded").length;
  const productSales = /* @__PURE__ */ new Map();
  for (const row of rows) {
    if (!paidStatuses.includes(row.status)) continue;
    try {
      const items = JSON.parse(row.items);
      for (const item of items) {
        const key = item.productName;
        if (!productSales.has(key)) productSales.set(key, { name: key, revenue: 0, qty: 0 });
        const p = productSales.get(key);
        p.revenue += item.lineTotal ?? 0;
        p.qty += item.quantity ?? 1;
      }
    } catch {
    }
  }
  const topProducts = [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  return c.json({
    period,
    from: fromTs,
    to: toTs,
    summary: {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      cancelledOrders,
      refundedOrders
    },
    buckets: sorted,
    topProducts
  });
});
app15.get("/runs", async (c) => {
  const db = drizzle(c.env.DB);
  const now = Date.now();
  let fromTs = Number(c.req.query("from") || 0);
  let toTs = Number(c.req.query("to") || now + 30 * 864e5);
  if (!c.req.query("from")) {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 8 * 7);
    fromTs = d.getTime();
  }
  const days = await db.select({
    id: deliveryDays.id,
    date: deliveryDays.date,
    type: deliveryDays.type,
    stockPoolId: deliveryDays.stockPoolId,
    runStartedAt: deliveryDays.runStartedAt,
    runCompletedAt: deliveryDays.runCompletedAt,
    notes: deliveryDays.notes
  }).from(deliveryDays).where(and(gte(deliveryDays.date, fromTs), lte(deliveryDays.date, toTs))).orderBy(desc(deliveryDays.date));
  if (days.length === 0) {
    return c.json({ from: fromTs, to: toTs, runs: [], summary: { totalPaid: 0, totalOutstanding: 0, totalOrders: 0, totalStops: 0, runCount: 0 } });
  }
  const dayIds = days.map((d) => d.id);
  const dayOrders = await db.select({
    id: orders.id,
    deliveryDayId: orders.deliveryDayId,
    customerId: orders.customerId,
    customerName: orders.customerName,
    customerEmail: orders.customerEmail,
    total: orders.total,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    paymentIntentId: orders.paymentIntentId,
    createdAt: orders.createdAt
  }).from(orders).where(inArray(orders.deliveryDayId, dayIds));
  const dayStops = await db.select({
    id: stops.id,
    deliveryDayId: stops.deliveryDayId,
    status: stops.status
  }).from(stops).where(inArray(stops.deliveryDayId, dayIds));
  const runMap = /* @__PURE__ */ new Map();
  for (const d of days) {
    const runId = d.stockPoolId ?? d.id;
    if (!runMap.has(runId)) runMap.set(runId, { runId, days: [] });
    runMap.get(runId).days.push(d);
  }
  const paidStatuses = /* @__PURE__ */ new Set(["confirmed", "preparing", "packed", "out_for_delivery", "delivered"]);
  const runs = [...runMap.values()].map(({ runId, days: runDays }) => {
    const sortedDays = [...runDays].sort((a, b) => a.date - b.date);
    const anchorDate = sortedDays[0].date;
    const lastDate = sortedDays[sortedDays.length - 1].date;
    const runDayIdSet = new Set(sortedDays.map((d) => d.id));
    const runOrders = dayOrders.filter((o) => runDayIdSet.has(o.deliveryDayId));
    const runStops = dayStops.filter((s) => runDayIdSet.has(s.deliveryDayId));
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalCancelled = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    const customerSet = /* @__PURE__ */ new Set();
    const flags = [];
    for (const o of runOrders) {
      customerSet.add(o.customerId);
      if (o.paymentStatus === "paid" || paidStatuses.has(o.status)) {
        totalPaid += o.total ?? 0;
        paidCount += 1;
      } else if (o.status === "cancelled" || o.status === "refunded") {
        totalCancelled += o.total ?? 0;
        cancelledCount += 1;
      } else {
        totalOutstanding += o.total ?? 0;
        pendingCount += 1;
      }
    }
    const deliveredStops = runStops.filter((s) => s.status === "delivered").length;
    const flaggedStops = runStops.filter((s) => s.status === "flagged" || s.status === "failed").length;
    if (totalOutstanding > 0) flags.push(`$${(totalOutstanding / 100).toFixed(2)} outstanding`);
    if (flaggedStops > 0) flags.push(`${flaggedStops} flagged stop${flaggedStops === 1 ? "" : "s"}`);
    const todayStart = (() => {
      const d = /* @__PURE__ */ new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const isPast = lastDate < todayStart;
    if (isPast) {
      const undelivered = runStops.length - deliveredStops - flaggedStops;
      if (undelivered > 0) flags.push(`${undelivered} stop${undelivered === 1 ? "" : "s"} not delivered`);
    }
    let runStatus;
    if (anchorDate > todayStart) {
      runStatus = "upcoming";
    } else if (isPast && totalOutstanding === 0 && (runStops.length === 0 || deliveredStops + flaggedStops === runStops.length)) {
      runStatus = "complete";
    } else {
      runStatus = "in_progress";
    }
    return {
      runId,
      anchorDate,
      lastDate,
      dayCount: sortedDays.length,
      days: sortedDays.map((d) => ({ id: d.id, date: d.date, type: d.type })),
      totalPaid,
      totalOutstanding,
      totalCancelled,
      paidCount,
      pendingCount,
      cancelledCount,
      orderCount: runOrders.length,
      stopCount: runStops.length,
      deliveredStops,
      flaggedStops,
      customerCount: customerSet.size,
      flags,
      status: runStatus,
      // Order list — kept small so we don't bloat the payload. Sorted with
      // outstanding first so admin sees what to chase at the top.
      orders: runOrders.sort((a, b) => {
        const aPending = !(a.paymentStatus === "paid" || paidStatuses.has(a.status));
        const bPending = !(b.paymentStatus === "paid" || paidStatuses.has(b.status));
        if (aPending !== bPending) return aPending ? -1 : 1;
        return b.createdAt - a.createdAt;
      }).map((o) => ({
        id: o.id,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        hasPaymentIntent: Boolean(o.paymentIntentId && o.paymentIntentId !== "")
      }))
    };
  });
  runs.sort((a, b) => b.anchorDate - a.anchorDate);
  const summary = runs.reduce(
    (s, r) => {
      s.totalPaid += r.totalPaid;
      s.totalOutstanding += r.totalOutstanding;
      s.totalOrders += r.orderCount;
      s.totalStops += r.stopCount;
      s.runCount += 1;
      return s;
    },
    { totalPaid: 0, totalOutstanding: 0, totalOrders: 0, totalStops: 0, runCount: 0 }
  );
  return c.json({ from: fromTs, to: toTs, runs, summary });
});
app15.get("/sales-export", async (c) => {
  const db = drizzle(c.env.DB);
  const now = Date.now();
  let fromTs = Number(c.req.query("from") || 0);
  const toTs = Number(c.req.query("to") || now);
  if (!c.req.query("from")) {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 90);
    fromTs = d.getTime();
  }
  const INCLUDED_PAYMENT_STATUSES = ["paid", "invoice_sent", "refunded", "partial_refund"];
  const rows = await db.select({
    id: orders.id,
    customerName: orders.customerName,
    customerEmail: orders.customerEmail,
    total: orders.total,
    gst: orders.gst,
    paymentProvider: orders.paymentProvider,
    paymentStatus: orders.paymentStatus,
    paymentIntentId: orders.paymentIntentId,
    notes: orders.notes,
    status: orders.status,
    createdAt: orders.createdAt
  }).from(orders).where(and(
    gte(orders.createdAt, fromTs),
    lte(orders.createdAt, toTs),
    inArray(orders.paymentStatus, INCLUDED_PAYMENT_STATUSES)
  )).orderBy(desc(orders.createdAt));
  const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1e3;
  const formatDateAU = /* @__PURE__ */ __name((ms) => {
    const d = new Date(ms + BRISBANE_OFFSET_MS);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, "formatDateAU");
  const formatDollars = /* @__PURE__ */ __name((cents) => (cents / 100).toFixed(2), "formatDollars");
  const csvField = /* @__PURE__ */ __name((val) => {
    const s = val ?? "";
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }, "csvField");
  const csvRow = /* @__PURE__ */ __name((fields) => fields.map((f) => csvField(typeof f === "number" ? String(f) : f)).join(","), "csvRow");
  const header = csvRow([
    "Date",
    "Customer",
    "Email",
    "Amount (AUD)",
    "GST included (AUD)",
    "Provider",
    "Payment status",
    "Order status",
    "Order ID",
    "Payment intent / charge ID",
    "Notes"
  ]);
  const body = rows.map((r) => csvRow([
    formatDateAU(r.createdAt),
    r.customerName,
    r.customerEmail,
    formatDollars(r.total),
    formatDollars(r.gst),
    r.paymentProvider,
    r.paymentStatus,
    r.status,
    r.id.slice(-8).toUpperCase(),
    r.paymentIntentId || "",
    r.notes ?? ""
  ]));
  const csv = "\uFEFF" + [header, ...body].join("\r\n") + "\r\n";
  const fromLabel = formatDateAU(fromTs).replace(/\//g, "-");
  const toLabel = formatDateAU(toTs).replace(/\//g, "-");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-export_${fromLabel}_to_${toLabel}.csv"`,
      "Cache-Control": "no-store"
    }
  });
});
app15.get("/payouts", async (c) => {
  const SQUARE_API6 = "https://connect.squareup.com/v2";
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) {
    return c.json({ error: "Square not configured" }, 503);
  }
  const db = drizzle(c.env.DB);
  const now = Date.now();
  let fromTs = Number(c.req.query("from") || 0);
  const toTs = Number(c.req.query("to") || now);
  if (!c.req.query("from")) {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 90);
    fromTs = d.getTime();
  }
  const beginTime = new Date(fromTs).toISOString();
  const endTime = new Date(toTs).toISOString();
  const squareGet2 = /* @__PURE__ */ __name(async (path) => {
    const res = await fetch(`${SQUARE_API6}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-01-18"
      }
    });
    return res.json();
  }, "squareGet");
  try {
    const payoutsResp = await squareGet2(
      `/payouts?location_id=${encodeURIComponent(locationId)}&begin_time=${encodeURIComponent(beginTime)}&end_time=${encodeURIComponent(endTime)}&sort_order=DESC&limit=100`
    );
    if (payoutsResp.errors) {
      return c.json({ error: "Square API error", details: payoutsResp.errors }, 502);
    }
    const squarePayouts = payoutsResp.payouts ?? [];
    const entriesPerPayout = await Promise.all(
      squarePayouts.map(async (p) => {
        const r = await squareGet2(`/payouts/${p.id}/payout-entries?limit=100`);
        return r.payout_entries ?? [];
      })
    );
    const paymentIdsSeen = /* @__PURE__ */ new Set();
    for (const entries of entriesPerPayout) {
      for (const e of entries) {
        const pid = e.type_charge_details?.payment_id ?? e.type_refunded_charge_details?.payment_id ?? e.payment_id ?? null;
        if (pid) paymentIdsSeen.add(pid);
      }
    }
    const directMatches = /* @__PURE__ */ new Map();
    if (paymentIdsSeen.size > 0) {
      const rows = await db.select({
        id: orders.id,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        total: orders.total,
        createdAt: orders.createdAt,
        paymentIntentId: orders.paymentIntentId
      }).from(orders).where(inArray(orders.paymentIntentId, [...paymentIdsSeen]));
      for (const r of rows) {
        directMatches.set(r.paymentIntentId, {
          id: r.id,
          customerName: r.customerName,
          customerEmail: r.customerEmail,
          total: r.total,
          createdAt: r.createdAt
        });
      }
    }
    const stillUnmatched = [...paymentIdsSeen].filter((pid) => !directMatches.has(pid));
    const notePrefixByPaymentId = /* @__PURE__ */ new Map();
    await Promise.all(
      stillUnmatched.map(async (pid) => {
        try {
          const r = await squareGet2(`/payments/${pid}`);
          const note = r.payment?.note ?? "";
          const m = note.match(/Order\s*#\s*([A-Z0-9]{6,12})/i);
          if (m && m[1]) notePrefixByPaymentId.set(pid, m[1].toLowerCase());
        } catch {
        }
      })
    );
    const noteOrders = /* @__PURE__ */ new Map();
    const uniquePrefixes = [...new Set(notePrefixByPaymentId.values())];
    if (uniquePrefixes.length > 0) {
      const rows = await db.select({
        id: orders.id,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        total: orders.total,
        createdAt: orders.createdAt
      }).from(orders).where(or(...uniquePrefixes.map((p) => like(orders.id, `${p}%`))));
      const byPrefix = /* @__PURE__ */ new Map();
      for (const row of rows) {
        byPrefix.set(row.id.slice(0, 8), row);
      }
      for (const [pid, prefix] of notePrefixByPaymentId.entries()) {
        const r = byPrefix.get(prefix);
        if (r) {
          noteOrders.set(pid, {
            id: r.id,
            customerName: r.customerName,
            customerEmail: r.customerEmail,
            total: r.total,
            createdAt: r.createdAt
          });
        }
      }
    }
    const enriched = squarePayouts.map((p, i) => {
      const entries = entriesPerPayout[i].map((e) => {
        const pid = e.type_charge_details?.payment_id ?? e.type_refunded_charge_details?.payment_id ?? e.payment_id ?? null;
        let matched = null;
        let strategy = null;
        if (pid) {
          if (directMatches.has(pid)) {
            matched = directMatches.get(pid) ?? null;
            strategy = "payment_intent_id";
          } else if (noteOrders.has(pid)) {
            matched = noteOrders.get(pid) ?? null;
            strategy = "note";
          }
        }
        return {
          id: e.id,
          type: e.type,
          effectiveAt: e.effective_at,
          amountCents: e.amount_money?.amount ?? 0,
          feeCents: e.fee_amount_money?.amount ?? 0,
          paymentId: pid,
          matchedOrder: matched,
          matchStrategy: strategy
        };
      });
      const chargeEntries = entries.filter((e) => e.paymentId);
      const matchedCount = chargeEntries.filter((e) => e.matchedOrder).length;
      return {
        id: p.id,
        status: p.status,
        arrivalDate: p.arrival_date ?? null,
        createdAt: p.created_at ?? null,
        amountCents: p.amount_money?.amount ?? 0,
        currency: p.amount_money?.currency ?? "AUD",
        destinationType: p.destination?.type ?? null,
        endToEndId: p.end_to_end_id ?? null,
        entries,
        matchedCount,
        unmatchedCount: chargeEntries.length - matchedCount,
        chargeCount: chargeEntries.length
      };
    });
    return c.json({
      provider: "square",
      from: fromTs,
      to: toTs,
      payouts: enriched,
      stripe: {
        skipped: true,
        reason: "Stripe webhook does not yet record payment_intent.id on orders \u2014 payout matching disabled until that is wired up."
      }
    });
  } catch (e) {
    return c.json({ error: e?.message ?? "Failed to load payouts" }, 500);
  }
});
var reports_default = app15;

// src/routes/reels.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
init_auth();
var app16 = new Hono2();
app16.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(reels).where(eq(reels.active, true)).orderBy(asc(reels.displayOrder));
  return c.json({
    reels: rows.map((r, i) => ({
      id: r.id,
      label: r.title,
      sublabel: r.subtitle,
      thumbnail: r.thumbnailUrl,
      videoUrl: null,
      fbUrl: r.fbUrl,
      featured: i === 0
    }))
  });
});
app16.get("/admin", requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(reels).orderBy(asc(reels.displayOrder));
  return c.json(rows);
});
app16.post("/", requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(reels).values({
    id,
    title: body.title,
    subtitle: body.subtitle ?? "",
    fbUrl: body.fbUrl,
    thumbnailUrl: body.thumbnailUrl ?? null,
    displayOrder: body.displayOrder ?? 0,
    active: true,
    createdAt: now,
    updatedAt: now
  });
  return c.json({ id }, 201);
});
app16.patch("/:id", requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Missing reel id" }, 400);
  const body = await c.req.json();
  await db.update(reels).set({ ...body, updatedAt: Date.now() }).where(eq(reels.id, id));
  return c.json({ ok: true });
});
app16.delete("/:id", requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Missing reel id" }, 400);
  await db.delete(reels).where(eq(reels.id, id));
  return c.json({ ok: true });
});
app16.post("/sync", async (c) => {
  const token = c.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return c.json({ error: "FB_PAGE_ACCESS_TOKEN not set" }, 500);
  const PAGE_ID = "655149441012938";
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PAGE_ID}/videos?fields=id,title,description,picture,permalink_url,created_time&limit=6&access_token=${token}`
    );
    if (!res.ok) {
      const err = await res.text();
      return c.json({ error: `Facebook API ${res.status}: ${err}` }, 500);
    }
    const data = await res.json();
    if (!data.data?.length) return c.json({ synced: 0, message: "No videos found" });
    const db = drizzle(c.env.DB);
    const now = Date.now();
    let synced = 0;
    for (const video of data.data) {
      const fbUrl = video.permalink_url ? `https://www.facebook.com${video.permalink_url}` : `https://www.facebook.com/${PAGE_ID}/videos/${video.id}`;
      const title = video.title || video.description?.split("\n")[0]?.slice(0, 50) || "O'Connor Agriculture";
      const subtitle = video.created_time ? new Date(video.created_time).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";
      const reelId = `fb-${video.id}`;
      const [existing] = await db.select().from(reels).where(eq(reels.id, reelId)).limit(1);
      if (existing) {
        await db.update(reels).set({ thumbnailUrl: video.picture ?? existing.thumbnailUrl, updatedAt: now }).where(eq(reels.id, reelId));
      } else {
        await db.insert(reels).values({
          id: reelId,
          title,
          subtitle,
          fbUrl,
          thumbnailUrl: video.picture ?? null,
          displayOrder: synced,
          active: true,
          createdAt: now,
          updatedAt: now
        });
        synced++;
      }
    }
    return c.json({ synced, total: data.data.length });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Sync failed" }, 500);
  }
});

// src/routes/promoCodes.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
init_auth();
var app17 = new Hono2();
app17.use("*", requireRole("admin", "staff"));
app17.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  return c.json(codes);
});
app17.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const id = crypto.randomUUID();
  await db.insert(promoCodes).values({
    id,
    code: body.code.toUpperCase().trim(),
    type: body.type,
    value: body.value,
    minOrder: body.minOrder ?? 0,
    maxUses: body.maxUses ?? null,
    expiresAt: body.expiresAt ?? null,
    deliveryDayIds: body.deliveryDayIds?.length ? JSON.stringify(body.deliveryDayIds) : null,
    usedCount: 0,
    active: true,
    createdAt: Date.now()
  });
  return c.json({ id }, 201);
});
app17.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const raw2 = await c.req.json();
  const { deliveryDayIds, ...rest } = raw2;
  const body = { ...rest };
  if ("deliveryDayIds" in raw2) {
    body.deliveryDayIds = deliveryDayIds?.length ? JSON.stringify(deliveryDayIds) : null;
  }
  await db.update(promoCodes).set(body).where(eq(promoCodes.id, c.req.param("id")));
  return c.json({ ok: true });
});
app17.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  await db.delete(promoCodes).where(eq(promoCodes.id, c.req.param("id")));
  return c.json({ ok: true });
});
var promoCodes_default = app17;

// src/routes/businesses.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();

// src/lib/businessAccess.ts
init_drizzle_orm();
init_src();
async function checkMembership(db, userId, businessId) {
  const [member] = await db.select().from(businessMembers).where(and(eq(businessMembers.userId, userId), eq(businessMembers.businessId, businessId))).limit(1);
  if (!member) return { ok: false };
  return { ok: true, role: member.role };
}
__name(checkMembership, "checkMembership");

// src/routes/businesses.ts
var app18 = new Hono2();
app18.get("/mine", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const rows = await db.select({
    id: businesses.id,
    name: businesses.name,
    slug: businesses.slug,
    hubdocEmail: businesses.hubdocEmail,
    active: businesses.active,
    role: businessMembers.role
  }).from(businessMembers).innerJoin(businesses, eq(businessMembers.businessId, businesses.id)).where(eq(businessMembers.userId, user.id));
  return c.json(rows);
});
app18.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const id = c.req.param("id");
  const membership = await checkMembership(db, user.id, id);
  if (!membership.ok) return c.json({ error: "Forbidden" }, 403);
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  if (!biz) return c.json({ error: "Not found" }, 404);
  return c.json({ ...biz, role: membership.role });
});
app18.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const id = c.req.param("id");
  const membership = await checkMembership(db, user.id, id);
  if (!membership.ok) return c.json({ error: "Forbidden" }, 403);
  if (membership.role !== "owner") {
    return c.json({ error: "Only business owners can change config" }, 403);
  }
  const body = await c.req.json();
  const patch = { updatedAt: Date.now() };
  if (body.name !== void 0) patch.name = body.name;
  if (body.hubdocEmail !== void 0) {
    const cleaned = (body.hubdocEmail ?? "").trim();
    patch.hubdocEmail = cleaned === "" ? null : cleaned;
  }
  await db.update(businesses).set(patch).where(eq(businesses.id, id));
  const [updated] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  return c.json(updated);
});
var businesses_default = app18;

// src/routes/receipts.ts
init_dist();
init_d1();
init_drizzle_orm();
init_src();
init_email();
var app19 = new Hono2();
app19.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const businessId = c.req.query("businessId");
  if (!businessId) return c.json({ error: "businessId is required" }, 400);
  const membership = await checkMembership(db, user.id, businessId);
  if (!membership.ok) return c.json({ error: "Forbidden" }, 403);
  const rows = await db.select().from(receipts).where(eq(receipts.businessId, businessId)).orderBy(desc(receipts.createdAt)).limit(200);
  return c.json(rows.map((r) => ({
    ...r,
    photoUrl: `/images/${r.photoKey}`
  })));
});
app19.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const form = await c.req.formData();
  const file = form.get("file");
  const businessId = form.get("businessId");
  if (!file) return c.json({ error: "No photo uploaded" }, 400);
  if (!businessId) return c.json({ error: "businessId is required" }, 400);
  const membership = await checkMembership(db, user.id, businessId);
  if (!membership.ok) return c.json({ error: "Forbidden" }, 403);
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!biz) return c.json({ error: "Business not found" }, 404);
  const notes = form.get("notes")?.trim() || null;
  const merchant = form.get("merchant")?.trim() || null;
  const amountRaw = form.get("amount")?.trim();
  let amountCents = null;
  if (amountRaw) {
    const cleaned = amountRaw.replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) {
      amountCents = Math.round(parsed * 100);
    }
  }
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
  const id = crypto.randomUUID();
  const photoKey = `receipts/${id}.${ext}`;
  const bytes = await file.arrayBuffer();
  await c.env.IMAGES.put(photoKey, bytes, {
    httpMetadata: { contentType: file.type || "image/jpeg" }
  });
  const now = Date.now();
  await db.insert(receipts).values({
    id,
    businessId,
    capturedByUid: user.id,
    photoKey,
    contentType: file.type || "image/jpeg",
    notes,
    merchant,
    amountCents,
    capturedAt: now,
    createdAt: now,
    updatedAt: now
  });
  let hubdocForwardedAt = null;
  let hubdocForwardError = null;
  if (biz.hubdocEmail) {
    try {
      const u8 = new Uint8Array(bytes);
      let binary = "";
      const CHUNK = 32768;
      for (let i = 0; i < u8.length; i += CHUNK) {
        binary += String.fromCharCode(...u8.subarray(i, i + CHUNK));
      }
      const base64 = btoa(binary);
      const sentAt = new Date(now);
      const subject = `Receipt \u2014 ${merchant ?? biz.name} \u2014 ${sentAt.toLocaleDateString("en-AU")}`;
      const lines = [
        `<p>Receipt captured via the ${biz.name} admin app.</p>`
      ];
      if (merchant) lines.push(`<p><strong>Merchant:</strong> ${escapeHtml2(merchant)}</p>`);
      if (amountCents !== null) lines.push(`<p><strong>Amount:</strong> $${(amountCents / 100).toFixed(2)}</p>`);
      if (notes) lines.push(`<p><strong>Notes:</strong> ${escapeHtml2(notes)}</p>`);
      lines.push(`<p style="color:#666;font-size:12px">Captured ${sentAt.toISOString()} by ${escapeHtml2(user.email)}.</p>`);
      const result = await sendEmail({
        apiKey: c.env.RESEND_API_KEY,
        from: c.env.FROM_EMAIL,
        to: biz.hubdocEmail,
        subject,
        html: lines.join(""),
        attachments: [{
          filename: `receipt-${id}.${ext}`,
          content: base64,
          contentType: file.type || "image/jpeg"
        }]
      });
      if (result) {
        hubdocForwardedAt = Date.now();
      } else {
        hubdocForwardError = "Resend rejected the message (see worker logs)";
      }
    } catch (e) {
      hubdocForwardError = String(e).slice(0, 400);
      console.error("Hubdoc forward failed:", e);
    }
    await db.update(receipts).set({
      hubdocForwardedAt,
      hubdocForwardError,
      updatedAt: Date.now()
    }).where(eq(receipts.id, id));
  }
  return c.json({
    id,
    businessId,
    photoKey,
    photoUrl: `/images/${photoKey}`,
    notes,
    merchant,
    amountCents,
    capturedAt: now,
    createdAt: now,
    hubdocForwardedAt,
    hubdocForwardError
  }, 201);
});
app19.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const id = c.req.param("id");
  const [existing] = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const membership = await checkMembership(db, user.id, existing.businessId);
  if (!membership.ok) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const patch = { updatedAt: Date.now() };
  if (body.notes !== void 0) patch.notes = body.notes?.trim() || null;
  if (body.merchant !== void 0) patch.merchant = body.merchant?.trim() || null;
  if (body.amountCents !== void 0) patch.amountCents = body.amountCents;
  await db.update(receipts).set(patch).where(eq(receipts.id, id));
  const [updated] = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  return c.json({ ...updated, photoUrl: `/images/${updated.photoKey}` });
});
app19.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const id = c.req.param("id");
  const [existing] = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const membership = await checkMembership(db, user.id, existing.businessId);
  if (!membership.ok) return c.json({ error: "Forbidden" }, 403);
  try {
    await c.env.IMAGES.delete(existing.photoKey);
  } catch {
  }
  await db.delete(receipts).where(eq(receipts.id, id));
  return c.json({ ok: true });
});
app19.post("/:id/retry-forward", async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get("user");
  const id = c.req.param("id");
  const [existing] = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const membership = await checkMembership(db, user.id, existing.businessId);
  if (!membership.ok) return c.json({ error: "Forbidden" }, 403);
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, existing.businessId)).limit(1);
  if (!biz) return c.json({ error: "Business not found" }, 404);
  if (!biz.hubdocEmail) return c.json({ error: "No Hubdoc email configured for this business" }, 400);
  const obj = await c.env.IMAGES.get(existing.photoKey);
  if (!obj) return c.json({ error: "Photo no longer in storage" }, 404);
  const bytes = await obj.arrayBuffer();
  const u8 = new Uint8Array(bytes);
  let binary = "";
  const CHUNK = 32768;
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode(...u8.subarray(i, i + CHUNK));
  }
  const base64 = btoa(binary);
  const ext = existing.photoKey.split(".").pop() ?? "jpg";
  const result = await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL,
    to: biz.hubdocEmail,
    subject: `Receipt \u2014 ${existing.merchant ?? biz.name} \u2014 re-sent`,
    html: `<p>Receipt re-sent via the ${biz.name} admin app.</p>${existing.notes ? `<p>${escapeHtml2(existing.notes)}</p>` : ""}`,
    attachments: [{
      filename: `receipt-${existing.id}.${ext}`,
      content: base64,
      contentType: existing.contentType || "image/jpeg"
    }]
  });
  const hubdocForwardedAt = result ? Date.now() : null;
  const hubdocForwardError = result ? null : "Resend rejected the message";
  await db.update(receipts).set({
    hubdocForwardedAt,
    hubdocForwardError,
    updatedAt: Date.now()
  }).where(eq(receipts.id, id));
  return c.json({ ok: !!result, hubdocForwardedAt, hubdocForwardError });
});
function escapeHtml2(s) {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}
__name(escapeHtml2, "escapeHtml");
var receipts_default = app19;

// src/index.ts
var app20 = new Hono2();
var SQUARE_API5 = "https://connect.squareup.com/v2";
var HOUR_MS = 60 * 60 * 1e3;
var DAY_MS = 24 * HOUR_MS;
var WEEK_MS = 7 * DAY_MS;
var MONTH_MS = 30 * DAY_MS;
var TRACK_PATH_MAX = 200;
var TRACK_ITEM_ID_MAX = 80;
var TRACK_BOT_UA_RE = /bot|crawler|spider|preview|facebookexternalhit|pingdom|uptimerobot|gtmetrix|lighthouse|wget|curl|headlesschrome|monitis|prerender/i;
var TRACK_PROD_HOSTS = /* @__PURE__ */ new Set(["oconnoragriculture.com.au", "www.oconnoragriculture.com.au"]);
function startOfBrisbaneDay(now = Date.now()) {
  const aest = now + 10 * HOUR_MS;
  const dayStart = aest - aest % DAY_MS;
  return dayStart - 10 * HOUR_MS;
}
__name(startOfBrisbaneDay, "startOfBrisbaneDay");
function dayKeyFromMs(ms) {
  return new Date(startOfBrisbaneDay(ms) + 10 * HOUR_MS).toISOString().slice(0, 10);
}
__name(dayKeyFromMs, "dayKeyFromMs");
function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round(numerator / denominator * 1e3) / 10;
}
__name(pct, "pct");
function activeOrderForOperationalCounts(order) {
  const terminal = /* @__PURE__ */ new Set(["cancelled", "refunded", "failed"]);
  return !terminal.has(order.status ?? "") && !terminal.has(order.paymentStatus ?? "");
}
__name(activeOrderForOperationalCounts, "activeOrderForOperationalCounts");
function orderItemReservationQty(item) {
  const qty = item.weight ? item.weight / 1e3 : item.weightKg ?? item.quantity ?? 1;
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}
__name(orderItemReservationQty, "orderItemReservationQty");
function parseOrderItemsForGuardrails(order) {
  try {
    const parsed = JSON.parse(order.items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
__name(parseOrderItemsForGuardrails, "parseOrderItemsForGuardrails");
function parseAddressForGuardrails(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return {};
    return {
      line1: String(parsed.line1 ?? "").trim(),
      line2: String(parsed.line2 ?? "").trim(),
      suburb: String(parsed.suburb ?? "").trim(),
      state: String(parsed.state ?? "").trim(),
      postcode: String(parsed.postcode ?? "").trim()
    };
  } catch {
    return {};
  }
}
__name(parseAddressForGuardrails, "parseAddressForGuardrails");
function addressKey(addr) {
  return [addr.line1, addr.line2, addr.suburb, addr.state, addr.postcode].map((part) => (part ?? "").trim().toLowerCase()).join("|");
}
__name(addressKey, "addressKey");
async function runOpsGuardrails(env, options = {}) {
  const db = drizzle(env.DB);
  const repair = options.repair === true;
  const checkedAt = Date.now();
  const issues = [];
  let repaired = 0;
  const [days, stockRows, orders2, stops2] = await Promise.all([
    db.select().from(deliveryDays).where(eq(deliveryDays.active, true)),
    db.select().from(deliveryDayStock),
    db.select().from(orders),
    db.select().from(stops)
  ]);
  const daysById = new Map(days.map((day) => [day.id, day]));
  const activeDayIds = new Set(days.map((day) => day.id));
  const stopOrderIds = new Set(stops2.map((stop) => stop.orderId).filter(Boolean));
  const stopsByOrderId = new Map(stops2.filter((stop) => stop.orderId).map((stop) => [stop.orderId, stop]));
  const runsByDayId = /* @__PURE__ */ new Map();
  const expectedReservations = /* @__PURE__ */ new Map();
  const orderCountsByDay = /* @__PURE__ */ new Map();
  const stockKeys = new Set(stockRows.map((row) => `${row.deliveryDayId}:${row.productId}`));
  const allRuns = await db.select().from(deliveryRuns);
  for (const run of allRuns) {
    const list = runsByDayId.get(run.deliveryDayId) ?? [];
    list.push(run);
    runsByDayId.set(run.deliveryDayId, list);
  }
  const activeSubscriptions = await db.select({
    id: subscriptions.id,
    customerId: subscriptions.customerId,
    email: subscriptions.email,
    boxName: subscriptions.boxName,
    frequency: subscriptions.frequency,
    status: subscriptions.status,
    customerName: customers.name
  }).from(subscriptions).leftJoin(customers, eq(subscriptions.customerId, customers.id)).where(eq(subscriptions.status, "active"));
  const subscriptionKeys = /* @__PURE__ */ new Map();
  for (const sub of activeSubscriptions) {
    const key = `${String(sub.customerId ?? sub.email).toLowerCase()}|${sub.frequency}`;
    const list = subscriptionKeys.get(key) ?? [];
    list.push(sub);
    subscriptionKeys.set(key, list);
  }
  for (const duplicateSubs of subscriptionKeys.values()) {
    if (duplicateSubs.length < 2) continue;
    const label = duplicateSubs[0].customerName || duplicateSubs[0].email;
    issues.push({
      code: "duplicate_active_subscription",
      severity: "critical",
      message: `${label} has ${duplicateSubs.length} active subscriptions on the same frequency.`,
      details: {
        subscriptionIds: duplicateSubs.map((sub) => sub.id),
        customerId: duplicateSubs[0].customerId,
        email: duplicateSubs[0].email,
        frequency: duplicateSubs[0].frequency,
        boxes: duplicateSubs.map((sub) => sub.boxName)
      }
    });
  }
  for (const order of orders2) {
    const day = daysById.get(order.deliveryDayId);
    if (!day) continue;
    if (!activeOrderForOperationalCounts(order)) continue;
    orderCountsByDay.set(order.deliveryDayId, (orderCountsByDay.get(order.deliveryDayId) ?? 0) + 1);
    const stockDayId = day.stockPoolId ?? day.id;
    const items = parseOrderItemsForGuardrails(order);
    for (const item of items) {
      if (!item.productId) continue;
      const qty = orderItemReservationQty(item);
      if (qty <= 0) continue;
      const key = `${stockDayId}:${item.productId}`;
      expectedReservations.set(key, (expectedReservations.get(key) ?? 0) + qty);
      if (!stockKeys.has(key)) {
        issues.push({
          code: "order_product_missing_allocation",
          severity: "critical",
          message: `${item.productName ?? item.productId} is on an active order but not allocated for its stock pool.`,
          details: { orderId: order.id, deliveryDayId: order.deliveryDayId, stockDayId, productId: item.productId, qty }
        });
      }
    }
    if (order.paymentStatus === "paid" && ["confirmed", "preparing", "packed", "out_for_delivery"].includes(order.status) && day.type === "delivery" && !stopOrderIds.has(order.id)) {
      issues.push({
        code: "paid_delivery_order_missing_stop",
        severity: "critical",
        message: `${order.customerName || order.customerEmail} has a paid delivery order with no driver stop.`,
        details: { orderId: order.id, deliveryDayId: order.deliveryDayId }
      });
      if (repair) {
        const created = await ensureStopForPaidDeliveryOrder2(db, order);
        if (created) repaired++;
      }
    }
    if (isInvoiceSentSubscriptionOrder(order) && order.status === "pending_payment" && day.type === "delivery" && !stopOrderIds.has(order.id)) {
      issues.push({
        code: "invoice_sent_subscription_missing_manifest_stop",
        severity: "critical",
        message: `${order.customerName || order.customerEmail} has an invoiced subscription due, but no manifest stop.`,
        details: { orderId: order.id, deliveryDayId: order.deliveryDayId, paymentStatus: order.paymentStatus }
      });
      if (repair) {
        const created = await ensureStopForInvoiceSentSubscriptionOrder(db, order);
        if (created) repaired++;
      }
    }
    const linkedStop = stopsByOrderId.get(order.id);
    if (linkedStop && day.type === "delivery" && order.paymentStatus === "paid" && ["confirmed", "preparing", "packed", "out_for_delivery"].includes(order.status)) {
      const orderAddress = parseAddressForGuardrails(order.deliveryAddress);
      const stopAddress = parseAddressForGuardrails(linkedStop.address);
      const addressMismatch = addressKey(orderAddress) !== addressKey(stopAddress);
      const dayMismatch = linkedStop.deliveryDayId !== order.deliveryDayId;
      const detailMismatch = linkedStop.customerName !== order.customerName || linkedStop.customerPhone !== (order.customerPhone ?? "") || linkedStop.items !== order.items || (linkedStop.customerNote ?? "") !== (order.notes ?? "");
      if (addressMismatch || dayMismatch || detailMismatch) {
        issues.push({
          code: "delivery_stop_order_drift",
          severity: "critical",
          message: `${order.customerName || order.customerEmail} has a driver stop that no longer matches the order details.`,
          details: {
            orderId: order.id,
            stopId: linkedStop.id,
            deliveryDayId: order.deliveryDayId,
            addressMismatch,
            dayMismatch,
            detailMismatch
          }
        });
        if (repair) {
          const dayRuns = runsByDayId.get(order.deliveryDayId) ?? [];
          await db.update(stops).set({
            deliveryDayId: order.deliveryDayId,
            runId: dayRuns.length === 1 ? dayRuns[0].id : linkedStop.runId,
            customerName: order.customerName,
            customerPhone: order.customerPhone ?? "",
            address: order.deliveryAddress,
            items: order.items,
            customerNote: order.notes ?? null,
            ...addressMismatch ? { lat: null, lng: null } : {}
          }).where(eq(stops.id, linkedStop.id));
          repaired++;
        }
      }
    }
    if (order.status === "pending_payment" && order.createdAt < checkedAt - 12 * HOUR_MS && ["pending_payment", "awaiting_payment"].includes(order.paymentStatus)) {
      issues.push({
        code: "stale_pending_checkout",
        severity: "warning",
        message: `${order.customerName || order.customerEmail} has a checkout attempt older than 12 hours.`,
        details: { orderId: order.id, deliveryDayId: order.deliveryDayId, createdAt: order.createdAt, paymentStatus: order.paymentStatus }
      });
    }
    if ((order.notes ?? "").startsWith("Subscription:") && order.paymentStatus === "pending_payment" && !(order.internalNotes ?? "").includes("Square invoice sent:")) {
      issues.push({
        code: "subscription_pending_without_invoice",
        severity: "critical",
        message: `${order.customerName || order.customerEmail} has a subscription order pending without a Square invoice note.`,
        details: { orderId: order.id, deliveryDayId: order.deliveryDayId }
      });
    }
  }
  for (const row of stockRows) {
    if (!activeDayIds.has(row.deliveryDayId)) continue;
    const key = `${row.deliveryDayId}:${row.productId}`;
    const expected = expectedReservations.get(key) ?? 0;
    if (Math.abs(row.sold - expected) > 1e-3) {
      issues.push({
        code: "stock_reservation_drift",
        severity: "critical",
        message: `${row.productName} reserved stock is ${row.sold}, but active orders account for ${expected}.`,
        details: { deliveryDayId: row.deliveryDayId, productId: row.productId, recorded: row.sold, expected }
      });
      if (repair) {
        await db.update(deliveryDayStock).set({ sold: expected }).where(eq(deliveryDayStock.id, row.id));
        repaired++;
      }
    }
    if (expected > row.allocated) {
      issues.push({
        code: "stock_pool_oversold",
        severity: "critical",
        message: `${row.productName} is oversold for this stock pool.`,
        details: { deliveryDayId: row.deliveryDayId, productId: row.productId, allocated: row.allocated, expected }
      });
    }
  }
  for (const day of days) {
    const expected = orderCountsByDay.get(day.id) ?? 0;
    if (day.orderCount !== expected) {
      issues.push({
        code: "delivery_day_order_count_drift",
        severity: "warning",
        message: `Delivery day order count is ${day.orderCount}, but active orders account for ${expected}.`,
        details: { deliveryDayId: day.id, recorded: day.orderCount, expected }
      });
      if (repair) {
        await db.update(deliveryDays).set({ orderCount: expected }).where(eq(deliveryDays.id, day.id));
        repaired++;
      }
    }
  }
  for (const stop of stops2) {
    if (!activeDayIds.has(stop.deliveryDayId)) continue;
    if (stop.runId) continue;
    const dayRuns = runsByDayId.get(stop.deliveryDayId) ?? [];
    if (dayRuns.length !== 1) continue;
    issues.push({
      code: "delivery_stop_unassigned_to_single_run",
      severity: "critical",
      message: `${stop.customerName} is on an active delivery day but is not assigned to the only driver run.`,
      details: { stopId: stop.id, deliveryDayId: stop.deliveryDayId, runId: dayRuns[0].id }
    });
    if (repair) {
      await db.update(stops).set({ runId: dayRuns[0].id }).where(eq(stops.id, stop.id));
      repaired++;
    }
  }
  return {
    ok: !issues.some((issue) => issue.severity === "critical"),
    checkedAt,
    issues,
    repaired
  };
}
__name(runOpsGuardrails, "runOpsGuardrails");
function centsPer(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round(numerator / denominator);
}
__name(centsPer, "centsPer");
function parseHostname(headerValue) {
  if (!headerValue) return null;
  try {
    return new URL(headerValue).hostname.toLowerCase();
  } catch {
    return null;
  }
}
__name(parseHostname, "parseHostname");
function cleanReferrerHost(request) {
  const host = parseHostname(request.headers.get("Referer"));
  if (!host || TRACK_PROD_HOSTS.has(host)) return null;
  return host.slice(0, 120);
}
__name(cleanReferrerHost, "cleanReferrerHost");
function countryCode(request) {
  const raw2 = request.headers.get("CF-IPCountry") || request.headers.get("cf-ipcountry") || "";
  const code = raw2.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}
__name(countryCode, "countryCode");
function deviceType(ua) {
  const s = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook/.test(s)) return "tablet";
  if (/mobi|iphone|android.*mobile|windows phone/.test(s)) return "mobile";
  return "desktop";
}
__name(deviceType, "deviceType");
function browserName(ua) {
  const s = ua.toLowerCase();
  if (/edg\//.test(s)) return "Edge";
  if (/opr\//.test(s) || /opera/.test(s)) return "Opera";
  if (/firefox\//.test(s)) return "Firefox";
  if (/samsungbrowser\//.test(s)) return "Samsung Internet";
  if (/crios\//.test(s)) return "Chrome iOS";
  if (/chrome\//.test(s) || /chromium\//.test(s)) return "Chrome";
  if (/safari\//.test(s)) return "Safari";
  return "Other";
}
__name(browserName, "browserName");
function osName(ua) {
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return "iOS";
  if (/android/.test(s)) return "Android";
  if (/windows/.test(s)) return "Windows";
  if (/mac os x|macintosh/.test(s)) return "macOS";
  if (/linux/.test(s)) return "Linux";
  return "Other";
}
__name(osName, "osName");
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
__name(sha256Hex, "sha256Hex");
function sanitizeTrackPath(input) {
  if (typeof input !== "string") return null;
  const withoutQuery = input.trim().split("#")[0].split("?")[0];
  if (!withoutQuery.startsWith("/")) return null;
  const path = withoutQuery.replace(/\/{2,}/g, "/").slice(0, TRACK_PATH_MAX) || "/";
  if (path.includes("..")) return null;
  if (/^\/(api|admin|login|sign-in|sign-up|ticket|images)\b/i.test(path)) return null;
  return path;
}
__name(sanitizeTrackPath, "sanitizeTrackPath");
function sanitizeTrackItemId(input) {
  if (typeof input !== "string") return null;
  const itemId = input.trim().slice(0, TRACK_ITEM_ID_MAX);
  return /^[a-zA-Z0-9_-]{3,80}$/.test(itemId) ? itemId : null;
}
__name(sanitizeTrackItemId, "sanitizeTrackItemId");
function localHourFromMs(ms) {
  return new Date(ms + 10 * HOUR_MS).getUTCHours();
}
__name(localHourFromMs, "localHourFromMs");
function asList(result) {
  return result.results ?? [];
}
__name(asList, "asList");
function rowNumber(row, field) {
  const value = row[field];
  return typeof value === "number" ? value : Number(value ?? 0);
}
__name(rowNumber, "rowNumber");
function rowString(row, field, fallback = "") {
  const value = row[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}
__name(rowString, "rowString");
async function visitorWindowSummary(env, from) {
  const row = await env.DB.prepare(`
    SELECT
      COUNT(*) AS events,
      COUNT(CASE WHEN item_id IS NULL OR item_id = '' THEN 1 END) AS pageviews,
      COUNT(CASE WHEN item_id IS NOT NULL AND item_id != '' THEN 1 END) AS itemViews,
      COUNT(DISTINCT session_hash) AS visitors
    FROM page_events
    WHERE created_at >= ?
  `).bind(from).first();
  return {
    events: rowNumber(row ?? {}, "events"),
    pageviews: rowNumber(row ?? {}, "pageviews"),
    itemViews: rowNumber(row ?? {}, "itemViews"),
    visitors: rowNumber(row ?? {}, "visitors")
  };
}
__name(visitorWindowSummary, "visitorWindowSummary");
async function paidOrderWindowSummary(env, from) {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenueCents
    FROM orders
    WHERE created_at >= ?
      AND status NOT IN ('cancelled', 'refunded')
      AND (
        payment_status = 'paid'
        OR status IN ('confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered')
      )
  `).bind(from).first();
  return {
    orders: rowNumber(row ?? {}, "orders"),
    revenueCents: rowNumber(row ?? {}, "revenueCents")
  };
}
__name(paidOrderWindowSummary, "paidOrderWindowSummary");
function resolvePaidOrderStatus(order) {
  return order.status === "pending_payment" ? "confirmed" : order.status;
}
__name(resolvePaidOrderStatus, "resolvePaidOrderStatus");
function isInvoiceSentSubscriptionOrder(order) {
  return order.paymentStatus === "invoice_sent" && (order.notes ?? "").startsWith("Subscription:");
}
__name(isInvoiceSentSubscriptionOrder, "isInvoiceSentSubscriptionOrder");
async function insertStopForDeliveryOrder(db, order) {
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
  if (!day || day.type !== "delivery") return false;
  const [existing] = await db.select({ id: stops.id }).from(stops).where(eq(stops.orderId, order.id)).limit(1);
  if (existing) return false;
  const [seqRow] = await db.select({ maxSequence: sql`coalesce(max(${stops.sequence}), 0)` }).from(stops).where(eq(stops.deliveryDayId, order.deliveryDayId));
  const sequence = Number(seqRow?.maxSequence ?? 0) + 1;
  const runId = await ensureDriverRunForDeliveryDay2(db, order.deliveryDayId);
  await db.insert(stops).values({
    id: crypto.randomUUID(),
    deliveryDayId: order.deliveryDayId,
    runId,
    orderId: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone ?? "",
    address: order.deliveryAddress,
    items: order.items,
    sequence,
    status: "pending",
    customerNote: order.notes ?? null,
    lat: null,
    lng: null,
    createdAt: Date.now()
  });
  return true;
}
__name(insertStopForDeliveryOrder, "insertStopForDeliveryOrder");
async function ensureStopForPaidDeliveryOrder2(db, order) {
  if (order.paymentStatus !== "paid") return false;
  return insertStopForDeliveryOrder(db, order);
}
__name(ensureStopForPaidDeliveryOrder2, "ensureStopForPaidDeliveryOrder");
async function ensureStopForInvoiceSentSubscriptionOrder(db, order) {
  if (!isInvoiceSentSubscriptionOrder(order)) return false;
  return insertStopForDeliveryOrder(db, order);
}
__name(ensureStopForInvoiceSentSubscriptionOrder, "ensureStopForInvoiceSentSubscriptionOrder");
async function ensureDriverRunForDeliveryDay2(db, deliveryDayId) {
  const existingRuns = await db.select().from(deliveryRuns).where(eq(deliveryRuns.deliveryDayId, deliveryDayId));
  if (existingRuns.length === 1) return existingRuns[0].id;
  if (existingRuns.length > 1) return null;
  const activeDrivers = await db.select().from(users).where(and(
    or(eq(users.role, "driver"), eq(users.canDrive, true)),
    eq(users.active, true)
  ));
  if (activeDrivers.length !== 1) return null;
  const driver = activeDrivers[0];
  const now = Date.now();
  const runId = crypto.randomUUID();
  await db.insert(deliveryRuns).values({
    id: runId,
    deliveryDayId,
    name: driver.name || driver.email || "Delivery Run",
    zone: "All stops",
    color: "#1B3A2E",
    driverUid: driver.id,
    status: "pending",
    sequence: 0,
    notes: "Auto-created for single active driver so paid delivery stops are visible in the driver app.",
    createdAt: now
  });
  await db.update(deliveryDays).set({
    driverUid: driver.id,
    routeGenerated: true,
    routeGeneratedAt: now
  }).where(eq(deliveryDays.id, deliveryDayId));
  return runId;
}
__name(ensureDriverRunForDeliveryDay2, "ensureDriverRunForDeliveryDay");
async function squareGet(env, path) {
  if (!env.SQUARE_ACCESS_TOKEN) throw new Error("Square not configured");
  const res = await fetch(`${SQUARE_API5}${path}`, {
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Square-Version": "2024-01-18"
    }
  });
  const data = await res.json();
  if (data.errors) throw new Error(`Square lookup failed: ${JSON.stringify(data.errors).slice(0, 500)}`);
  return data;
}
__name(squareGet, "squareGet");
async function squareOrderMetadataMatchesOrder(squareOrderId, orderId, env) {
  if (!squareOrderId) return false;
  const data = await squareGet(env, `/orders/${squareOrderId}`);
  return data.order?.metadata?.orderId === orderId;
}
__name(squareOrderMetadataMatchesOrder, "squareOrderMetadataMatchesOrder");
async function findCompletedSquarePaymentByOrderReference(order, env) {
  const accessToken = env.SQUARE_ACCESS_TOKEN;
  const locationId = env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) return null;
  const orderRef = order.id.slice(0, 8).toUpperCase();
  const beginTime = new Date(Math.max(0, order.createdAt - 60 * 60 * 1e3)).toISOString();
  const paymentSearchEnd = order.createdAt + 14 * 24 * 60 * 60 * 1e3;
  const endTime = new Date(Math.min(paymentSearchEnd, Date.now() + 10 * 60 * 1e3)).toISOString();
  let cursor;
  let pages = 0;
  do {
    const params = new URLSearchParams({
      begin_time: beginTime,
      end_time: endTime,
      location_id: locationId,
      sort_order: "DESC",
      limit: "100"
    });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`${SQUARE_API5}/payments?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-01-18"
      }
    });
    const data = await res.json();
    if (data.errors) throw new Error(`Square payment lookup failed: ${JSON.stringify(data.errors).slice(0, 500)}`);
    for (const payment of data.payments ?? []) {
      const note = payment.note ?? "";
      const amountCents = payment.amount_money?.amount ?? 0;
      if (!payment.id || payment.status !== "COMPLETED" || amountCents < order.total) continue;
      if (note.toUpperCase().includes(`ORDER #${orderRef}`)) {
        return { paymentId: payment.id, amountCents, note, matchStrategy: "payment_note", squareOrderId: payment.order_id };
      }
      if (await squareOrderMetadataMatchesOrder(payment.order_id, order.id, env)) {
        return { paymentId: payment.id, amountCents, note, matchStrategy: "square_order_metadata", squareOrderId: payment.order_id };
      }
    }
    cursor = data.cursor;
    pages++;
  } while (cursor && pages < 5);
  return null;
}
__name(findCompletedSquarePaymentByOrderReference, "findCompletedSquarePaymentByOrderReference");
async function confirmOrderFromSquarePaymentMatch(db, order, env) {
  const match3 = await findCompletedSquarePaymentByOrderReference(order, env);
  if (!match3) return null;
  await db.update(orders).set({
    paymentStatus: "paid",
    status: resolvePaidOrderStatus(order),
    paymentIntentId: match3.paymentId,
    paymentProvider: "square",
    internalNotes: `${order.internalNotes ?? ""}
Square payment confirmed: payment=${match3.paymentId} amount=${match3.amountCents}c matched_by=${match3.matchStrategy}`.trim(),
    updatedAt: Date.now()
  }).where(eq(orders.id, order.id));
  await ensureStopForPaidDeliveryOrder2(db, order);
  return match3;
}
__name(confirmOrderFromSquarePaymentMatch, "confirmOrderFromSquarePaymentMatch");
async function confirmOrderFromSquarePayment(db, payment, env) {
  if (!payment.id || payment.status !== "COMPLETED") return null;
  const amountCents = payment.amount_money?.amount ?? 0;
  let order = null;
  let matchStrategy = "";
  if (payment.order_id) {
    const squareOrder = await squareGet(env, `/orders/${payment.order_id}`);
    const orderId = squareOrder.order?.metadata?.orderId;
    if (orderId) {
      const [row] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (row) {
        order = row;
        matchStrategy = "square_order_metadata";
      }
    }
  }
  if (!order) {
    const ref = payment.note?.toUpperCase().match(/ORDER #([A-Z0-9]{8})/)?.[1];
    if (ref) {
      const [row] = await db.select().from(orders).where(sql`upper(substr(${orders.id}, 1, 8)) = ${ref}`).limit(1);
      if (row) {
        order = row;
        matchStrategy = "payment_note";
      }
    }
  }
  if (!order || order.paymentStatus === "paid" || amountCents < order.total) return null;
  await db.update(orders).set({
    paymentStatus: "paid",
    status: resolvePaidOrderStatus(order),
    paymentIntentId: payment.id,
    paymentProvider: "square",
    internalNotes: `${order.internalNotes ?? ""}
Square webhook confirmed: payment=${payment.id} amount=${amountCents}c matched_by=${matchStrategy}`.trim(),
    updatedAt: Date.now()
  }).where(eq(orders.id, order.id));
  await ensureStopForPaidDeliveryOrder2(db, order);
  return { orderId: order.id, paymentId: payment.id, matchStrategy };
}
__name(confirmOrderFromSquarePayment, "confirmOrderFromSquarePayment");
function squarePaymentIdFromPayoutEntry(entry) {
  return entry?.type_charge_details?.payment_id ?? entry?.type_refunded_charge_details?.payment_id ?? entry?.payment_id ?? null;
}
__name(squarePaymentIdFromPayoutEntry, "squarePaymentIdFromPayoutEntry");
async function listRecentSquarePaymentIds(env, sinceMs) {
  const locationId = env.SQUARE_LOCATION_ID;
  if (!env.SQUARE_ACCESS_TOKEN || !locationId) return [];
  const beginTime = new Date(Math.max(0, sinceMs)).toISOString();
  const endTime = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
  const paymentIds = /* @__PURE__ */ new Set();
  let cursor;
  let pages = 0;
  do {
    const params = new URLSearchParams({
      begin_time: beginTime,
      end_time: endTime,
      location_id: locationId,
      sort_order: "DESC",
      limit: "100"
    });
    if (cursor) params.set("cursor", cursor);
    const paymentsResp = await squareGet(env, `/payments?${params}`);
    for (const payment of paymentsResp.payments ?? []) {
      if (payment?.id && payment.status === "COMPLETED") paymentIds.add(payment.id);
    }
    cursor = paymentsResp.cursor;
    pages++;
  } while (cursor && pages < 3);
  return [...paymentIds].slice(0, 200);
}
__name(listRecentSquarePaymentIds, "listRecentSquarePaymentIds");
async function listRecentSquarePayoutPaymentIds(env, sinceMs) {
  const locationId = env.SQUARE_LOCATION_ID;
  if (!env.SQUARE_ACCESS_TOKEN || !locationId) return [];
  const beginTime = new Date(Math.max(0, sinceMs - DAY_MS)).toISOString();
  const endTime = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
  const paymentIds = /* @__PURE__ */ new Set();
  let payoutCursor;
  let payoutPages = 0;
  do {
    const payoutParams = new URLSearchParams({
      location_id: locationId,
      begin_time: beginTime,
      end_time: endTime,
      sort_order: "DESC",
      limit: "100"
    });
    if (payoutCursor) payoutParams.set("cursor", payoutCursor);
    const payoutsResp = await squareGet(env, `/payouts?${payoutParams}`);
    for (const payout of payoutsResp.payouts ?? []) {
      if (!payout?.id) continue;
      let entryCursor;
      let entryPages = 0;
      do {
        const entryParams = new URLSearchParams({ limit: "100" });
        if (entryCursor) entryParams.set("cursor", entryCursor);
        const entriesResp = await squareGet(env, `/payouts/${payout.id}/payout-entries?${entryParams}`);
        for (const entry of entriesResp.payout_entries ?? []) {
          const paymentId = squarePaymentIdFromPayoutEntry(entry);
          if (paymentId) paymentIds.add(paymentId);
        }
        entryCursor = entriesResp.cursor;
        entryPages++;
      } while (entryCursor && entryPages < 5);
    }
    payoutCursor = payoutsResp.cursor;
    payoutPages++;
  } while (payoutCursor && payoutPages < 3);
  return [...paymentIds].slice(0, 200);
}
__name(listRecentSquarePayoutPaymentIds, "listRecentSquarePayoutPaymentIds");
async function reconcileSquarePaymentsById(db, env, paymentIds) {
  let reconciled = 0;
  for (let i = 0; i < paymentIds.length; i += 10) {
    const batch = paymentIds.slice(i, i + 10);
    const matches = await Promise.all(batch.map(async (paymentId) => {
      try {
        const paymentResp = await squareGet(env, `/payments/${paymentId}`);
        const match3 = await confirmOrderFromSquarePayment(db, paymentResp.payment, env);
        return match3 ? 1 : 0;
      } catch (e) {
        console.error(`[square-reconcile] failed to verify payout payment ${paymentId}:`, e);
        return 0;
      }
    }));
    reconciled += matches.reduce((sum2, count2) => sum2 + count2, 0);
  }
  return reconciled;
}
__name(reconcileSquarePaymentsById, "reconcileSquarePaymentsById");
async function reconcileRecentSquarePayments(db, env, sinceMs) {
  const paymentIds = await listRecentSquarePaymentIds(env, sinceMs);
  return reconcileSquarePaymentsById(db, env, paymentIds);
}
__name(reconcileRecentSquarePayments, "reconcileRecentSquarePayments");
async function reconcileRecentSquarePayoutPayments(db, env, sinceMs) {
  const paymentIds = await listRecentSquarePayoutPaymentIds(env, sinceMs);
  return reconcileSquarePaymentsById(db, env, paymentIds);
}
__name(reconcileRecentSquarePayoutPayments, "reconcileRecentSquarePayoutPayments");
function getLatestSquarePaymentLinkId(internalNotes) {
  const matches = [...(internalNotes ?? "").matchAll(/Square payment link:\s*(\S+)/g)];
  const paymentLinkId = matches.length ? matches[matches.length - 1][1] : null;
  return paymentLinkId && paymentLinkId !== "unknown" ? paymentLinkId : null;
}
__name(getLatestSquarePaymentLinkId, "getLatestSquarePaymentLinkId");
async function confirmOrderFromSquarePaymentLinkIfPaid(db, order, env) {
  const paymentLinkId = getLatestSquarePaymentLinkId(order.internalNotes);
  if (!paymentLinkId) return { match: null, reason: "missing_payment_link" };
  const linkResp = await squareGet(env, `/online-checkout/payment-links/${paymentLinkId}`);
  const squareOrderId = linkResp.payment_link?.order_id;
  if (!squareOrderId) return { match: null, reason: "missing_square_order" };
  const orderResp = await squareGet(env, `/orders/${squareOrderId}`);
  const squareOrder = orderResp.order;
  if (!squareOrder) return { match: null, reason: "missing_square_order" };
  if (squareOrder.state !== "COMPLETED") {
    return { match: null, squareState: squareOrder.state };
  }
  const tenderedCents = (squareOrder.tenders ?? []).reduce(
    (sum2, t) => sum2 + (t.amount_money?.amount ?? 0),
    0
  );
  const expectedCents = squareOrder.total_money?.amount ?? order.total;
  if (tenderedCents < expectedCents) {
    return { match: null, squareState: squareOrder.state, reason: "partial_tender" };
  }
  const paymentId = squareOrder.tenders?.[0]?.id ?? squareOrderId;
  await db.update(orders).set({
    paymentStatus: "paid",
    status: resolvePaidOrderStatus(order),
    paymentIntentId: paymentId,
    paymentProvider: "square",
    internalNotes: `${order.internalNotes ?? ""}
Square payment confirmed: order=${squareOrderId} amount=${tenderedCents}c matched_by=payment_link_square_order`.trim(),
    updatedAt: Date.now()
  }).where(eq(orders.id, order.id));
  await ensureStopForPaidDeliveryOrder2(db, order);
  return {
    match: {
      paymentId,
      amountCents: tenderedCents,
      matchStrategy: "payment_link_square_order",
      squareOrderId
    },
    squareState: squareOrder.state
  };
}
__name(confirmOrderFromSquarePaymentLinkIfPaid, "confirmOrderFromSquarePaymentLinkIfPaid");
function getLatestSquareInvoiceId(internalNotes) {
  const matches = [...(internalNotes ?? "").matchAll(/Square invoice sent:\s*(inv:[^\s\n]+)/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}
__name(getLatestSquareInvoiceId, "getLatestSquareInvoiceId");
async function confirmOrderFromSquareInvoiceIfPaid(db, order, env) {
  const accessToken = env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) return null;
  const invoiceId = getLatestSquareInvoiceId(order.internalNotes);
  if (!invoiceId) return null;
  const res = await fetch(`${SQUARE_API5}/invoices/${invoiceId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": "2024-01-18"
    }
  });
  const data = await res.json();
  if (data.errors) throw new Error(`Square invoice lookup failed: ${JSON.stringify(data.errors).slice(0, 500)}`);
  const invoice = data.invoice;
  if (!invoice || invoice.status !== "PAID") return null;
  const amountCents = invoice.total_money?.amount ?? null;
  await db.update(orders).set({
    paymentStatus: "paid",
    status: resolvePaidOrderStatus(order),
    paymentIntentId: invoiceId,
    paymentProvider: "square",
    internalNotes: `${order.internalNotes ?? ""}
Square invoice paid: invoice=${invoiceId} amount=${amountCents ?? "unknown"}c matched_by=invoice_status`.trim(),
    updatedAt: Date.now()
  }).where(eq(orders.id, order.id));
  await ensureStopForPaidDeliveryOrder2(db, order);
  return { invoiceId, invoiceStatus: invoice.status, amountCents };
}
__name(confirmOrderFromSquareInvoiceIfPaid, "confirmOrderFromSquareInvoiceIfPaid");
async function reconcileOutstandingSquarePayments(env, options = {}) {
  const db = drizzle(env.DB);
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
  const pendingOrders = await db.select().from(orders).where(or(
    eq(orders.paymentStatus, "awaiting_payment"),
    eq(orders.paymentStatus, "invoice_sent")
  )).orderBy(desc(orders.createdAt)).limit(limit);
  const oldestPendingCreatedAt = pendingOrders.reduce(
    (oldest, order) => Math.min(oldest, order.createdAt),
    Date.now()
  );
  let reconciled = 0;
  let failed = 0;
  if (options.deepSearch && pendingOrders.length > 0) {
    try {
      const directLookbackStart = Math.max(oldestPendingCreatedAt, Date.now() - 3 * DAY_MS);
      reconciled += await reconcileRecentSquarePayments(db, env, directLookbackStart);
      const payoutLookbackStart = Math.max(oldestPendingCreatedAt, Date.now() - 7 * DAY_MS);
      reconciled += await reconcileRecentSquarePayoutPayments(db, env, payoutLookbackStart);
    } catch (e) {
      failed++;
      console.error("[square-reconcile] failed to scan recent Square payments:", e);
    }
  }
  for (const order of pendingOrders) {
    const internalNotes = order.internalNotes ?? "";
    try {
      if (order.paymentStatus === "awaiting_payment" && internalNotes.includes("Square payment link")) {
        const direct = await confirmOrderFromSquarePaymentLinkIfPaid(db, order, env);
        if (direct.match) {
          reconciled++;
          continue;
        }
        if (options.deepSearch || direct.squareState) {
          const match3 = await confirmOrderFromSquarePaymentMatch(db, order, env);
          if (match3) {
            reconciled++;
            continue;
          }
        }
      }
      if (order.paymentStatus === "invoice_sent" && internalNotes.includes("Square invoice sent")) {
        const match3 = await confirmOrderFromSquareInvoiceIfPaid(db, order, env);
        if (match3) reconciled++;
      }
    } catch (e) {
      failed++;
      console.error(`[square-reconcile] failed for order ${order.id}:`, e);
    }
  }
  return { checked: pendingOrders.length, reconciled, failed };
}
__name(reconcileOutstandingSquarePayments, "reconcileOutstandingSquarePayments");
app20.use("*", cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://oconner.pages.dev",
    "https://butcher-storefront.pages.dev",
    "https://butcher-admin.pages.dev",
    "https://butcher-driver.pages.dev",
    "https://admin.oconner.com.au",
    "https://driver.oconner.com.au",
    "https://oconnoragriculture.com.au",
    "https://www.oconnoragriculture.com.au",
    "https://admin.oconnoragriculture.com.au",
    "https://driver.oconnoragriculture.com.au"
  ],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Driver-Rescue-Pin", "X-Staff-Rescue-Pin"],
  credentials: true
}));
app20.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));
app20.get("/api/orders/mine", async (c) => {
  const clerk = await verifyClerkToken(c.req.header("Authorization") ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: "Unauthorized" }, 401);
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customers).where(eq(customers.clerkId, clerk.clerkId)).limit(1);
  if (!customer) return c.json([]);
  const rows = await db.select().from(orders).where(eq(orders.customerId, customer.id)).orderBy(desc(orders.createdAt));
  return c.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items), deliveryAddress: JSON.parse(o.deliveryAddress) })));
});
app20.get("/api/customers/me", async (c) => {
  const clerk = await verifyClerkToken(c.req.header("Authorization") ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: "Unauthorized" }, 401);
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customers).where(eq(customers.clerkId, clerk.clerkId)).limit(1);
  if (!customer) return c.json(null);
  return c.json({ ...customer, addresses: JSON.parse(customer.addresses) });
});
app20.patch("/api/customers/me", async (c) => {
  try {
    const clerk = await verifyClerkToken(c.req.header("Authorization") ?? null, c.env.CLERK_SECRET_KEY);
    if (!clerk) return c.json({ error: "Unauthorized" }, 401);
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const resolvedEmail = body.email || clerk.email || "";
    let [customer] = await db.select().from(customers).where(eq(customers.clerkId, clerk.clerkId)).limit(1);
    if (!customer) {
      const now = Date.now();
      const id = crypto.randomUUID();
      await db.insert(customers).values({
        id,
        clerkId: clerk.clerkId,
        email: resolvedEmail,
        name: body.name || resolvedEmail || "Customer",
        phone: body.phone ?? "",
        addresses: JSON.stringify(body.addresses ?? []),
        createdAt: now,
        updatedAt: now
      });
      return c.json({ ok: true });
    }
    const patch = { updatedAt: Date.now() };
    if (body.phone !== void 0) patch.phone = body.phone;
    if (body.addresses !== void 0) patch.addresses = JSON.stringify(body.addresses);
    if (body.name !== void 0) patch.name = body.name;
    if (!customer.email && resolvedEmail) patch.email = resolvedEmail;
    if (!customer.name && (body.name || resolvedEmail)) patch.name = body.name || resolvedEmail;
    await db.update(customers).set(patch).where(eq(customers.id, customer.id));
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("PATCH /api/customers/me failed:", message);
    return c.json({ error: message }, 500);
  }
});
app20.get("/api/subscriptions/mine", async (c) => {
  const clerk = await verifyClerkToken(c.req.header("Authorization") ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: "Unauthorized" }, 401);
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.email, clerk.email)).orderBy(desc(subscriptions.createdAt));
  return c.json(rows);
});
app20.get("/api/products", async (c) => {
  const db = drizzle(c.env.DB);
  const { activeOnly } = c.req.query();
  const rows = activeOnly === "true" ? await db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.displayOrder)) : await db.select().from(products).orderBy(asc(products.displayOrder));
  return c.json(rows.map((p) => ({ ...p, weightOptions: p.weightOptions ? JSON.parse(p.weightOptions) : null })));
});
app20.get("/api/products/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const [p] = await db.select().from(products).where(eq(products.id, c.req.param("id"))).limit(1);
  if (!p) return c.json({ error: "Not found" }, 404);
  return c.json({ ...p, weightOptions: p.weightOptions ? JSON.parse(p.weightOptions) : null });
});
app20.get("/api/delivery-days", async (c) => {
  const db = drizzle(c.env.DB);
  const { upcoming } = c.req.query();
  const now = Date.now();
  const rows = upcoming === "true" ? await db.select().from(deliveryDays).where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, now))).orderBy(asc(deliveryDays.date)) : await db.select().from(deliveryDays).where(eq(deliveryDays.active, true)).orderBy(asc(deliveryDays.date));
  return c.json(rows);
});
app20.get("/api/orders/:id/tracking", async (c) => {
  const db = drizzle(c.env.DB);
  const [order] = await db.select().from(orders).where(eq(orders.id, c.req.param("id"))).limit(1);
  if (!order) return c.json({ error: "Not found" }, 404);
  let items = [];
  let deliveryAddress = {};
  try {
    items = JSON.parse(order.items);
  } catch {
  }
  try {
    deliveryAddress = JSON.parse(order.deliveryAddress);
  } catch {
  }
  return c.json({
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryDayId: order.deliveryDayId,
    deliveryAddress,
    items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    gst: order.gst,
    total: order.total,
    promoCode: order.promoCode,
    promoDiscount: order.promoDiscount,
    proofUrl: order.proofUrl,
    customerName: order.customerName,
    // first-name / display name only — already on the address label
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  });
});
app20.post("/api/orders", async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();
  const now = Date.now();
  const orderId = crypto.randomUUID();
  let customerId = body.customerId;
  if (!customerId) {
    const newId = crypto.randomUUID();
    const inserted = await db.insert(customers).values({
      id: newId,
      email: body.customerEmail,
      name: body.customerName ?? "",
      phone: body.customerPhone ?? "",
      clerkId: body.clerkId ?? null,
      accountType: "registered",
      orderCount: 0,
      totalSpent: 0,
      blacklisted: false,
      notes: "",
      createdAt: now,
      updatedAt: now
    }).onConflictDoUpdate({
      target: customers.email,
      // On a duplicate email, only patch clerkId if the existing row hasn't got one yet — preserves admin-set names/phones.
      set: { clerkId: sql`COALESCE(${customers.clerkId}, ${body.clerkId ?? null})`, updatedAt: now }
    }).returning({ id: customers.id });
    customerId = inserted[0]?.id ?? newId;
  }
  const verifiedItems = [];
  for (const item of body.items) {
    const [prod] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (prod) {
      const qty = item.quantity ?? 1;
      const correctLineTotal = prod.isMeatPack ? (prod.fixedPrice ?? 0) * qty : Math.round((prod.pricePerKg ?? 0) * (item.weight ? item.weight / 1e3 : item.weightKg ?? 1));
      verifiedItems.push({ ...item, fixedPrice: prod.fixedPrice, pricePerKg: prod.pricePerKg, lineTotal: correctLineTotal });
    } else {
      verifiedItems.push(item);
    }
  }
  const verifiedSubtotal = verifiedItems.reduce((s, i) => s + (i.lineTotal ?? 0), 0);
  const deliveryFee = Math.max(0, Number(body.deliveryFee ?? 0));
  const requestedPromoId = String(body.promoId ?? "").trim();
  const requestedPromoCode = String(body.promoCode ?? "").trim().toUpperCase();
  let promoDiscount = 0;
  let appliedPromoId = null;
  let appliedPromoCode = null;
  if (requestedPromoId || requestedPromoCode) {
    const [promo] = requestedPromoId ? await db.select().from(promoCodes).where(eq(promoCodes.id, requestedPromoId)).limit(1) : await db.select().from(promoCodes).where(eq(promoCodes.code, requestedPromoCode)).limit(1);
    if (!promo) {
      return c.json({ error: "Promo code is no longer valid. Please remove it and try again." }, 400);
    }
    if (!promo.active) {
      return c.json({ error: "This promo code is no longer active. Please remove it and try again." }, 400);
    }
    if (promo.expiresAt && Date.now() > promo.expiresAt) {
      return c.json({ error: "This promo code has expired. Please remove it and try again." }, 400);
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return c.json({ error: "This promo code has been fully redeemed. Please remove it and try again." }, 400);
    }
    if (promo.minOrder && verifiedSubtotal < promo.minOrder) {
      return c.json({ error: "This order no longer meets the promo code minimum spend." }, 400);
    }
    if (!promoAllowsDeliveryDay(promo, body.deliveryDayId)) {
      return c.json({ error: "This promo code is only valid for selected delivery days. Please choose an eligible day or remove the code." }, 400);
    }
    promoDiscount = promo.type === "percentage" ? Math.round(verifiedSubtotal * (promo.value / 100)) : Math.min(promo.value, verifiedSubtotal);
    appliedPromoId = promo.id;
    appliedPromoCode = promo.code;
  }
  const discountedSubtotal = Math.max(0, verifiedSubtotal - promoDiscount);
  const total = discountedSubtotal + deliveryFee;
  body.subtotal = verifiedSubtotal;
  body.deliveryFee = deliveryFee;
  body.total = total;
  const { deliveryDayStock: deliveryDayStock2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const stockDayId = await getStockDayId(db, body.deliveryDayId);
  const dayAllocations = await db.select().from(deliveryDayStock2).where(eq(deliveryDayStock2.deliveryDayId, stockDayId));
  const reserveResult = await reserveDayStock(db, dayAllocations, verifiedItems);
  if (!reserveResult.ok) {
    return c.json({ error: reserveResult.error }, 400);
  }
  if (appliedPromoId) {
    const consumed = await consumePromoCode(db, appliedPromoId, now);
    if (!consumed.ok) {
      for (const item of verifiedItems) {
        const alloc = dayAllocations.find((a) => a.productId === item.productId);
        if (!alloc) continue;
        const qty = item.weight ? item.weight / 1e3 : item.weightKg ?? item.quantity ?? 1;
        if (qty <= 0) continue;
        await db.update(deliveryDayStock2).set({ sold: sql`${deliveryDayStock2.sold} - ${qty}` }).where(eq(deliveryDayStock2.id, alloc.id));
      }
      return c.json({ error: consumed.error }, 400);
    }
  }
  const SAFE_INITIAL_STATUSES = /* @__PURE__ */ new Set(["pending_payment", "awaiting_payment"]);
  const initialPaymentStatus = SAFE_INITIAL_STATUSES.has(String(body.paymentStatus ?? "")) ? body.paymentStatus : "pending_payment";
  await db.insert(orders).values({
    ...body,
    id: orderId,
    customerId,
    items: JSON.stringify(verifiedItems),
    deliveryAddress: JSON.stringify(body.deliveryAddress),
    subtotal: verifiedSubtotal,
    deliveryFee,
    total,
    status: "pending_payment",
    promoCode: appliedPromoCode,
    promoDiscount,
    paymentStatus: initialPaymentStatus,
    createdAt: now,
    updatedAt: now
  });
  await deductStock(db, verifiedItems, orderId, now);
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, body.deliveryDayId)).limit(1);
  if (day) await db.update(deliveryDays).set({ orderCount: sql`${deliveryDays.orderCount} + 1` }).where(eq(deliveryDays.id, day.id));
  await db.update(customers).set({ orderCount: sql`${customers.orderCount} + 1`, totalSpent: sql`${customers.totalSpent} + ${total}`, updatedAt: now }).where(eq(customers.id, customerId));
  return c.json({ id: orderId }, 201);
});
app20.post("/api/subscriptions", async (c) => {
  const url = new URL(c.req.url);
  url.pathname = "/";
  const newReq = new Request(url.toString(), { method: "POST", headers: c.req.raw.headers, body: c.req.raw.body });
  return subscriptions_default.fetch(newReq, c.env);
});
app20.post("/api/subscriptions/checkout", async (c) => {
  const { default: subsRouter } = await Promise.resolve().then(() => (init_subscriptions2(), subscriptions_exports2));
  const url = new URL(c.req.url);
  url.pathname = "/checkout";
  const newReq = new Request(url.toString(), { method: "POST", headers: c.req.raw.headers, body: c.req.raw.body });
  return subsRouter.fetch(newReq, c.env);
});
app20.route("/api/push", push_default);
app20.route("/api/reels", app16);
app20.post("/api/promo-codes/validate", async (c) => {
  const { promoCodes: promoCodesTable } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle(c.env.DB);
  const { code, subtotal, deliveryDayId } = await c.req.json();
  const codeUpper = code.toUpperCase().trim();
  const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, codeUpper)).limit(1);
  if (!promo) return c.json({ valid: false, error: "Invalid promo code" });
  if (!promo.active) return c.json({ valid: false, error: "This code is no longer active" });
  if (promo.expiresAt && Date.now() > promo.expiresAt) return c.json({ valid: false, error: "This code has expired" });
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return c.json({ valid: false, error: "This code has been fully redeemed" });
  if (promo.minOrder && subtotal < promo.minOrder) {
    const min2 = (promo.minOrder / 100).toFixed(2);
    return c.json({ valid: false, error: `Minimum order of $${min2} required for this code` });
  }
  if (!promoAllowsDeliveryDay(promo, deliveryDayId)) {
    return c.json({ valid: false, error: "This code is only valid for selected delivery days" });
  }
  let discount = 0;
  if (promo.type === "percentage") {
    discount = Math.round(subtotal * (promo.value / 100));
  } else {
    discount = Math.min(promo.value, subtotal);
  }
  return c.json({
    valid: true,
    promoId: promo.id,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    discount,
    label: promo.type === "percentage" ? `${promo.value}% off` : `$${(promo.value / 100).toFixed(2)} off`,
    deliveryDayIds: parsePromoDeliveryDayIds(promo.deliveryDayIds)
  });
});
app20.post("/api/contact", async (c) => {
  const { name: name2, email, subject, message } = await c.req.json();
  if (!name2 || !email || !message) return c.json({ error: "Missing required fields" }, 400);
  const { sendEmail: sendEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
  await sendEmail2({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL,
    to: "orders@oconnoragriculture.com.au",
    subject: `Website enquiry${subject ? `: ${subject}` : ""} \u2014 from ${name2}`,
    html: `<p><strong>Name:</strong> ${name2}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject ?? "(none)"}</p><hr/><p>${message.replace(/\n/g, "<br>")}</p>`
  });
  return c.json({ ok: true });
});
app20.get("/api/ticker", async (c) => {
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { eq: eq3 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const { config: config2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle2(c.env.DB);
  const [tickerRow] = await db.select().from(config2).where(eq3(config2.key, "ticker")).limit(1);
  if (!tickerRow) return c.json({ enabled: false, items: [] });
  const data = JSON.parse(tickerRow.value);
  if (!data.enabled) return c.json({ enabled: false, items: [] });
  return c.json({ enabled: true, items: data.items ?? [], facebookPageUrl: data.facebookPageUrl ?? null });
});
app20.post("/api/orders/:id/payment-link", async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  const storefrontUrl = c.env.STOREFRONT_URL ?? "https://oconnoragriculture.com.au";
  if (!accessToken || !locationId) return c.json({ error: "Square not configured" }, 400);
  const db = drizzle(c.env.DB);
  const orderId = c.req.param("id");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  const items = JSON.parse(order.items);
  const promoDiscount = Math.max(0, order.promoDiscount ?? 0);
  const promoCode = (order.promoCode ?? "").trim();
  const metadata = promoCode ? { orderId, promoCode } : { orderId };
  try {
    const squareLineItems = items.map((i) => ({
      name: i.productName ?? "Item",
      quantity: String(i.quantity ?? 1),
      base_price_money: { amount: Math.round(i.lineTotal / (i.quantity ?? 1)), currency: "AUD" }
    }));
    if (order.deliveryFee > 0) {
      squareLineItems.push({ name: "Delivery Fee", quantity: "1", base_price_money: { amount: order.deliveryFee, currency: "AUD" } });
    }
    const res = await fetch(`${SQUARE_API5}/online-checkout/payment-links`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Square-Version": "2024-01-18" },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId,
          line_items: squareLineItems,
          discounts: promoDiscount > 0 ? [{
            uid: "promo_discount",
            name: promoCode ? `Promo ${promoCode}` : "Promo discount",
            type: "FIXED_AMOUNT",
            scope: "ORDER",
            amount_money: { amount: promoDiscount, currency: "AUD" }
          }] : void 0,
          metadata
        },
        checkout_options: {
          redirect_url: `${storefrontUrl}/checkout/success?orderId=${orderId}`,
          merchant_support_email: "orders@oconnoragriculture.com.au"
        },
        payment_note: `O'Connor Agriculture \u2014 Order #${orderId.slice(0, 8).toUpperCase()}`
      })
    });
    const data = await res.json();
    if (data.errors) return c.json({ error: "Failed to create payment link", details: data.errors }, 400);
    const paymentUrl = data.payment_link?.url ?? data.payment_link?.long_url;
    if (!paymentUrl) return c.json({ error: "Payment link created but no URL returned" }, 500);
    await db.update(orders).set({
      paymentStatus: "awaiting_payment",
      paymentProvider: "square",
      internalNotes: `${order.internalNotes ?? ""}
Square payment link: ${data.payment_link?.id ?? "unknown"}`.trim(),
      updatedAt: Date.now()
    }).where(eq(orders.id, orderId));
    return c.json({ ok: true, paymentUrl });
  } catch (e) {
    return c.json({ error: e?.message ?? "Payment link creation failed" }, 500);
  }
});
app20.post("/api/orders/:id/mark-paid", async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const db = drizzle(c.env.DB);
  const orderId = c.req.param("id");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);
  if (order.paymentStatus === "invoice_sent") {
    const match3 = await confirmOrderFromSquareInvoiceIfPaid(db, order, c.env);
    if (match3) {
      return c.json({ ok: true, status: "paid", matchStrategy: "invoice_status", invoiceId: match3.invoiceId });
    }
    return c.json({ ok: true, status: order.paymentStatus });
  }
  if (order.paymentStatus !== "pending_payment" && order.paymentStatus !== "awaiting_payment") {
    return c.json({ ok: true, status: order.paymentStatus });
  }
  if (!accessToken) {
    return c.json({ error: "Square not configured" }, 503);
  }
  const paymentLinkId = getLatestSquarePaymentLinkId(order.internalNotes);
  if (!paymentLinkId) {
    return c.json({ error: "No Square payment link associated with this order" }, 400);
  }
  try {
    const linkResp = await squareGet(c.env, `/online-checkout/payment-links/${paymentLinkId}`);
    if (linkResp.errors) {
      return c.json({ error: "Could not load payment link from Square", details: linkResp.errors }, 502);
    }
    const squareOrderId = linkResp.payment_link?.order_id;
    if (!squareOrderId) {
      return c.json({ error: "Square payment link has no associated order" }, 502);
    }
    const orderResp = await squareGet(c.env, `/orders/${squareOrderId}`);
    if (orderResp.errors) {
      return c.json({ error: "Could not load Square order", details: orderResp.errors }, 502);
    }
    const squareOrder = orderResp.order;
    if (!squareOrder) {
      return c.json({ error: "Square returned no order" }, 502);
    }
    if (squareOrder.state !== "COMPLETED") {
      const match3 = await confirmOrderFromSquarePaymentMatch(db, order, c.env);
      if (match3) {
        return c.json({ ok: true, status: "paid", matchStrategy: match3.matchStrategy, paymentId: match3.paymentId });
      }
      return c.json({ ok: true, status: "pending", squareState: squareOrder.state });
    }
    const tenderedCents = (squareOrder.tenders ?? []).reduce(
      (sum2, t) => sum2 + (t.amount_money?.amount ?? 0),
      0
    );
    const expectedCents = squareOrder.total_money?.amount ?? 0;
    if (tenderedCents < expectedCents) {
      return c.json({ ok: true, status: "partial", tenderedCents, expectedCents });
    }
    await db.update(orders).set({
      paymentStatus: "paid",
      status: "confirmed",
      paymentIntentId: squareOrder.tenders?.[0]?.id ?? squareOrderId,
      paymentProvider: "square",
      internalNotes: `${order.internalNotes ?? ""}
Square payment confirmed: order=${squareOrderId} amount=${tenderedCents}c`.trim(),
      updatedAt: Date.now()
    }).where(eq(orders.id, orderId));
    await ensureStopForPaidDeliveryOrder2(db, order);
    return c.json({ ok: true, status: "paid" });
  } catch (e) {
    return c.json({ error: e?.message ?? "Failed to verify payment" }, 500);
  }
});
async function base64HmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
__name(base64HmacSha256, "base64HmacSha256");
function timingSafeEqual(a, b) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const max2 = Math.max(left.length, right.length);
  for (let i = 0; i < max2; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
async function verifySquareWebhookSignature(c, rawBody) {
  const signatureKey = c.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) return false;
  const signature = c.req.header("x-square-hmacsha256-signature") ?? "";
  const notificationUrl = c.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? new URL(c.req.url).toString();
  const expected = await base64HmacSha256(signatureKey, `${notificationUrl}${rawBody}`);
  return timingSafeEqual(expected, signature);
}
__name(verifySquareWebhookSignature, "verifySquareWebhookSignature");
app20.post("/api/square/webhook", async (c) => {
  const rawBody = await c.req.text();
  if (!await verifySquareWebhookSignature(c, rawBody)) {
    return c.json({ error: "Invalid Square signature" }, 403);
  }
  const event = JSON.parse(rawBody);
  const eventId = event.event_id;
  if (!eventId) return c.json({ error: "Missing event id" }, 400);
  const db = drizzle(c.env.DB);
  try {
    await db.insert(processedWebhooks).values({ id: eventId, source: "square", receivedAt: Date.now() });
  } catch {
    return c.json({ ok: true, duplicate: true });
  }
  if (event.type !== "payment.created" && event.type !== "payment.updated") {
    return c.json({ ok: true, ignored: event.type });
  }
  const payment = event.data?.object?.payment;
  if (!payment) return c.json({ ok: true, ignored: "missing_payment" });
  const match3 = await confirmOrderFromSquarePayment(db, payment, c.env);
  return c.json({ ok: true, matched: Boolean(match3), ...match3 });
});
app20.post("/api/track/pageview", async (c) => {
  try {
    const ua = c.req.header("User-Agent") ?? "";
    if (TRACK_BOT_UA_RE.test(ua)) return c.body(null, 204);
    const originHost = parseHostname(c.req.header("Origin") ?? null);
    const refererHost = parseHostname(c.req.header("Referer") ?? null);
    if (originHost && !TRACK_PROD_HOSTS.has(originHost)) return c.body(null, 204);
    if (!originHost && refererHost && !TRACK_PROD_HOSTS.has(refererHost)) return c.body(null, 204);
    const body = await c.req.json().catch(() => null);
    const path = sanitizeTrackPath(body?.path);
    if (!path) return c.body(null, 204);
    const itemId = sanitizeTrackItemId(body?.itemId);
    const ip = (c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For")?.split(",")[0] ?? "unknown").trim();
    const dayStamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
    const sessionHash = await sha256Hex(`${ip}|${ua}|${dayStamp}|${c.env.ENVIRONMENT ?? "prod"}`);
    const db = drizzle(c.env.DB);
    await db.insert(pageEvents).values({
      id: crypto.randomUUID(),
      path,
      itemId,
      sessionHash,
      referrerHost: cleanReferrerHost(c.req.raw),
      countryCode: countryCode(c.req.raw),
      deviceType: deviceType(ua),
      browser: browserName(ua),
      os: osName(ua),
      createdAt: Date.now()
    });
  } catch (error) {
    console.warn("[track/pageview]", error);
  }
  return c.body(null, 204);
});
app20.get("/api/config/:key", async (c) => {
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { eq: eq3 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const { config: config2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle2(c.env.DB);
  const [row] = await db.select().from(config2).where(eq3(config2.key, c.req.param("key"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ key: row.key, value: JSON.parse(row.value) });
});
app20.route("/api/driver-rescue", driverRescue_default);
app20.route("/api/admin-rescue", adminRescue_default);
app20.use("/api/*", requireAuth);
app20.get("/api/insights", requireRole("admin"), async (c) => {
  const now = Date.now();
  const todayStart = startOfBrisbaneDay(now);
  const weekStart = now - WEEK_MS;
  const monthStart = now - MONTH_MS;
  const seriesStart = startOfBrisbaneDay(now - 13 * DAY_MS);
  const [
    todayTraffic,
    weekTraffic,
    monthTraffic,
    todayOrders,
    weekOrders,
    monthOrders,
    lastEvent,
    topPagesResult,
    topItemsResult,
    referrersResult,
    countriesResult,
    devicesResult,
    browsersResult,
    osResult,
    recentSessionsResult,
    seriesResult
  ] = await Promise.all([
    visitorWindowSummary(c.env, todayStart),
    visitorWindowSummary(c.env, weekStart),
    visitorWindowSummary(c.env, monthStart),
    paidOrderWindowSummary(c.env, todayStart),
    paidOrderWindowSummary(c.env, weekStart),
    paidOrderWindowSummary(c.env, monthStart),
    c.env.DB.prepare("SELECT created_at AS lastEventAt FROM page_events ORDER BY created_at DESC LIMIT 1").first(),
    c.env.DB.prepare(`
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ? AND (item_id IS NULL OR item_id = '')
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `).bind(monthStart).all(),
    c.env.DB.prepare(`
      SELECT
        pe.item_id AS itemId,
        COALESCE(p.name, pe.item_id) AS name,
        COUNT(*) AS views,
        COUNT(DISTINCT pe.session_hash) AS visitors
      FROM page_events pe
      LEFT JOIN products p ON p.id = pe.item_id
      WHERE pe.created_at >= ? AND pe.item_id IS NOT NULL AND pe.item_id != ''
      GROUP BY pe.item_id
      ORDER BY views DESC
      LIMIT 10
    `).bind(monthStart).all(),
    c.env.DB.prepare(`
      SELECT COALESCE(referrer_host, 'Direct') AS referrer, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(referrer_host, 'Direct')
      ORDER BY views DESC
      LIMIT 10
    `).bind(monthStart).all(),
    c.env.DB.prepare(`
      SELECT COALESCE(country_code, 'Unknown') AS country, COUNT(*) AS events, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(country_code, 'Unknown')
      ORDER BY events DESC
      LIMIT 10
    `).bind(monthStart).all(),
    c.env.DB.prepare(`
      SELECT COALESCE(device_type, 'unknown') AS label, COUNT(*) AS events, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(device_type, 'unknown')
      ORDER BY events DESC
    `).bind(monthStart).all(),
    c.env.DB.prepare(`
      SELECT COALESCE(browser, 'Other') AS label, COUNT(*) AS events, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(browser, 'Other')
      ORDER BY events DESC
      LIMIT 8
    `).bind(monthStart).all(),
    c.env.DB.prepare(`
      SELECT COALESCE(os, 'Other') AS label, COUNT(*) AS events, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(os, 'Other')
      ORDER BY events DESC
      LIMIT 8
    `).bind(monthStart).all(),
    c.env.DB.prepare(`
      SELECT
        session_hash AS id,
        MIN(created_at) AS firstSeen,
        MAX(created_at) AS lastSeen,
        COUNT(CASE WHEN item_id IS NULL OR item_id = '' THEN 1 END) AS pageviews,
        COUNT(CASE WHEN item_id IS NOT NULL AND item_id != '' THEN 1 END) AS itemViews,
        GROUP_CONCAT(DISTINCT path) AS paths,
        COALESCE(MIN(referrer_host), 'Direct') AS referrer,
        COALESCE(MAX(country_code), 'Unknown') AS country,
        COALESCE(MAX(device_type), 'unknown') AS device,
        COALESCE(MAX(browser), 'Other') AS browser,
        COALESCE(MAX(os), 'Other') AS os
      FROM page_events
      WHERE created_at >= ?
      GROUP BY session_hash
      ORDER BY lastSeen DESC
      LIMIT 20
    `).bind(monthStart).all(),
    c.env.DB.prepare(`
      SELECT created_at AS createdAt, item_id AS itemId, session_hash AS sessionHash
      FROM page_events
      WHERE created_at >= ?
      ORDER BY created_at ASC
    `).bind(seriesStart).all()
  ]);
  const dailyMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < 14; i++) {
    const date = dayKeyFromMs(seriesStart + i * DAY_MS);
    dailyMap.set(date, { date, visitors: /* @__PURE__ */ new Set(), pageviews: 0, itemViews: 0 });
  }
  const hourlyToday = Array.from({ length: 24 }, (_, hour) => ({ hour, events: 0, visitors: /* @__PURE__ */ new Set() }));
  for (const row of asList(seriesResult)) {
    const createdAt = rowNumber(row, "createdAt");
    const sessionHash = rowString(row, "sessionHash");
    const date = dayKeyFromMs(createdAt);
    const bucket = dailyMap.get(date);
    if (bucket) {
      bucket.visitors.add(sessionHash);
      if (rowString(row, "itemId")) bucket.itemViews += 1;
      else bucket.pageviews += 1;
    }
    if (createdAt >= todayStart) {
      const hour = localHourFromMs(createdAt);
      hourlyToday[hour].events += 1;
      hourlyToday[hour].visitors.add(sessionHash);
    }
  }
  const formatTraffic = /* @__PURE__ */ __name((traffic) => ({
    visitors: traffic.visitors,
    pageviews: traffic.pageviews,
    itemViews: traffic.itemViews,
    events: traffic.events
  }), "formatTraffic");
  return c.json({
    generatedAt: now,
    window: { todayStart, weekStart, monthStart },
    tracker: {
      lastEventAt: lastEvent?.lastEventAt ? Number(lastEvent.lastEventAt) : null
    },
    traffic: {
      today: formatTraffic(todayTraffic),
      week: formatTraffic(weekTraffic),
      month: formatTraffic(monthTraffic),
      dailySeries: [...dailyMap.values()].map((bucket) => ({
        date: bucket.date,
        visitors: bucket.visitors.size,
        pageviews: bucket.pageviews,
        itemViews: bucket.itemViews
      })),
      hourlyToday: hourlyToday.map((bucket) => ({
        hour: bucket.hour,
        events: bucket.events,
        visitors: bucket.visitors.size
      }))
    },
    orders: {
      todayCount: todayOrders.orders,
      todayRevenueCents: todayOrders.revenueCents,
      weekCount: weekOrders.orders,
      weekRevenueCents: weekOrders.revenueCents,
      monthCount: monthOrders.orders,
      monthRevenueCents: monthOrders.revenueCents
    },
    conversion: {
      todayOrderRate: pct(todayOrders.orders, todayTraffic.visitors),
      weekOrderRate: pct(weekOrders.orders, weekTraffic.visitors),
      monthOrderRate: pct(monthOrders.orders, monthTraffic.visitors),
      weekRevenuePerVisitorCents: centsPer(weekOrders.revenueCents, weekTraffic.visitors),
      monthRevenuePerVisitorCents: centsPer(monthOrders.revenueCents, monthTraffic.visitors)
    },
    topPages: asList(topPagesResult).map((row) => ({
      path: rowString(row, "path", "/"),
      views: rowNumber(row, "views"),
      visitors: rowNumber(row, "visitors")
    })),
    topItems: asList(topItemsResult).map((row) => ({
      itemId: rowString(row, "itemId"),
      name: rowString(row, "name", rowString(row, "itemId")),
      views: rowNumber(row, "views"),
      visitors: rowNumber(row, "visitors")
    })),
    acquisition: {
      referrers: asList(referrersResult).map((row) => ({
        referrer: rowString(row, "referrer", "Direct"),
        views: rowNumber(row, "views"),
        visitors: rowNumber(row, "visitors")
      })),
      countries: asList(countriesResult).map((row) => ({
        country: rowString(row, "country", "Unknown"),
        events: rowNumber(row, "events"),
        visitors: rowNumber(row, "visitors")
      }))
    },
    technology: {
      devices: asList(devicesResult).map((row) => ({
        label: rowString(row, "label", "unknown"),
        events: rowNumber(row, "events"),
        visitors: rowNumber(row, "visitors")
      })),
      browsers: asList(browsersResult).map((row) => ({
        label: rowString(row, "label", "Other"),
        events: rowNumber(row, "events"),
        visitors: rowNumber(row, "visitors")
      })),
      os: asList(osResult).map((row) => ({
        label: rowString(row, "label", "Other"),
        events: rowNumber(row, "events"),
        visitors: rowNumber(row, "visitors")
      }))
    },
    recentSessions: asList(recentSessionsResult).map((row) => ({
      id: rowString(row, "id").slice(0, 8).toUpperCase(),
      firstSeen: rowNumber(row, "firstSeen"),
      lastSeen: rowNumber(row, "lastSeen"),
      pageviews: rowNumber(row, "pageviews"),
      itemViews: rowNumber(row, "itemViews"),
      paths: rowString(row, "paths").split(",").filter(Boolean).slice(0, 6),
      referrer: rowString(row, "referrer", "Direct"),
      country: rowString(row, "country", "Unknown"),
      device: rowString(row, "device", "unknown"),
      browser: rowString(row, "browser", "Other"),
      os: rowString(row, "os", "Other")
    }))
  });
});
app20.post("/api/square/reconcile", requireRole("admin"), async (c) => {
  const rawLimit = Number(c.req.query("limit") ?? "10");
  const limit = Number.isFinite(rawLimit) ? rawLimit : 10;
  const deepSearch = c.req.query("deep") === "true";
  const result = await reconcileOutstandingSquarePayments(c.env, { limit, deepSearch });
  return c.json({ ok: true, ...result });
});
app20.get("/api/ops/guardrails", requireRole("admin"), async (c) => {
  const result = await runOpsGuardrails(c.env, { repair: false });
  return c.json(result, result.ok ? 200 : 409);
});
app20.post("/api/ops/guardrails/repair", requireRole("admin"), async (c) => {
  const result = await runOpsGuardrails(c.env, { repair: true });
  return c.json({ ...result, repaired: result.repaired });
});
app20.route("/api/orders", orders_default);
app20.route("/api/products", products_default);
app20.route("/api/delivery-days", deliveryDays_default);
app20.route("/api/stops", stops_default);
app20.route("/api/customers", customers_default);
app20.route("/api/users", users_default);
app20.route("/api/drivers", drivers_default);
app20.route("/api/delivery-runs", deliveryRuns_default);
app20.route("/api/stock", stock_default);
app20.route("/api/subscriptions", subscriptions_default);
app20.route("/api/reports", reports_default);
app20.route("/api/promo-codes", promoCodes_default);
app20.route("/api/businesses", businesses_default);
app20.route("/api/receipts", receipts_default);
app20.route("/webhook", stripe_default);
app20.post("/api/staff/invite", requireAuth, requireRole("admin"), async (c) => {
  const body = await c.req.json();
  if (!body.email || !body.name) return c.json({ error: "Name and email required" }, 400);
  const { sendEmail: sendEmail2, escapeHtml: escapeHtml3 } = await Promise.resolve().then(() => (init_email(), email_exports));
  const adminUrl = c.env.STOREFRONT_URL?.replace("butcher-storefront", "butcher-admin") || "https://admin.oconnoragriculture.com.au";
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#4E7732">Welcome to O'Connor Agriculture</h2>
      <p>Hi ${escapeHtml3(body.name)},</p>
      <p>You've been invited to join the <strong>O'Connor Agriculture</strong> team as <strong>${escapeHtml3(body.role)}</strong>.</p>
      <p>Click the button below to create your account and get access to the admin dashboard:</p>
      <div style="text-align:center;margin:30px 0">
        <a href="${escapeHtml3(adminUrl)}" style="background:#4E7732;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">
          Create Your Account
        </a>
      </div>
      <p style="color:#666;font-size:13px">Use your email <strong>${escapeHtml3(body.email)}</strong> when signing up so your account is linked automatically.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <p style="color:#999;font-size:12px">O'Connor Agriculture \u2014 Paddock to plate</p>
    </div>
  `;
  const result = await sendEmail2({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL || "orders@oconnoragriculture.com.au",
    to: body.email,
    subject: `You're invited to join O'Connor Agriculture`,
    html
  });
  if (!result) return c.json({ error: "Failed to send email" }, 500);
  return c.json({ ok: true });
});
app20.get("/api/audit-log", requireAuth, requireRole("admin"), async (c) => {
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { desc: desc2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const { auditLog: auditLog2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle2(c.env.DB);
  const rows = await db.select().from(auditLog2).orderBy(desc2(auditLog2.timestamp)).limit(100);
  return c.json(rows.map((e) => ({ ...e, before: JSON.parse(e.before), after: JSON.parse(e.after) })));
});
app20.get("/api/push/admin/stats", requireAuth, requireRole("admin"), async (c) => {
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { sql: sql4 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const { pushSubscriptions: pushSubscriptions2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle2(c.env.DB);
  const [row] = await db.select({ count: sql4`count(*)` }).from(pushSubscriptions2);
  return c.json({ subscribers: Number(row?.count ?? 0) });
});
app20.post("/api/push/admin/test-send", requireAuth, requireRole("admin"), async (c) => {
  const { title, body, url } = await c.req.json();
  const user = c.get("user");
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { eq: eq3 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const { pushSubscriptions: pushSubscriptions2, customers: customers3 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const { sendPush: sendPush2 } = await Promise.resolve().then(() => (init_webpush(), webpush_exports));
  const db = drizzle2(c.env.DB);
  const [customer] = await db.select().from(customers3).where(eq3(customers3.email, user.email)).limit(1);
  if (!customer) return c.json({ error: "No customer record for your account" }, 404);
  const subs = await db.select().from(pushSubscriptions2).where(eq3(pushSubscriptions2.customerId, customer.id));
  if (!subs.length) return c.json({ error: "No push subscriptions found for your account. Subscribe first from the storefront." }, 404);
  const contact = `mailto:${c.env.FROM_EMAIL.replace(/.*<(.+)>/, "$1")}`;
  let sent = 0;
  for (const s of subs) {
    const ok = await sendPush2({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url }, c.env.VAPID_PUBLIC_KEY, c.env.VAPID_PRIVATE_KEY, contact);
    if (ok) sent++;
  }
  return c.json({ sent, total: subs.length });
});
app20.post("/api/push/admin/broadcast", requireAuth, requireRole("admin"), async (c) => {
  const { title, body, url } = await c.req.json();
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { pushSubscriptions: pushSubscriptions2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const { sendPush: sendPush2 } = await Promise.resolve().then(() => (init_webpush(), webpush_exports));
  const db = drizzle2(c.env.DB);
  const subs = await db.select().from(pushSubscriptions2);
  const contact = `mailto:${c.env.FROM_EMAIL.replace(/.*<(.+)>/, "$1")}`;
  let sent = 0;
  for (const s of subs) {
    const ok = await sendPush2({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url }, c.env.VAPID_PUBLIC_KEY, c.env.VAPID_PRIVATE_KEY, contact);
    if (ok) sent++;
  }
  return c.json({ sent, total: subs.length });
});
app20.get("/api/notifications", requireAuth, async (c) => {
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { desc: desc2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
  const { notifications: notifications2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle2(c.env.DB);
  const rows = await db.select().from(notifications2).orderBy(desc2(notifications2.sentAt)).limit(200);
  return c.json(rows);
});
app20.get("/api/config", requireAuth, requireRole("admin"), async (c) => {
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { config: config2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle2(c.env.DB);
  const rows = await db.select().from(config2);
  const result = {};
  for (const row of rows) result[row.key] = JSON.parse(row.value);
  return c.json(result);
});
app20.put("/api/config", requireAuth, requireRole("admin"), async (c) => {
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { config: config2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle2(c.env.DB);
  const body = await c.req.json();
  const user = c.get("user");
  const now = Date.now();
  for (const [key, value] of Object.entries(body)) {
    await db.insert(config2).values({ key, value: JSON.stringify(value), updatedAt: now, updatedBy: user.email }).onConflictDoUpdate({ target: config2.key, set: { value: JSON.stringify(value), updatedAt: now, updatedBy: user.email } });
  }
  return c.json({ ok: true });
});
app20.put("/api/config/:key", requireAuth, requireRole("admin"), async (c) => {
  const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
  const { config: config2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const db = drizzle2(c.env.DB);
  const value = await c.req.json();
  const user = c.get("user");
  const now = Date.now();
  await db.insert(config2).values({ key: c.req.param("key"), value: JSON.stringify(value), updatedAt: now, updatedBy: user.email }).onConflictDoUpdate({ target: config2.key, set: { value: JSON.stringify(value), updatedAt: now, updatedBy: user.email } });
  return c.json({ ok: true });
});
app20.post("/api/generate-post", requireAuth, requireRole("admin"), async (c) => {
  const { brand, platform, postType, tone, extraContext } = await c.req.json();
  const brandName = "O'Connor Agriculture";
  const platformGuide = {
    facebook: "Conversational, community-focused, 1\u20133 paragraphs, include a call to action.",
    instagram: "Visual storytelling, punchy, use 5\u201310 relevant hashtags at the end.",
    linkedin: "Professional tone, highlight quality and sustainability, 2\u20133 paragraphs."
  };
  const typeGuide = {
    product: "Promote a specific product or range from the farm shop.",
    farm_update: "Share a genuine update from life on the farm.",
    seasonal: "Highlight seasonal availability or upcoming events.",
    recipe: "Share a recipe idea using farm products.",
    community: "Engage the local community with a warm, personal message.",
    educational: "Educate followers about farming practices, animal welfare, or food quality."
  };
  const toneGuide = {
    warm: "Warm, authentic, and personal.",
    exciting: "Exciting, bold, and energetic.",
    informative: "Informative and clear.",
    humorous: "Light-hearted and a little humorous.",
    heartfelt: "Heartfelt and sincere."
  };
  const prompt = `You are a social media manager for ${brandName}, a family-run Australian farm and butcher selling premium ethically-raised meat direct to customers.

Write a single ${platform} post. Guidelines:
- Platform: ${platformGuide[platform] ?? platform}
- Post type: ${typeGuide[postType] ?? postType}
- Tone: ${toneGuide[tone] ?? tone}
${extraContext ? `- Extra context: ${extraContext}` : ""}

Output ONLY the post text, nothing else. No commentary, no "Here is your post:", just the post itself.`;
  try {
    const result = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: `You are a social media copywriter for ${brandName}, an Australian farm and butcher. Write authentic, on-brand posts.` },
        { role: "user", content: prompt }
      ],
      max_tokens: 500
    });
    return c.json({ post: result.response ?? "" });
  } catch {
    return c.json({ error: "AI generation failed. Workers AI may not be available." }, 500);
  }
});
app20.post("/api/images/generate", requireAuth, async (c) => {
  const { prompt } = await c.req.json();
  if (!prompt) return c.json({ error: "Prompt required" }, 400);
  try {
    let imageBytes;
    const result = await c.env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt });
    if (result && typeof result === "object" && "image" in result) {
      const binary = atob(result.image);
      imageBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
    } else {
      const reader = result.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const total = chunks.reduce((s, ch) => s + ch.length, 0);
      imageBytes = new Uint8Array(total);
      let off = 0;
      for (const chunk of chunks) {
        imageBytes.set(chunk, off);
        off += chunk.length;
      }
    }
    const key = `${crypto.randomUUID()}.png`;
    await c.env.IMAGES.put(key, imageBytes, { httpMetadata: { contentType: "image/png" } });
    const baseUrl = new URL(c.req.url).origin;
    return c.json({ url: `${baseUrl}/images/${key}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image generation failed";
    return c.json({ error: message }, 500);
  }
});
app20.post("/api/images/upload", requireAuth, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file) return c.json({ error: "No file" }, 400);
  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const baseUrl = new URL(c.req.url).origin;
  return c.json({ url: `${baseUrl}/images/${key}`, key });
});
app20.get("/images/*", async (c) => {
  const key = c.req.path.slice("/images/".length);
  const obj = await c.env.IMAGES.get(key);
  if (!obj) return c.json({ error: "Not found" }, 404);
  return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType ?? "image/jpeg", "Cache-Control": "public, max-age=31536000" } });
});
var index_default = app20;
var scheduled = /* @__PURE__ */ __name(async (event, env) => {
  if (event.cron === "0 8 * * *") {
    const { drizzle: drizzle2 } = await Promise.resolve().then(() => (init_d1(), d1_exports));
    const { eq: eq3, and: and3, gte: gte2, lt: lt2, desc: desc2, like: like2 } = await Promise.resolve().then(() => (init_drizzle_orm(), drizzle_orm_exports));
    const { deliveryDays: deliveryDays2, orders: orders2, notifications: notifications2, subscriptions: subscriptions2, customers: customers3, products: products2 } = await Promise.resolve().then(() => (init_src(), src_exports));
    const { sendEmail: sendEmail2, buildOrderEmail: buildOrderEmail2, getSubject: getSubject2 } = await Promise.resolve().then(() => (init_email(), email_exports));
    const db = drizzle2(env.DB);
    try {
      const now = Date.now();
      const FREQ_MS = {
        weekly: 7 * 24 * 60 * 60 * 1e3,
        fortnightly: 14 * 24 * 60 * 60 * 1e3,
        monthly: 30 * 24 * 60 * 60 * 1e3
      };
      const { createSubscriptionOrder: createSubscriptionOrder2 } = await Promise.resolve().then(() => (init_subscriptions(), subscriptions_exports));
      const activeSubs = await db.select().from(subscriptions2).where(eq3(subscriptions2.status, "active"));
      for (const sub of activeSubs) {
        const interval = FREQ_MS[sub.frequency] ?? FREQ_MS.fortnightly;
        const lastGenerated = sub.lastOrderGeneratedAt ?? sub.createdAt;
        const nextDueDate = lastGenerated + interval;
        if (now < nextDueDate - interval * 0.2) continue;
        let customerId = sub.customerId;
        if (!customerId) {
          const [cust] = await db.select().from(customers3).where(eq3(customers3.email, sub.email)).limit(1);
          if (!cust) continue;
          customerId = cust.id;
        }
        const [customer] = await db.select().from(customers3).where(eq3(customers3.id, customerId)).limit(1);
        if (!customer) continue;
        let address = { line1: "", suburb: "", state: "QLD", postcode: "" };
        try {
          const addrs = JSON.parse(customer.addresses ?? "[]");
          if (addrs.length > 0) address = addrs[0];
        } catch {
        }
        if (!address.line1) {
          const [lastOrder] = await db.select().from(orders2).where(eq3(orders2.customerId, customerId)).orderBy(desc2(orders2.createdAt)).limit(1);
          if (lastOrder) {
            try {
              address = JSON.parse(lastOrder.deliveryAddress);
            } catch {
            }
          }
        }
        if (!address.line1) continue;
        const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
        const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;
        let [boxProduct] = await db.select().from(products2).where(eq3(products2.id, boxId)).limit(1);
        if (!boxProduct) [boxProduct] = await db.select().from(products2).where(eq3(products2.id, `prod-${boxId}-box`)).limit(1);
        if (!boxProduct) [boxProduct] = await db.select().from(products2).where(like2(products2.name, `%${boxName.replace(" Box", "")}%Box%`)).limit(1);
        const price = boxProduct?.fixedPrice ?? 0;
        const resolvedBoxId = boxProduct?.id ?? boxId;
        if (!price) continue;
        const orderId = await createSubscriptionOrder2(db, {
          customerId,
          email: sub.email,
          name: customer.name ?? sub.email,
          phone: customer.phone ?? "",
          address,
          boxId: resolvedBoxId,
          boxName,
          frequency: sub.frequency,
          price,
          subscriptionId: sub.id,
          now,
          env
        });
        if (!orderId) continue;
        const updateData = { lastOrderGeneratedAt: now, updatedAt: now };
        if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
        await db.update(subscriptions2).set(updateData).where(eq3(subscriptions2.id, sub.id));
      }
    } catch (e) {
      console.error("Subscription auto-generate failed:", e);
    }
    try {
      const result = await reconcileOutstandingSquarePayments(env, { limit: 50, deepSearch: true });
      if (result.reconciled > 0) console.log(`[square-reconcile] marked ${result.reconciled} orders paid`);
    } catch (e) {
      console.error("Square payment reconciliation failed:", e);
    }
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const tomorrowDays = await db.select().from(deliveryDays2).where(and3(eq3(deliveryDays2.active, true), gte2(deliveryDays2.date, tomorrow.getTime()), lt2(deliveryDays2.date, dayAfter.getTime())));
    for (const day of tomorrowDays) {
      const pendingOrders = await db.select().from(orders2).where(and3(eq3(orders2.deliveryDayId, day.id), eq3(orders2.status, "confirmed")));
      const { formatBrisbaneDate: formatBrisbaneDate2 } = await Promise.resolve().then(() => (init_time(), time_exports));
      const dateLabel = formatBrisbaneDate2(day.date);
      for (const order of pendingOrders) {
        const emailData = {
          customerName: order.customerName,
          orderId: order.id,
          orderItems: JSON.parse(order.items),
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          gst: order.gst,
          total: order.total,
          deliveryDate: dateLabel,
          deliveryAddress: order.deliveryAddress,
          trackingUrl: `${env.STOREFRONT_URL}/track/${order.id}`
        };
        const result = await sendEmail2({ apiKey: env.RESEND_API_KEY, from: env.FROM_EMAIL, to: order.customerEmail, subject: getSubject2("day_before", emailData), html: buildOrderEmail2("day_before", emailData) });
        const { notifyCustomer: notifyCustomer2 } = await Promise.resolve().then(() => (init_push(), push_exports));
        await notifyCustomer2(db, order.customerId, { title: "O'Connor \u2014 Delivery Tomorrow", body: `Your order arrives ${dateLabel}. Tap to track.`, url: `${env.STOREFRONT_URL}/track/${order.id}` }, env);
        await db.insert(notifications2).values({ id: crypto.randomUUID(), orderId: order.id, customerId: order.customerId, type: "day_before", status: result ? "sent" : "failed", recipientEmail: order.customerEmail, resendId: result?.id ?? null, sentAt: Date.now() });
      }
    }
    try {
      const { stops: stopsTable } = await Promise.resolve().then(() => (init_src(), src_exports));
      const stale = await db.select().from(orders2).where(and3(eq3(orders2.status, "pending_payment"), lt2(orders2.createdAt, Date.now() - 12 * 60 * 60 * 1e3)));
      for (const order of stale) {
        const items = JSON.parse(order.items);
        await releaseDayStock(db, order.deliveryDayId, items);
        await restoreStock(db, items, order.id, Date.now());
        await db.update(orders2).set({
          status: "cancelled",
          paymentStatus: "cancelled",
          internalNotes: (order.internalNotes ? order.internalNotes + "\n" : "") + "[auto-cancelled by daily cron: pending_payment > 12h, customer abandoned checkout]",
          updatedAt: Date.now()
        }).where(eq3(orders2.id, order.id));
        await db.delete(stopsTable).where(eq3(stopsTable.orderId, order.id));
        await db.update(deliveryDays).set({ orderCount: sql`${deliveryDays.orderCount} - 1` }).where(and3(eq3(deliveryDays.id, order.deliveryDayId), gte2(deliveryDays.orderCount, 1)));
        await db.update(customers).set({
          orderCount: sql`${customers.orderCount} - 1`,
          totalSpent: sql`${customers.totalSpent} - ${order.total}`,
          updatedAt: Date.now()
        }).where(and3(eq3(customers.id, order.customerId), gte2(customers.orderCount, 1)));
      }
      if (stale.length > 0) console.log(`[cron] auto-cancelled ${stale.length} stale pending_payment orders`);
    } catch (e) {
      console.error("Stale order sweep failed:", e);
    }
    try {
      const guardrails = await runOpsGuardrails(env, { repair: true });
      if (guardrails.issues.length > 0 || guardrails.repaired > 0) {
        console.log(`[ops-guardrails] ok=${guardrails.ok} issues=${guardrails.issues.length} repaired=${guardrails.repaired}`);
        for (const issue of guardrails.issues.slice(0, 10)) {
          console.log(`[ops-guardrails] ${issue.severity} ${issue.code}: ${issue.message}`);
        }
      }
    } catch (e) {
      console.error("Ops guardrail check failed:", e);
    }
    const today = /* @__PURE__ */ new Date();
    if (today.getDay() === 4) {
      try {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
        const weekOrders = await db.select().from(orders2).where(and3(gte2(orders2.createdAt, weekAgo), eq3(orders2.status, "confirmed")));
        const salesByProduct = {};
        for (const order of weekOrders) {
          const items = JSON.parse(order.items);
          for (const item of items) {
            const key = item.productName;
            if (!salesByProduct[key]) salesByProduct[key] = { name: item.productName, qty: 0, weightKg: 0, revenue: 0 };
            salesByProduct[key].qty += item.quantity ?? 1;
            salesByProduct[key].weightKg += item.weightKg ?? item.weight ?? 0;
            salesByProduct[key].revenue += item.lineTotal ?? 0;
          }
        }
        const sorted = Object.values(salesByProduct).sort((a, b) => b.revenue - a.revenue);
        const totalRevenue = sorted.reduce((sum2, p) => sum2 + p.revenue, 0);
        const totalOrders = weekOrders.length;
        const weekStart = new Date(weekAgo).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
        const weekEnd = today.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
        const rows = sorted.map(
          (p) => `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500">${p.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${p.qty}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${p.weightKg ? p.weightKg.toFixed(1) + " kg" : "\u2014"}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">$${(p.revenue / 100).toFixed(2)}</td>
          </tr>`
        ).join("");
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
            <div style="background:#4E7732;padding:20px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:white;margin:0;font-size:20px">\u{1F969} Weekly Meat Audit</h1>
              <p style="color:#E8F2DC;margin:4px 0 0;font-size:14px">${weekStart} \u2014 ${weekEnd}</p>
            </div>
            <div style="padding:20px 24px;background:#f9fafb;border:1px solid #eee;border-top:none">
              <div style="display:flex;gap:20px;margin-bottom:20px">
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Total Orders</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">${totalOrders}</p>
                </div>
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Total Revenue</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">$${(totalRevenue / 100).toFixed(2)}</p>
                </div>
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Products Sold</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">${sorted.length}</p>
                </div>
              </div>
              <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee">
                <thead>
                  <tr style="background:#4E7732;color:white">
                    <th style="padding:10px 12px;text-align:left;font-size:13px">Product</th>
                    <th style="padding:10px 12px;text-align:center;font-size:13px">Qty</th>
                    <th style="padding:10px 12px;text-align:center;font-size:13px">Weight</th>
                    <th style="padding:10px 12px;text-align:right;font-size:13px">Revenue</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                  <tr style="background:#f0f0f0;font-weight:bold">
                    <td style="padding:10px 12px" colspan="3">Total</td>
                    <td style="padding:10px 12px;text-align:right">$${(totalRevenue / 100).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <p style="color:#999;font-size:11px;margin-top:16px;text-align:center">
                Automated weekly audit from O'Connor Agriculture
              </p>
            </div>
          </div>`;
        await sendEmail2({
          apiKey: env.RESEND_API_KEY,
          from: env.FROM_EMAIL,
          to: "oconnoragriculture@gmail.com",
          subject: `\u{1F969} Weekly Meat Audit \u2014 ${weekStart} to ${weekEnd}`,
          html
        });
        console.log("Thursday meat audit email sent");
      } catch (e) {
        console.error("Thursday audit email failed:", e);
      }
    }
  }
}, "scheduled");
export {
  index_default as default,
  scheduled
};
//# sourceMappingURL=index.js.map
