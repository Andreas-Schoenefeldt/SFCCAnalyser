const inquirer = require('inquirer');
const fs = require('fs');
const async = require('async');
const {pipes} = require("./src/util/data");
const defaultsStore = './data/defaults.json';

const defaults = fs.existsSync(defaultsStore) ? require(defaultsStore) : {
    folder: ''
}

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
            if (fs.lstatSync(cartridgesFolder + '/' + cartridgeName).isDirectory()) {

                const cartridgeBase = cartridgesFolder + '/' + cartridgeName + '/cartridge/';

                async.each([
                    require('./src/parser/controller'),
                    // require('./src/parser/pipeline'),
                    // require('./src/parser/script'),
                ], function (fnc, callback) {
                    fnc(cartridgeBase, cartridgeName, callback);
                }, function () {
                    outerCallback(null); // the whole cartridge was processed
                });
            } else {
                outerCallback(null); // it is not an directory, just ignore it silently
            }
        }, function () {
            console.log(pipes);
        });
    });

    // identify all Pipeline Files

    // optional: Check all URLUtils.[url|abs](['"]Route-Node['"]) occurences and add then to the mix

})