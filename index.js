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
        compiler.plugin('after-emit', () => this._afterEmit());
    }

    _afterEmit() {
        if (this._config.token) {
            this._purge(this._config.token);
        } else {
            this._getAccessToken((err, result, body) => this._purge(body.access_token));
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

    _purge(token) {

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
        });
    }
}