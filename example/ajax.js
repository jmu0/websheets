/**
 * Perform ajax request
 * @param data {object} an object containing:
 *  - method (GET, POST, PUT, DELETE)
 *  - url
 *  - [data] (object)
 *  - [success] (function) runs on status 200, if Content-Type=application/json it parses the json
 *  - [error] (function) runs on other status codes
 *  - [callback] (function) always runs after readystate = 4
 *
 */
export function ajax(data) {
    'use strict';
    if (!data.method) {
        data.method = 'GET';
    }
    if (!data.url) {
        data.url = '/';
    }
    if (!data.data) {
        data.data = {};
    }
    let xmlhttp = (window.XMLHttpRequest) ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP");
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
                if (debug) {
                    console.log("ajax:", xmlhttp);
                }
                if (typeof data.success === 'function') {
                    var ret = xmlhttp.responseText;
                    if (xmlhttp.getResponseHeader('Content-Type') !== null) {
                        if (xmlhttp.getResponseHeader('Content-Type').indexOf('application/json') > -1) {
                            ret = JSON.parse(ret);
                        }
                    }
                    data.success(ret, xmlhttp);
                }
            } else {
                if (typeof data.error === 'function') {
                    data.error(xmlhttp.statusText, xmlhttp);
                }
            }
            if (typeof data.callback === 'function') {
                data.callback(xmlhttp);
            }
        }
    };
    xmlhttp.open(data.method, data.url, true);
    if (data.headers !== undefined) {
        var h;
        for (h in data.headers) {
            if (data.headers.hasOwnProperty(h)) {
                xmlhttp.setRequestHeader(h, data.headers[h]);
            }
        }
    }
   
    if (data.method === 'POST' || data.method === 'PUT') {
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        // xmlhttp.setRequestHeader("Cache-Control", "no-cache");
        var str = [];
        var p;
        for (p in data.data) {
            if (data.data.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data.data[p]));
            }
        }
        str = str.join("&");
        xmlhttp.send(str);


    } else {
        xmlhttp.send();
    }

};


/**
 * Shorthand for ajax get function
            url += fileInput.files[0].name;
 * @param url {string} url to get
 * @param callback {function} function to run on success
 * @returns Promise
 */
export function get(url, callback) {
    'use strict';
    return new Promise(function (resolve, reject) {
        ajax({
            url: url,
            method: 'GET',
            success: function (data, xmlhttp) {
                resolve(data);
                if (typeof callback === 'function') {
                    callback(data, xmlhttp);
                }
            },
            error: function (error) {
                reject(error);
            }
        });
    });
};

/**
 * Shorthand for ajax put function
 * @param url {string} url to post to
 * @param data {Object}
 * @param callback {function} function to run on success
 * @returns Promise
 */
export function put(url, data, callback) {
    //TODO: naar ui
    'use strict';
    return new Promise(function (resolve, reject) {
        console.log("DEBUG PUT:", url, data);
        ajax({
            url: url,
            method: 'PUT',
            data: data,
            success: function (data, xmlhttp) {
                console.log("DEBUG put success:", xmlhttp.responseURL, data);
                resolve(data, xmlhttp);
                if (typeof callback === 'function') {
                    callback(data, xmlhttp);
                }
            },
            error: function (error, xmlhttp) {
                console.log("DEBUG put error:", xmlhttp.responseURL, error);
                reject({ error: error, response: xmlhttp.response });
            }
        });
    });
};


/**
 * Shorthand for ajax post function
 * @param url {string} url to post to
 * @param data {Object}
 * @param callback {function} function to run on success
 * @returns Promise
 */
export function post(url, data, callback) {
    'use strict';
    return new Promise(function (resolve, reject) {
        ajax({
            url: url,
            method: 'POST',
            data: data,
            success: function (data, xmlhttp) {
                resolve(data, xmlhttp);
                if (typeof callback === 'function') {
                    callback(data, xmlhttp);
                }
            },
            error: function (error, xmlhttp) {
                reject({ error: error, response: xmlhttp.response });
            }
        });
    });
};

/**
 * Shorthand for ajax delete function
 * @param url {string} url to post to
 * @param data {Object}
 * @param callback {function} function to run on success
 * @returns Promise
 */
