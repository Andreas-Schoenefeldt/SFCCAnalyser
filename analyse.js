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
]).then( async (answers) => {
    // store defaults
    defaults.folder = answers.folder;
    fs.writeFile(defaultsStore, JSON.stringify(defaults), () => {});

    const cartridgesFolder = answers.folder;

    const analysisAnswers = await inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Which analysis to execute?',
            choices: ['cartridge usage', 'custom attribute usage'],
            default: defaults.type
        }
    ]);

    defaults.type = analysisAnswers.type;
    fs.writeFile(defaultsStore, JSON.stringify(defaults), () => {});

    switch (analysisAnswers.type) {
        case 'cartridge usage':
            require('./src/analyser/pipelineUsage')(cartridgesFolder);
            break;
        case 'custom attribute usage':
            await require('./src/analyser/customAttributeUsage')(cartridgesFolder);
            break;
    }
})