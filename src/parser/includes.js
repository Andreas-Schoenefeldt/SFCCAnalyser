const fs = require("fs");
const {addPotentialFile, TYPE, addFile} = require("../util/codeUsage");
const path = require("path");

const ALLOWED_PACKAGE_JSON_KEYS = ['main', 'hooks', 'caches']

async function parseScriptIncludes(filePath, cartridgeName, base) {

    const buff = await fs.promises.readFile(filePath);
    const content = buff.toString();
    const extension = path.extname(filePath).toLocaleLowerCase();
    const baseName = path.basename(filePath);

    if (extension === '.json') {

        const json = JSON.parse(content);

        switch (baseName) {
            default:
                // silent fail
                console.log(' unhandled json file ', filePath);
                break;
            case 'package.json':

                Object.keys(json).forEach((key) => {
                    if (ALLOWED_PACKAGE_JSON_KEYS.indexOf(key) > -1) {
                        addPotentialFile(json[key], cartridgeName, filePath, TYPE.SCRIPT);
                    }
                })
                break;
            case 'hooks.json':

                (json.hooks || []).forEach((hook) => {
                    addPotentialFile(hook.script, cartridgeName, filePath, TYPE.SCRIPT);
                })

                break;
            case 'steptypes.json':
                Object.keys(json['step-types']).forEach((key) => {
                    json['step-types'][key].forEach((stepConfig) => {
                        addPotentialFile(stepConfig.module, cartridgeName, filePath, TYPE.SCRIPT);
                    })
                })
                break;
        }
    } else {

        // https://regex101.com/r/HAmed7/1 - ignore all commented lines
        const requireRegex = /^(?!\s*(\*|\/\/|\/\*)).*require\(['"](.*?)['"]\)/gmi;

        let m;

        while ((m = requireRegex.exec(content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === requireRegex.lastIndex) {
                requireRegex.lastIndex++;
            }

            if (m.length > 2) {
                addPotentialFile(m[2], cartridgeName, filePath, TYPE.SCRIPT);
            }
        }

        const importScriptRegex = /^(?!\s*(\*|\/\/|\/\*)).*importScript\(['"](.*?)['"]\)/gmi;

        while ((m = importScriptRegex.exec(content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === importScriptRegex.lastIndex) {
                importScriptRegex.lastIndex++;
            }

            if (m.length > 2) {

                // things like this also work: importScript("utils/TransferClient.ds"); - this is te same cartridge, we need to catch this here already
                let file = m[2];

                if (file.indexOf(':') < 0) {
                    file = cartridgeName + '/cartridge/scripts/' + file;
                }

                addPotentialFile(file, cartridgeName, filePath, TYPE.SCRIPT);
            }
        }

        if (extension === '.xml') {

            // assumption that this happens only for script nodes
            const pipelineScriptRegex = /<config-property key="ScriptFile" value="(.*?)"\/>/gmi;

            while ((m = importScriptRegex.exec(content)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === importScriptRegex.lastIndex) {
                    importScriptRegex.lastIndex++;
                }

                if (m.length > 1) {

                    // things like this also work: importScript("utils/TransferClient.ds"); - this is te same cartridge, we need to catch this here already
                    let file = m[1];

                    if (file.indexOf(':') < 0) {
                        file = cartridgeName + '/cartridge/scripts/' + file;
                    }

                    addPotentialFile(file, cartridgeName, filePath, TYPE.SCRIPT);
                }
            }
        }
    }
}

async function parseIncludes(filePath, cartridgeName, cartridgeBase) {

    addFile(filePath, cartridgeName);

    await parseScriptIncludes(filePath, cartridgeName, cartridgeBase);
}


module.exports = {
    parseScriptIncludes: parseScriptIncludes,
    parseIncludes: parseIncludes
}