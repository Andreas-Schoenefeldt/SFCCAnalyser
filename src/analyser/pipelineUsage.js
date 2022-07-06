const fs = require("fs");
const async = require("async");
const {pipes} = require("../util/data");
const {parseUrlUtils, parsePipelineExecute} = require("../parser/utils");

const ignoresStore = '../../data/ignores.json';

const ignores = fs.existsSync( __dirname + '/' + ignoresStore) ? require(ignoresStore) : [];

module.exports = function (cartridgesFolder) {
    // analyse pipeline usage
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
                        require('../walker/controller').bind(null, parsePipelineExecute),
                        require('../walker/pipeline').bind(null, require('../parser/pipeline').parsePipelineRefferences),
                        require('../walker/script').bind(null, async function (file, cartridgeName, cartridgeBase) {
                            await parsePipelineExecute(cartridgeBase + 'scripts/' + file, cartridgeName, file);
                            await parseUrlUtils(cartridgeBase + 'scripts/' + file, cartridgeName, cartridgeBase + 'scripts/');
                        }),
                        require('../walker/template').bind(null, parseUrlUtils),
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
                    'url References': Object.keys(pipeConf.urlReferences).length ? `- ${Object.keys(pipeConf.urlReferences).join("\n- ")}` : '',
                    'called from controllers / scripts': Object.keys(pipeConf.executesFrom).length ? `- ${Object.keys(pipeConf.executesFrom).join("\n- ")}` : '',
                    'references to other pipelines': Object.keys(pipeConf.callsToExternal).length ? `- ${Object.keys(pipeConf.callsToExternal).join("\n- ")}` : ''
                })
            });

            const csv = require('@fast-csv/format');

            if (!fs.existsSync('../../data/result')) {
                fs.mkdirSync('../../data/result', {recursive : true});
            }

            // @todo: take the name of the file from the project folder
            csv.writeToPath('../../data/result/analyse.csv', rows, {headers: true});

            // @todo: print the results mysql style?
            // console.log(pipes);

            console.log(`Analysed ${Object.keys(pipes).length} Pipelines in the Project successfully.`);
        });
    });

    // optional: Check all URLUtils.[url|abs](['"]Route-Node['"]) occurences and add then to the mix
}