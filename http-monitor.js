const http = require('http');
const https = require('https');
const logUpdate = require('log-update');
const { setInterval } = require('timers');
const { DelayStatistic } = require('./utils');

const MAX_DELAY = 2000;
const SPINNER = ['-', '\\', '|', '/'];

class HttpMonitor {
    constructor(target, interval) {
        this._target = target || 'https://network-tools.herokuapp.com/';
        this._interval = interval || 2000;

        this._client = this._target.includes('https') ? https : http;

        this._requestTime = new DelayStatistic(MAX_DELAY);
        this._responseTime = new DelayStatistic(MAX_DELAY);
        this._receiveTime = new DelayStatistic(MAX_DELAY);
        this._finishTime = new DelayStatistic(MAX_DELAY);

        this._text = 'Loading...';
        
        this._sent = 0;
        this._received = 0;
        this._failed = 0;

        this._frame = 0;
        this._spf = 200;
    }

    start() {
        this._loadVersions();

        setInterval(() => {
            this._loadVersions();
        }, this._interval);

        setInterval(() => {
            this._nextFrame();
            this._renderFrame();
        }, this._spf);
    }

    _loadVersions() {
        const sent = Date.now();
        this._sent++;

        this._client.get(this._target, (res) => {
            this._received++;
            const received = Date.now();
            this._receiveTime.update(received - sent);

            const { statusCode } = res;
            const contentType = res.headers['content-type'];

            let error;
            // Any 2xx status code signals a successful response but
            // here we're only checking for 200.
            if (statusCode !== 200) {
                error = new Error(`Request Failed.\nStatus Code: ${statusCode}`);
            } else if (!(contentType === 'application/json' || contentType === 'text/html')) {
                error = new Error(`Invalid content-type.\nExpected application/json or text/html but received ${contentType}`);
            }

            if (error) {
                this._failed++;
                logUpdate.clear();
                console.error(error.message);
                // Consume response data to free up memory
                res.resume();
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                const finished = Date.now();
                this._finishTime.update(finished - sent);
                this._text = `Data received: ${rawData.length}\n`;
                this._text += `Sent: ${this._sent}, Received: ${this._received}, Failed: ${this._failed}\n`
                this._text += `Total time   : ${this._finishTime.text}\n`;
                this._text += `Receive time : ${this._receiveTime.text}\n`;
                this._text += `Distribution\n${this._finishTime.dist}\n`;

                this._renderFrame();
            });
        }).on('error', (e) => {
            this._failed++;
            logUpdate.clear();
            console.error(`Got error: ${e.message}`);
        });
    }

    _prepareOutput() {
        let output = `${SPINNER[this._frame]} HTTP Monitor for ${this._target}\n${this._finishTime.chart}\n${this._text}`;
        const n = process.stdout.rows - output.split(/\r\n|\r|\n/).length - 1;
        for (let i = 0; i < n; i++) {
            output += '\n';
        }

        return output;
    }

    _nextFrame() {
        this._frame = ++this._frame % SPINNER.length;
    }

    _renderFrame() {
        logUpdate(this._prepareOutput());
    }
}

module.exports = HttpMonitor;