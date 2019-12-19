const qs = require("querystring");
const Axios = require("axios").default;

const http = new Axios({
    baseURL: "https://striketracker.highwinds.com"
});

module.exports = class PurgeCDNPlugin {
    /**
     * Creates an instance of PurgeCDNPlugin.
     * @param {any} list   - [{ url | recursive }]
     * @param {any} config - { accountId | token | username | password }
     */
    constructor(list, config) {
        this._list = list;
        this._config = config;
    }

    apply(compiler) {
        if (compiler.hooks) {
            compiler.hooks.afterEmit.tapAsync(this.constructor.name, (compilation, callback) => this._afterEmit(callback));
        } else {
            compiler.plugin('after-emit', (compilation, callback) => this._afterEmit(callback));
        }
    }

    async _afterEmit(callback) {

        let token = this._config.token;

        if (!token) {
            try {
                token = await this._getAccessToken();
            } catch (e) {
                this._logResponseError(e);

                return callback();
            }
        }

        this._purge(token, callback);
    }

    async _getAccessToken() {
        console.log('* Requesting highwinds CDN access token...');

        const form = {
            "grant_type": "password",
            "username": this._config.username,
            "password": this._config.password
        };

        const { data } = await http.post("/auth/token", qs.stringify(form), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        return data.access_token;
    }

    async _purge(token, callback) {

        console.log('* Sending purge request to highwinds...');
        console.log('* Purge list:');

        for (let i = 0, len = this._list.length; i < len; i++) {
            console.log(`\t- ${this._list[i].url} (recursive: ${this._list[i].recursive || false})`);
        }

        try {

            await http.post(`/api/accounts/${this._config.accountId}/purge`, {
                "list": this._list
            }, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            console.log('* Purge complete ✅');

        } catch (e) {

            this._logResponseError(e);

        } finally {

            callback();

        }
    }

    _logResponseError(e) {
        const { status, statusText } = e.response;
        console.log(`* Purge failed (${status}: ${statusText}) 🤕`);
    }
}