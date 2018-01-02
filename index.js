'use strict';
const configBuilder = require('openfin-config-builder');
const { connect, Identity } = require('hadouken-js-adapter');
const path = require('path');
const fs = require('fs');
const request = require('request');
const parseURLOrFile = require('./parse-url-or-file');

function main(cli) {
    const flags = cli.flags;
    console.log(flags);
    const { name, url, config, launch } = flags;
    const parsedUrl = url ? parseURLOrFile(url) : url;

    if (isEmpty(flags)) {
        cli.showHelp();
        return;
    }

    try {
        writeToConfig(name, parsedUrl, config, function(configObj) {
            if (launch) {
                const conf = require(path.resolve(config));
                launchOpenfin(conf)
                    .then(fin => fin.Application.create(conf.startup_app))
                    .then(a => a.run())
                    .then(() => process.exit(0))
                    .catch(e => console.error('Failed launch', e));
            }

            if (configObj) {
                fetchInstaller(flags, configObj);
            }
        });
    } catch (err) {
        onError('Failed:', err);
    }
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

function isURL(str) {
    return typeof str === 'string' && str.lastIndexOf('http') >= 0;
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

//write the specified config to disk.
function writeToConfig(name, url, config, callback) {
    if (isURL(config)) {
        request(config, function(err, response, body) {
            if (!err && response.statusCode === 200) {
                callback(JSON.parse(body));
            }
        });
        return;
    }

    var shortcut = {},
        startup_app = {},
        configAction,
        actionMessage;

    fs.exists(config, function(exists) {
        if (exists) {
            configAction = configBuilder.update;
            actionMessage = 'using config';
        } else {
            configAction = configBuilder.create;
            actionMessage = 'successfully created config';
        }
        if (config) {
            if (name) {
                startup_app.name = name;
                shortcut.name = name;
                shortcut.company = name;
                shortcut.description = name;
            }
            if (url) {
                startup_app.url = url;
            }
        }

        //create or update the config
        configAction(
            {
                startup_app: url ? startup_app : null,
                shortcut: shortcut
            },
            config
        )
            .fail(function(err) {
                console.log(err);
            })
            .done(function(configObj) {
                console.log(actionMessage, path.resolve(config));
                callback(configObj);
            });
    });
}

module.exports = main;
