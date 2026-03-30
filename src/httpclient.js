/**
 * Generic HTTP Client Adapter for OpenSeadragon
 */
(function($) {
    // todo for simplicity, still support headers from the old openseadragon configuration
    // todo add support for crossOriginPolicy setup and ajaxHeaders
    $.DefaultHttpClient = class DefaultHttpClient {
        // todo async not supported yet, need to replace with $.Promise
        async request(url, { method = "GET", headers = {}, body, signal } = {}) {
            const response = await fetch(url, { method, headers, body, signal });
            // todo somehow handle the payload, usually contains some info about the error
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        }
    };
})(OpenSeadragon);
