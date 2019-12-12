const request = require('request');

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

    _afterEmit(callback) {
        if (this._config.token) {
            this._purge(this._config.token, callback);
        } else {
            this._getAccessToken((err, result, body) => this._purge(body.access_token, callback));
        }
    }

    _getAccessToken(callback) {
        console.log('* requesting highwinds CDN access token...');

        request({
            method: 'POST',
            url: 'https://striketracker3.highwinds.com/auth/token',
            form: {
                grant_type: 'password',
                username: this._config.username,
                password: this._config.password
            },
            json: true
        }, callback);
    }

    _purge(token, callback) {

        console.log('* sending purge request to highwinds...');
        console.log('* purge list:');

        for (let i = 0, len = this._list.length; i < len; i++) {
            console.log(`* ${this._list[i].url} (recursive: ${this._list[i].recursive || false})`);
        }

        const params = {
            method: 'POST',
            url: `https://striketracker3.highwinds.com/api/v1/accounts/${this._config.accountId}/purge`,
            headers: {
                "Authorization": `Bearer ${token}`
            },
            json: {
                "list": this._list
            }
        };

        request(params, (err, result) => {
            if (err) {
                console.log('* purge failed 🤕', err.toString());
            } else {
                console.log('* purge complete ✅');
            }

            callback && callback();
        });
    }
}