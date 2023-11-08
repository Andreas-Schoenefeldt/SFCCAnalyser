const fs = require("fs");
const path = require('path');
const async = require("async");
const acceptedExtensions = ['.js', '.ds', '.json']

module.exports = async function (parserFnc, cartridgeBase, cartridgeName, cb) {

    const root = path.resolve(cartridgeBase + '..');
    const jsonFiles = await fs.promises.readdir(root);

    for (let i = 0; i < jsonFiles.length; i++) {
        const filePath = root + '/' + jsonFiles[i]
        const stats = fs.lstatSync(filePath);

        if (stats.isFile()) {
            await parserFnc(filePath, cartridgeName, cartridgeBase);
        }
    }

    const recurseThroughFolderStructure = async function (folderOrFile) {

        const stats = fs.lstatSync(cartridgeBase + 'scripts/' + folderOrFile);

        if (stats.isDirectory()) {
            await async.each(fs.readdirSync(cartridgeBase + 'scripts/' + folderOrFile), function (file, callback) {
                recurseThroughFolderStructure(folderOrFile + '/' + file).then(callback);
            })
        } else {
            if (acceptedExtensions.indexOf(path.extname(folderOrFile)) > -1) {
                await parserFnc(cartridgeBase + 'scripts/' + folderOrFile, cartridgeName, cartridgeBase);
            }
        }
    }

    if (fs.existsSync(cartridgeBase + 'scripts')) {

        const scriptFiles = await fs.promises.readdir(cartridgeBase + 'scripts');

        await async.each(scriptFiles, function (file, callback) {
            recurseThroughFolderStructure(file).then(callback).catch((reason) => {
                console.log('Error Script', reason);
                process.exit(1);
            });
        });
    }

    cb();
}