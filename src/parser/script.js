const fs = require("fs");
const path = require('path');
const async = require("async");
const {parsePipelineExecute, parseUrlUtils} = require("../util/parser");
const acceptedExtensions = ['.js', '.ds']

module.exports = function (cartridgeBase, cartridgeName, cb) {

    fs.readdir(cartridgeBase + 'scripts', (err, files) => {
        if (!err){

            const recurseThroughFolderStructure = async function (folderOrFile) {

                const stats = fs.lstatSync(cartridgeBase + 'scripts/' + folderOrFile);

                if (stats.isDirectory()) {
                    await async.each(fs.readdirSync(cartridgeBase + 'scripts/' + folderOrFile), async function (file, callback) {
                        recurseThroughFolderStructure(folderOrFile + '/' + file).then(callback);
                    })
                } else {
                    if (acceptedExtensions.indexOf(path.extname(folderOrFile)) > -1) {
                        await parsePipelineExecute(cartridgeBase + 'scripts/' + folderOrFile, cartridgeName, folderOrFile);
                        await parseUrlUtils(cartridgeBase + 'scripts/' + folderOrFile, cartridgeName, cartridgeBase + 'scripts/');
                    }
                }
            }

            async.each(files, function (file, callback) {
                recurseThroughFolderStructure(file).then(callback);
            }, function () {
                cb(null);
            });


        } else {
            // the cartridge has no scripts folder, so we scip it silently
            cb(null);
        }
    });
}