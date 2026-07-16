/* ==========================================================
   NEXORA AI
   CLIENT ENGINE
   Version: 1.0.0
   ========================================================== */

import {
    API_CONFIG,
    API_PRIORITY,
    CACHE,
    REQUEST
} from "./config.js";

/* ==========================================================
   HTTP STATUS CODES
   ========================================================== */

export const HTTP_STATUS = {

    OK: 200,

    CREATED: 201,

    ACCEPTED: 202,

    NO_CONTENT: 204,

    BAD_REQUEST: 400,

    UNAUTHORIZED: 401,

    FORBIDDEN: 403,

    NOT_FOUND: 404,

    TOO_MANY_REQUESTS: 429,

    SERVER_ERROR: 500,

    SERVICE_UNAVAILABLE: 503

};

/* ==========================================================
   CLIENT CLASS
   ========================================================== */

class NexoraClient {

    constructor(){

        this.defaultTimeout = REQUEST.timeout;

        this.retryCount = REQUEST.retryCount;

        this.retryDelay = REQUEST.retryDelay;

        this.controllers = new Map();

        this.pendingRequests = new Map();

    }

    /* ======================================
       BASE URL
       ====================================== */

    getBaseUrl(provider){

        if(!API_CONFIG[provider]){

            throw new Error(`Provider "${provider}" not found.`);

        }

        return API_CONFIG[provider].baseUrl;

    }

    /* ======================================
       API KEY
       ====================================== */

    getApiKey(provider){

        return API_CONFIG[provider].apiKey;

    }

    /* ======================================
       HEADERS
       ====================================== */

    createHeaders(extraHeaders = {}){

        return {

            "Content-Type":"application/json",

            "Accept":"application/json",

            "Cache-Control":"no-cache",

            ...extraHeaders

        };

    }

    /* ======================================
       URL BUILDER
       ====================================== */

    buildUrl(baseUrl,path,query={}){

        const url = new URL(path,baseUrl);

        Object.entries(query).forEach(([key,value])=>{

            if(value!==undefined && value!==null){

                url.searchParams.append(key,value);

            }

        });

        return url.toString();

    }

    /* ======================================
       ABORT CONTROLLER
       ====================================== */

    createController(requestId){

        const controller = new AbortController();

        this.controllers.set(requestId,controller);

        return controller;

    }

    abort(requestId){

        if(this.controllers.has(requestId)){

            this.controllers.get(requestId).abort();

            this.controllers.delete(requestId);

        }

    }

    /* ======================================
       TIMEOUT
       ====================================== */

    timeoutPromise(ms,controller){

        return new Promise((_,reject)=>{

            setTimeout(()=>{

                controller.abort();

                reject(new Error("Request timeout"));

            },ms);

        });

    }

    /* ======================================
       RESPONSE PARSER
       ====================================== */

    async parseResponse(response){

        if(!response.ok){

            throw new Error(

                `HTTP ${response.status}`

            );

        }

        const contentType =

            response.headers.get("content-type");

        if(contentType &&
            contentType.includes("application/json")){

            return await response.json();

        }

        return await response.text();

    }

}

/* ==========================================================
   SINGLETON
   ========================================================== */

const client = new NexoraClient();

export default client;

/* ==========================================================
   END OF PART 1
   ========================================================== */

   /* ==========================================================
   REQUEST ENGINE
   ========================================================== */

NexoraClient.prototype.request = async function({

    provider,

    method = "GET",

    path = "",

    query = {},

    body = null,

    headers = {}

}) {

    const requestId = crypto.randomUUID();

    const controller = this.createController(requestId);

    const url = this.buildUrl(

        this.getBaseUrl(provider),

        path,

        query

    );

    const options = {

        method,

        signal: controller.signal,

        headers: this.createHeaders(headers)

    };

    if (body !== null) {

        options.body = JSON.stringify(body);

    }

    try {

        const response = await Promise.race([

            fetch(url, options),

            this.timeoutPromise(

                this.defaultTimeout,

                controller

            )

        ]);

        const data = await this.parseResponse(response);

        this.controllers.delete(requestId);

        return {

            success: true,

            provider,

            status: response.status,

            data

        };

    } catch (error) {

        this.controllers.delete(requestId);

        throw error;

    }

};

