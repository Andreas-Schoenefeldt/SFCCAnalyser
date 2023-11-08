const fs = require("fs");
const async = require("async");
const {parsePipelineExecute, parseUrlUtils} = require("../parser/utils");
const {parseIncludes} = require("../parser/includes");
const {usage} = require("../util/codeUsage");
const {extname} = require("path");
const path = require("path");

module.exports = function (cartridgesFolder) {
    // analyse pipeline usage
    fs.readdir(cartridgesFolder, (err, files) => {
        if (err) {
            throw err;
        }

        console.log(`Start unused code detection of ${cartridgesFolder}`);

        async.each(files, function (cartridgeName, outerCallback) {

            if (fs.lstatSync(cartridgesFolder + '/' + cartridgeName).isDirectory()) {

                console.log('  > process ' + cartridgeName);

                const cartridgeBase = cartridgesFolder + '/' + cartridgeName + '/cartridge/';

                async.each([
                    // @todo - parse cartridge json files
                    require('../walker/controller').bind(null, parseIncludes),
                    require('../walker/pipeline').bind(null, parseIncludes),
                    require('../walker/script').bind(null, parseIncludes),
                    require('../walker/template').bind(null, parseIncludes),
                ], function (fnc, callback) {

                    try {
                        fnc(cartridgeBase, cartridgeName, callback);
                    } catch (e) {
                        console.log(`! Error during ${cartridgeName} analysis`);
                        console.log(e);
                    }
                }, function () {
                    outerCallback(null); // the whole cartridge was processed
                });

            } else {
                outerCallback(null); // it is not a directory, just ignore it silently
            }
        }, () => {
            console.log('Preparing Results - Scripts without usage:');

            let count = 0;

            Object.keys(usage).forEach((file) => {

                if (
                    ['.js', '.ds', '.json'].indexOf(path.extname(file)) > -1 &&
                    usage[file].count === 0 &&
                    file.indexOf('cartridge/controllers') < 0 // controllers are the start point, they are not required themselves
                ) {
                    console.log(file);
                    count++;
                }
            })

            console.log(' All in all, it looks like ' + count + ' files can be removed.');

        });


    });
}
