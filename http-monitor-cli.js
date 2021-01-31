const meow = require('meow');
const { HttpMonitor } = require('./utils/http-monitor');
const { MonitorClient } = require('./utils/client');

const cli = meow(`
	Usage
	  $ node http-monitor-cli.js <target url>
	Options
	--timeout -t     Request timeout in milliseconds
	--interval -i    Time between requests in milliseconds
	--period -p      Period for calculating intermediate statistics in minutes
	--no-save        Do not save results
	--no-chart       Hide real time chart
	--verbose        Show debug information
`, {
	flags: {
		timeout: {
            type: 'number',
            default: 9000,
            alias: 't'
        },
        interval: {
            type: 'number',
            default: 2000,
            alias: 'i'
        },
        period: {
            type: 'number',
            default: 15,
            alias: 'p'
        },
        save: {
            type: 'boolean',
            default: true
        },
        chart: {
            type: 'boolean',
            default: true
        },
        verbose: {
            type: 'boolean',
            default: false
        }
	}
});

const monitor = new HttpMonitor(cli.input[0], cli.flags);
const client = new MonitorClient(monitor, cli.flags);
client.start();
