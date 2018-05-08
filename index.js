'use strict';
var configBuilder = require('openfin-config-builder'),
    {launch} = require('hadouken-js-adapter'),
    path = require('path'),
    fs = require('fs'),
    request = require('request'),
    parseURLOrFile = require('./parse-url-or-file'),
    meow;

function main(cli) {
    meow = cli;

    var flags = cli.flags,
        name = flags.n || flags.name,
        url = flags.u || flags.url,
        config = flags.c || flags.config || 'app.json',
        launch = flags.l || flags.launch,
        parsedUrl = url ? parseURLOrFile(url) : url;

    if (isEmpty(flags)) {
        console.log(cli.help);
        return;
    }

    try {
        writeToConfig(name, parsedUrl, config, function(configObj) {
            if (launch) {
                launchOpenfin(config);
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
        openfinInstaller
            .fetchInstaller(fetchOptions)
            .then(function() {
                    console.log('Installer zip written to', destination);
                },
                function(reason) {
                    console.log(reason);
                });
    }

    if (hyperlink) {

        console.log('\n', openfinInstaller.generateInstallUrl(encodeURIComponent(name), fetchOptions.config,
            fetchOptions.noExt, fetchOptions.rvmConfig, fetchOptions.supportEmail, fetchOptions.dnl), '\n');
    }
}

function isURL(str) {
    return (typeof str === 'string') && str.lastIndexOf('http') >= 0;
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
    console.log(meow.help);
}

//will launch download the rvm and launch openfin
function launchOpenfin(manifestUrl) {
    launch({manifestUrl})
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
        configAction({
            startup_app: url ? startup_app : null,
            shortcut: shortcut
        }, config).fail(function(err) {
            console.log(err);
        }).done(function(configObj) {
            console.log(actionMessage, path.resolve(config));
            callback(configObj);
        });
    });
}


module.exports = main;