/* ==========================================================
   GET
   ========================================================== */

NexoraClient.prototype.get = function(

    provider,

    path,

    query = {},

    headers = {}

){

    return this.request({

        provider,

        method: "GET",

        path,

        query,

        headers

    });

};

/* ==========================================================
   POST
   ========================================================== */

NexoraClient.prototype.post = function(

    provider,

    path,

    body = {},

    headers = {}

){

    return this.request({

        provider,

        method: "POST",

        path,

        body,

        headers

    });

};

/* ==========================================================
   PUT
   ========================================================== */

NexoraClient.prototype.put = function(

    provider,

    path,

    body = {},

    headers = {}

){

    return this.request({

        provider,

        method: "PUT",

        path,

        body,

        headers

    });

};

/* ==========================================================
   DELETE
   ========================================================== */

NexoraClient.prototype.delete = function(

    provider,

    path,

    headers = {}

){

    return this.request({

        provider,

        method: "DELETE",

        path,

        headers

    });

};

/* ==========================================================
   PATCH
   ========================================================== */

NexoraClient.prototype.patch = function(

    provider,

    path,

    body = {},

    headers = {}

){

    return this.request({

        provider,

        method: "PATCH",

        path,

        body,

        headers

    });

};

/* ==========================================================
   END OF PART 2
   ========================================================== */

   /* ==========================================================
   CACHE + RETRY + REQUEST QUEUE
   ========================================================== */

NexoraClient.prototype.cache = new Map();

NexoraClient.prototype.requestQueue = [];

NexoraClient.prototype.activeRequests = 0;

/* ======================================
   CACHE KEY
====================================== */

NexoraClient.prototype.createCacheKey = function (

    provider,

    path,

    query = {}

) {

    return `${provider}:${path}:${JSON.stringify(query)}`;

};

/* ======================================
   GET CACHE
====================================== */

NexoraClient.prototype.getCache = function (key) {

    if (!CACHE.enabled) return null;

    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expire) {

        this.cache.delete(key);

        return null;

    }

    return item.data;

};

/* ======================================
   SET CACHE
====================================== */

NexoraClient.prototype.setCache = function (

    key,

    data,

    ttl = 30000

) {

    if (!CACHE.enabled) return;

    this.cache.set(key, {

        data,

        expire: Date.now() + ttl

    });

};

/* ======================================
   RETRY
====================================== */

NexoraClient.prototype.retry = async function (

    callback,

    retries = this.retryCount

) {

    let lastError;

    for (let i = 0; i <= retries; i++) {

        try {

            return await callback();

        }

        catch (error) {

            lastError = error;

            if (i < retries) {

                await new Promise(resolve =>

                    setTimeout(

                        resolve,

                        this.retryDelay

                    )

                );

            }

        }

    }

    throw lastError;

};

/* ======================================
   REQUEST QUEUE
====================================== */

NexoraClient.prototype.enqueue = async function (

    callback

) {

    while (

        this.activeRequests >=

        REQUEST.maxConcurrentRequests

    ) {

        await new Promise(resolve =>

            setTimeout(resolve,100)

        );

    }

    this.activeRequests++;

    try {

        return await callback();

    }

    finally {

        this.activeRequests--;

    }

};

/* ======================================
   SMART GET
====================================== */

NexoraClient.prototype.smartGet = async function (

    provider,

    path,

    query = {},

    ttl = 30000

) {

    const key =

        this.createCacheKey(

            provider,

            path,

            query

        );

    const cached =

        this.getCache(key);

    if (cached) {

        return cached;

    }

    const result =

        await this.enqueue(() =>

            this.retry(() =>

                this.get(

                    provider,

                    path,

                    query

                )

            )

        );

    this.setCache(

        key,

        result,

        ttl

    );

    return result;

};

/* ==========================================================
   END OF PART 3
   ========================================================== */

   /* ==========================================================
   NEXORA SHIELD
   API HEALTH & FAILOVER SYSTEM
   ========================================================== */

NexoraClient.prototype.providers = {};

Object.keys(API_CONFIG).forEach(provider => {

    this.providers = this.providers || {};

});