export function del(url, data, callback) {
    'use strict';
    return new Promise(function (resolve, reject) {
        ajax({
            url: url,
            method: 'DELETE',
            data: data,
            success: function (data, xmlhttp) {
                resolve(data);
                if (typeof callback === 'function') {
                    callback(data, xmlhttp);
                }
            },
            error: function (error, xmlhttp) {
                reject({
                    "error": error,
                    "response": xmlhttp.response
                });
            }
        });
    });
};

/**
 * Update resource if exists, else insert
 * @param url {string} url to use
 * @param data {object} data to save
 * @returns Promise
 */
export function update(url, data) {
    'use strict';
    return new Promise(function (resolve, reject) {
        head(url).then(function (resp) { //post
            post(url, data).then(function (resp) {
                resolve(resp);
            }).catch(function (err) {
                reject(err);
            });
        }).catch(function (err) {
            if (err.toLowerCase() === "not found") { //put
                put(url, data).then(function (resp) {
                    resolve(resp);
                }).catch(function (err) {
                    reject(err);
                });
            } else {
                reject(err);
            }
        });
    });
}


/**
 * Get data from url using sync http
 * @param url {string} url to get from
 * @return {string} value from server
*/
export function getSync(url) {
    'use strict';
    var AJAX = new XMLHttpRequest();
    if (AJAX) {
        AJAX.open('GET', url, false);
        AJAX.send(null);
        return AJAX.responseText;
    } else {
        return false;
    }
};



/**
 * Get http headers using head method
 * @param url {string} url to use
 * @param callback {function} function to run on success
 * @return Promise
 */
export function head(url, callback) {
    'use strict';
    return new Promise(function (resolve, reject) {
        ajax({
            url: url,
            method: 'HEAD',
            success: function (data, xmlhttp) {
                var obj = xmlhttpHeaders(xmlhttp);
                obj.url = url;
                resolve(obj);
                if (typeof callback === 'function') {
                    callback(obj, xmlhttp);
                }
            },
            error: function (error) {
                reject(error);
            }
        });
    });
};
function xmlhttpHeaders(xmlhttp) {
    'use strict';
    var headers = xmlhttp.getAllResponseHeaders();
    var i, h;
    var obj = {};
    headers = headers.split("\n");
    for (i = 0; i < headers.length; i++) {
        if (h !== "") {
            h = headers[i].split(": ");
            if (h.length === 2) {
                obj[h[0]] = h[1];
            }
        }
    }
    return obj;
};
/**
 * Upload a file using http put method
 * @param url {string} url to post to
 * @param data {Object} = { files (node), destination (filename), url (upload url)}
 * @param callback {function} function to run on success
 * @return Promise
 */
export function upload(url, data, callback) {
    'use strict';
    return new Promise(function (resolve, reject) {
        if (data.files === undefined) {
            reject("Upload error: no files");
        }
        // if (data.destination === undefined) {
        //     reject("Upload error: no destination");
        // }
        if (FormData === undefined) {
            reject("Upload error: no FormData");
        }
        if (url === undefined) {
            reject("Upload error: no url");
        }
        var fd = new FormData();
        var i;
        for (i = 0; i < data.files.files.length; i++) {
            fd.append('files[]', data.files.files[i]);
        }
        fd.append('ajax', true);
        var rq = new XMLHttpRequest();
        rq.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
                var perc = Math.round((e.loaded / e.total) * 100) + " %";
                if (debug) { console.log("upload progress:", perc); }
            }
        });
        rq.upload.addEventListener('load', function () {
            if (debug) { console.log('upload progress: klaar'); }
        });
        rq.upload.addEventListener('error', function (e) {
            reject('upload error');
        });
        rq.addEventListener('readystatechange', function () {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    var ret = this.responseText;
                    if (this.getResponseHeader('Content-Type') !== null) {
                        if (this.getResponseHeader('Content-Type').indexOf('application/json') > -1) {
                            ret = JSON.parse(ret);
                        }
                    }
                    resolve(ret);
                    if (typeof callback === 'function') {
                        callback(this.response, rq);
                    }
                } else {
                    reject('Upload error: ' + this.statusText);
                }
            }
        });
        rq.open('PUT', url);
       
        if (data.headers !== undefined) {
            var h;
            for (h in data.headers) {
                if (data.headers.hasOwnProperty(h)) {
                    rq.setRequestHeader(h, data.headers[h]);
                }
            }
        }
        rq.send(fd);
    });
};