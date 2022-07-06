const fs = require("fs");
const path = require('path');
const async = require("async");
const acceptedExtensions = ['.js', '.ds']

module.exports = function (parserFnc, cartridgeBase, cartridgeName, cb) {

    fs.readdir(cartridgeBase + 'models', (err, files) => {
        if (!err){

            const recurseThroughFolderStructure = async function (folderOrFile) {

                const stats = fs.lstatSync(cartridgeBase + 'models/' + folderOrFile);

                if (stats.isDirectory()) {
                    await async.each(fs.readdirSync(cartridgeBase + 'models/' + folderOrFile), function (file, callback) {
                        recurseThroughFolderStructure(folderOrFile + '/' + file).then(callback);
                    })
                } else {
                    if (acceptedExtensions.indexOf(path.extname(folderOrFile)) > -1) {
                        await parserFnc(cartridgeBase + 'models/' + folderOrFile, cartridgeName, cartridgeBase);
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