for (const provider in API_CONFIG) {

    client.providers[provider] = {

        online: true,

        responseTime: 0,

        success: 0,

        failed: 0,

        lastCheck: null

    };

}

/* ======================================
   START TIMER
====================================== */

NexoraClient.prototype.startTimer = function () {

    return performance.now();

};

/* ======================================
   STOP TIMER
====================================== */

NexoraClient.prototype.stopTimer = function (

    provider,

    start

) {

    const elapsed = performance.now() - start;

    this.providers[provider].responseTime = elapsed;

    this.providers[provider].lastCheck = Date.now();

};

/* ======================================
   SUCCESS
====================================== */

NexoraClient.prototype.markSuccess = function (

    provider

) {

    this.providers[provider].online = true;

    this.providers[provider].success++;

};

/* ======================================
   FAILURE
====================================== */

NexoraClient.prototype.markFailure = function (

    provider

) {

    this.providers[provider].failed++;

    if (

        this.providers[provider].failed >= 3

    ) {

        this.providers[provider].online = false;

    }

};

/* ======================================
   RESET
====================================== */

NexoraClient.prototype.resetProvider = function (

    provider

) {

    this.providers[provider].online = true;

    this.providers[provider].failed = 0;

};

/* ======================================
   NEXT PROVIDER
====================================== */

NexoraClient.prototype.nextProvider = function (

    service

) {

    const list = API_PRIORITY[service];

    if (!list) return null;

    for (const provider of list) {

        if (

            this.providers[provider] &&

            this.providers[provider].online

        ) {

            return provider;

        }

    }

    return list[0];

};

/* ======================================
   HEALTH REPORT
====================================== */

NexoraClient.prototype.health = function () {

    return this.providers;

};

/* ======================================
   FASTEST PROVIDER
====================================== */

NexoraClient.prototype.fastestProvider = function (

    service

) {

    const providers = API_PRIORITY[service];

    if (!providers) return null;

    return providers.sort((a, b) =>

        this.providers[a].responseTime -

        this.providers[b].responseTime

    )[0];

};

/* ==========================================================
   END OF PART 4
   ========================================================== */

   /* ==========================================================
   NEXORA CLIENT UTILITIES
   PART 5
   ========================================================== */

/* ======================================
   CLEAR CACHE
====================================== */

NexoraClient.prototype.clearCache = function () {

    this.cache.clear();

};

/* ======================================
   RESET PROVIDERS
====================================== */

NexoraClient.prototype.resetProviders = function () {

    Object.keys(this.providers).forEach(provider => {

        this.providers[provider].online = true;
        this.providers[provider].success = 0;
        this.providers[provider].failed = 0;
        this.providers[provider].responseTime = 0;
        this.providers[provider].lastCheck = null;

    });

};

/* ======================================
   CLIENT STATS
====================================== */

NexoraClient.prototype.stats = function () {

    return {

        cacheSize: this.cache.size,

        activeRequests: this.activeRequests,

        providers: this.providers

    };

};

/* ======================================
   LOGGER
====================================== */

NexoraClient.prototype.log = function (

    type,

    message,

    data = null

) {

    const time = new Date().toLocaleTimeString();

    console.log(

        `[NEXORA ${type}] ${time}`,

        message,

        data || ""

    );

};

/* ======================================
   DEBUG
====================================== */

NexoraClient.prototype.debug = function () {

    console.table(this.providers);

    console.log(

        "Cache:",

        this.cache

    );

};

/* ======================================
   VERSION
====================================== */

NexoraClient.prototype.version = function () {

    return "Nexora Client Engine v1.0.0";

};

/* ======================================
   EXPORTS
====================================== */

export {

    client

};

export const request = client.request.bind(client);

export const get = client.get.bind(client);

export const post = client.post.bind(client);

export const put = client.put.bind(client);

export const patch = client.patch.bind(client);

export const del = client.delete.bind(client);

export const smartGet = client.smartGet.bind(client);

export const clearCache = client.clearCache.bind(client);

export const resetProviders = client.resetProviders.bind(client);

export const stats = client.stats.bind(client);

export const debug = client.debug.bind(client);

/* ==========================================================
   END OF CLIENT.JS
   ========================================================== */