const {resolve, extname, dirname} = require("path");
const fs = require("fs");
const TYPE = {
    SCRIPT: 'script',
    CONTROLLER: 'controller',
    TEMPLATE: 'template'
}

const usage = {}

function getNormalizedFilename(file, cartridgeOfFile) {
    const parts = file.split(cartridgeOfFile);
    return cartridgeOfFile + parts[1];
}

function assureStructure(normalizedFileName) {

    if (!usage[normalizedFileName]) {
        usage[normalizedFileName] = {
            count: 0,
            includedFrom: []
        }
    }
}

function addFile(potentialFile, realName, type, source, ignoreNonExistence) {
    let extension = '';

    if (!fs.existsSync(realName)) {

        switch (type) {
            case TYPE.SCRIPT:

                if (potentialFile.indexOf('/') < 0) {
                    realName = realName.replace(potentialFile, 'modules/' + potentialFile);
                    potentialFile = 'modules/' + potentialFile;
                }

                if (!extname(realName)) {
                    extension = '.js';

                    if (!fs.existsSync(realName + extension)) {
                        extension = '.ds';

                        if (!fs.existsSync(realName + extension)) {
                            extension = '.json';
                        }

                    }
                }

                break;
        }

        realName += extension;
        potentialFile += extension;
    }


    if (fs.existsSync(realName)) {

        assureStructure(potentialFile);

        usage[potentialFile].count++;
        if (usage[potentialFile].includedFrom.indexOf(source) < 0) {
            usage[potentialFile].includedFrom.push(source);
        }

    } else if (realName.indexOf('+') > -1) {
        // alright, this is a dynamic include, let's tackle it in a loose way
        const dir = dirname(realName);
        const potentialParent = dirname(potentialFile);

        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach((file) => {
                if (fs.lstatSync(dir + '/' + file).isFile()) {
                    addFile(potentialParent + '/' + file, dir + '/' + file, type, source, ignoreNonExistence);
                }
            });
        } else if (!ignoreNonExistence) {
            console.log('Dynamic file does not exist: ', potentialFile);
            console.log(realName);
            console.log(dirname(realName));
            console.log('required by', source);
            process.exit(108);
        }

    } else if (!ignoreNonExistence) {
        console.log('File does not exist: ', potentialFile);
        console.log(realName);
        console.log(dirname(realName));
        console.log('required by', source);
        process.exit(108);
    }
}

module.exports.usage = usage;

module.exports.TYPE = TYPE;

module.exports.addPotentialFile = function (potentialFile, currentCartridge, currentFile, type) {
    if (
        potentialFile.indexOf('dw/') === 0 ||
        potentialFile === 'server' // appears to be a top level include
    ) {
        // ignore
    } else {

        // normalize the filename
        const parts = currentFile.split(currentCartridge);
        const fileBase = parts[0];
        const source = currentCartridge + parts[1];

        if (potentialFile.indexOf(':') > -1) {
            const oldNotation = potentialFile.split(':');
            // bc_integrationframework:workflow/libWorkflowLogToFile.ds to bc_integrationframework/cartridge/scripts/workflow/libWorkflowLogToFile.ds
            potentialFile = oldNotation[0] + '/cartridge/scripts/' + oldNotation[1];
        }

        if (potentialFile[0] === '/') {
            potentialFile = potentialFile.substring(1);
        }

        if (potentialFile[0] === '~') {
            potentialFile = currentCartridge + potentialFile.substring(1);
            addFile(potentialFile, resolve(fileBase + potentialFile), type, source);
        } else if (potentialFile[0] === '.') {
            const parentDir = dirname(currentFile);
            const realName = resolve(parentDir + '/' + potentialFile);
            potentialFile = realName.replace(fileBase, '');

            addFile(potentialFile, realName, type, source);

        } else if (potentialFile[0] === '*') {

            fs.readdirSync(fileBase).forEach((cartridge) => {
                if (fs.lstatSync(fileBase + cartridge).isDirectory()) {
                    const newPotentialFile = cartridge + potentialFile.substring(1);
                    addFile(newPotentialFile, resolve(fileBase + newPotentialFile), type, source, true);
                }
            });

        } else {
            addFile(potentialFile, resolve(fileBase + potentialFile), type, source);
        }
    }
}

module.exports.addFile = function (file, cartridge) {
    assureStructure(getNormalizedFilename(file, cartridge));
}