const inquirer = require('inquirer');
const fs = require('fs');
const async = require('async');
const {pipes} = require("./src/util/data");
const defaultsStore = './data/defaults.json';
const ignoresStore = './data/ignores.json';

const defaults = fs.existsSync(defaultsStore) ? require(defaultsStore) : {
    folder: ''
}

const ignores = fs.existsSync(ignoresStore) ? require(ignoresStore) : [];

inquirer.prompt([
    {
        type: 'input',
        name: 'folder',
        message: 'Project Cartridges Folder',
        default: defaults.folder
    }
]).then( (answers) => {
    // store defaults
    fs.writeFile(defaultsStore, JSON.stringify(answers), () => {});

    // analyse

    const cartridgesFolder = answers.folder;

    fs.readdir(cartridgesFolder, (err, files) => {
        if (err) {
            throw err;
        }

        async.each(files, function (cartridgeName, outerCallback) {
            if (ignores.indexOf(cartridgeName) > -1) {
                console.log('Ignored Cartridge ' + cartridgeName + " (via " + ignoresStore +")");
                outerCallback(null);
            } else {
                if (fs.lstatSync(cartridgesFolder + '/' + cartridgeName).isDirectory()) {

                    const cartridgeBase = cartridgesFolder + '/' + cartridgeName + '/cartridge/';

                    async.each([
                        require('./src/parser/controller'),
                        require('./src/parser/pipeline'),
                        require('./src/parser/script'),
                    ], function (fnc, callback) {
                        fnc(cartridgeBase, cartridgeName, callback);
                    }, function () {
                        outerCallback(null); // the whole cartridge was processed
                    });
                } else {
                    outerCallback(null); // it is not an directory, just ignore it silently
                }
            }
        }, function () {
            // transform into csv
            const rows = [];

            Object.keys(pipes).forEach(function (pipeName) {
                const pipeConf = pipes[pipeName]
                rows.push({
                    pipeline: `${pipeName} (${pipeConf.cartridges.join(', ')})`,
                    'called from other pipelines': Object.keys(pipeConf.calledFrom).length ? `- ${Object.keys(pipeConf.calledFrom).join("\n- ")}` : '',
                    'called from controllers / scripts': Object.keys(pipeConf.executesFrom).length ? `- ${Object.keys(pipeConf.executesFrom).join("\n- ")}` : '',
                    'references to other pipelines': Object.keys(pipeConf.callsToExternal).length ? `- ${Object.keys(pipeConf.callsToExternal).join("\n- ")}` : ''
                })
            });

            const csv = require('@fast-csv/format');

            if (!fs.existsSync('./data/result')) {
                fs.mkdirSync('./data/result', {recursive : true});
            }

            // @todo: take the name of the file from the project folder
            csv.writeToPath('./data/result/analyse.csv', rows, {headers: true});

            // @todo: print the results mysql style?
            // console.log(pipes);

            console.log(`Analysed ${Object.keys(pipes).length} Pipelines in the Project successfully.`);
        });
    });

    // optional: Check all URLUtils.[url|abs](['"]Route-Node['"]) occurences and add then to the mix

})