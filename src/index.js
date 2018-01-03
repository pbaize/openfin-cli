'use strict';
const { connect, Identity } = require('hadouken-js-adapter');
const writeToConfig = require('./write-config')
const path = require('path');
const fs = require('fs');
const request = require('request');
const parseURLOrFile = require('./parse-url-or-file');

function main(cli) {
    const flags = cli.flags;
    const { name, url, config, launch } = flags;
    const parsedUrl = url ? parseURLOrFile(url) : url;

    if (isEmpty(flags)) {
        cli.showHelp();
        return;
    }

    writeToConfig(name, parsedUrl, config)
        .then(function(configObj) {
            if (launch) {
                launchOpenfin(configObj)
                    .then(fin => fin.Application.create(configObj.startup_app))
                    .then(a => a.run())
                    .then(() => process.exit(0))
                    .catch(e => console.error('Failed launch', e));
            }

            if (configObj) {
                fetchInstaller(flags, configObj);
            }
        }).catch((err) => {
            onError('Failed:', err);
        });
}

function fetchInstaller(flags, configObj) {
    var hyperlink = flags.h || flags.hyperlink,
        destination = flags.d || flags.destination,
        appName = configObj.startup_app ? configObj.startup_app.name : null,
        name = flags.n || flags.name || appName || 'openfin',
        openfinInstaller = require('openfin-installer')(configObj),
        fetchOptions = {
            noExt: flags.noExt || null,
            rvmConfig: flags.rvmConfig || null,
            supportEmail: flags.supportEmail || null,
            dnl: flags.dnl || null,
            destination: flags.d || flags.destination,
            config: flags.c || null,
            name: name
        };

    if (destination) {
        openfinInstaller.fetchInstaller(fetchOptions).then(
            function() {
                console.log('Installer zip written to', destination);
            },
            function(reason) {
                console.log(reason);
            }
        );
    }

    if (hyperlink) {
        console.log(
            '\n',
            openfinInstaller.generateInstallUrl(
                encodeURIComponent(name),
                fetchOptions.config,
                fetchOptions.noExt,
                fetchOptions.rvmConfig,
                fetchOptions.supportEmail,
                fetchOptions.dnl
            ),
            '\n'
        );
    }
}



//makeshift is object empty function
function isEmpty(flags) {
    for (var key in flags) {
        if (flags.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}

function onError(message, err) {
    console.log(message, err);
}

//will launch download the rvm and launch openfin
function launchOpenfin(config) {
    return connect(config);
}



module.exports = main;
