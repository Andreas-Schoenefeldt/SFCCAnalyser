const fs = require("fs");
const path = require('path');
const async = require("async");
const {parseUrlUtils} = require("../util/parser");
const acceptedExtensions = ['.isml']

module.exports = function (cartridgeBase, cartridgeName, cb) {

    const base = cartridgeBase + 'templates/default';

    fs.readdir(base, (err, files) => {
        if (!err){

            const recurseThroughFolderStructure = async function (folderOrFile) {

                const stats = fs.lstatSync(base + '/' + folderOrFile);

                if (stats.isDirectory()) {
                    await async.each(fs.readdirSync(base + '/' + folderOrFile), async function (file, callback) {
                        recurseThroughFolderStructure(folderOrFile + '/' + file).then(callback);
                    })
                } else {
                    if (acceptedExtensions.indexOf(path.extname(folderOrFile)) > -1) {
                        await parseUrlUtils(base + '/' + folderOrFile, cartridgeName, base + '/');
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