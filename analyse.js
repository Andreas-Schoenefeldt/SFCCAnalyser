const inquirer = require('inquirer');
const fs = require('fs');
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

        // files object contains all files names
        // log them on console
        files.forEach(file => {

            if (fs.lstatSync(cartridgesFolder + '/' + file).isDirectory()) {

                const cartrigeBase = cartridgesFolder + '/' + file + '/cartridge/';

                // run through all Controller Files
                fs.readdir(cartrigeBase + 'controllers', (err, files) => {

                });


                // run through all Pipeline Files
            }
        });
    });


    // identify all Controller Files

    // identify all Pipeline Files

    // optional: Check all URLUtils.[url|abs](['"]Route-Node['"]) occurences and add then to the mix

})