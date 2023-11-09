const fs = require("fs");
const {addPotentialFile, TYPE, addFile} = require("../util/codeUsage");
const path = require("path");

const ALLOWED_PACKAGE_JSON_KEYS = ['main', 'hooks', 'caches']

const customConfigPath = path.resolve(__dirname + '/../../data/config.js');

const config = fs.existsSync(customConfigPath) ? require(customConfigPath) : {};

async function parseScriptIncludes(filePath, cartridgeName, base, fileInfo) {

    const extension = fileInfo.extension;
    const baseName = fileInfo.basename
    const content = fileInfo.content;

    if (extension === '.json') {

        const json = JSON.parse(content);

        switch (baseName) {
            default:
                if (config.customIncludeDetectionForUnhandledFiles) {
                    await config.customIncludeDetectionForUnhandledFiles(filePath, cartridgeName, base);
                } else {
                    console.log('  - unhandled json file ', filePath);
                }
                break;
            case 'caches.json':
                // we know this file does not contain any includes
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
        const requireRegex = /^(?!\s*(\*|\/\/|\/\*)).*require\s*\(\s*['"](.*?)['"]\s*\)/gmi;

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

        const importScriptRegex = /^(?!\s*(\*|\/\/|\/\*)).*importScript\s*\(\s*['"](.*?)['"]\s*\)/gmi;

        while ((m = importScriptRegex.exec(content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === importScriptRegex.lastIndex) {
                importScriptRegex.lastIndex++;
            }

            if (m.length > 2) {

                // things like this also work: importScript("utils/TransferClient.ds"); - this is te same cartridge, we need to catch this here already
                let file = m[2];

                if (file.indexOf(':') < 0) {
                    file = cartridgeName + '/cartridge/scripts/' + (file[0] === '/' ? file.substring(1) : file);
                }

                addPotentialFile(file, cartridgeName, filePath, TYPE.SCRIPT);
            }
        }

        if (extension === '.xml') {
            // assumption that this happens only for script nodes
            const pipelineScriptRegex = /<config-property\s*key="ScriptFile"\s*value="(.*?)"\s*\/>/gmi;

            while ((m = pipelineScriptRegex.exec(content)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === pipelineScriptRegex.lastIndex) {
                    pipelineScriptRegex.lastIndex++;
                }

                if (m.length > 1) {

                    let file = m[1];

                    if (file.indexOf(':') < 0) {
                        file = '*/cartridge/scripts/' + (file[0] === '/' ? file.substring(1) : file);
                    }

                    addPotentialFile(file, cartridgeName, filePath, TYPE.SCRIPT);
                }
            }
        }
    }
}

async function parseTemplateIncludes(filePath, cartridgeName, base, fileInfo) {
    const extension = fileInfo.extension;
    const baseName = fileInfo.basename
    const content = fileInfo.content;

    let m;

    if (['.js', '.ds'].indexOf(extension) > -1) {

        // @todo - genericTemplateHook is a project specific thing - implememt a way to put this too the locale config.js
        // find render stuff
        const templateRenderRegex = /^(?!\s*(\*|\/\/|\/\*)).*(\.render|\.renderTemplate|new\s*Template)\s*\(\s*['"](.*?)['"]/gmi;

        while ((m = templateRenderRegex.exec(content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === templateRenderRegex.lastIndex) {
                templateRenderRegex.lastIndex++;
            }

            if (m.length > 2) {

                // @todo - here are also possible locale templates - ignored for now, as they are really bad practise

                let file = m[3];
                file = '*/cartridge/templates/default/' + (file[0] === '/' ? file.substring(1) : file);

                addPotentialFile(file, cartridgeName, filePath, TYPE.TEMPLATE);
            }
        }

        // @todo - render calls with variables can hold anything..

    } else if (['.xml'].indexOf(extension) > -1) {
        const pipelineTemplateRegex = /<template\s+[a-z="\s]*?dynamic="false" name="(.*)"\/>/gmi;


        while ((m = pipelineTemplateRegex.exec(content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === pipelineTemplateRegex.lastIndex) {
                pipelineTemplateRegex.lastIndex++;
            }

            if (m.length > 1) {

                // @todo - here are also possible locale templates - ignored for now, as they are really bad practise

                // @todo - dynamic includes can hold anything...

                let file = m[1];
                file = '*/cartridge/templates/default/' + (file[0] === '/' ? file.substring(1) : file);

                addPotentialFile(file, cartridgeName, filePath, TYPE.TEMPLATE);
            }
        }
    } else if (['.isml'].indexOf(extension) > -1) {
        const findIncludeRegex = /<isinclude\s+[a-z="\s]*?template\s*=\s*"\s*(\S*)\s*"[a-z="\s]*?\/>/gmi;

        while ((m = findIncludeRegex.exec(content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === findIncludeRegex.lastIndex) {
                findIncludeRegex.lastIndex++;
            }

            if (m.length > 1) {

                // @todo - here are also possible locale templates - ignored for now, as they are really bad practise

                // @todo - dynamic includes can hold anything...

                let file = m[1];
                file = '*/cartridge/templates/default/' + (file[0] === '/' ? file.substring(1) : file);

                addPotentialFile(file, cartridgeName, filePath, TYPE.TEMPLATE);
            }
        }

        const moduleRegex = /<ismodule\s+[a-z="\s]*?template\s*=\s*"\s*(\S*)\s*"[a-z="\s]*?\/>/gmi;

        while ((m = moduleRegex.exec(content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === moduleRegex.lastIndex) {
                moduleRegex.lastIndex++;
            }

            if (m.length > 1) {

                // @todo - here are also possible locale templates - ignored for now, as they are really bad practise

                // @todo - dynamic includes can hold anything...

                let file = m[1];
                file = '*/cartridge/templates/default/' + (file[0] === '/' ? file.substring(1) : file);

                addPotentialFile(file, cartridgeName, filePath, TYPE.TEMPLATE);
            }
        }

    }


}

async function parseIncludes(filePath, cartridgeName, cartridgeBase) {

    const buff = await fs.promises.readFile(filePath);

    const fileInfo = {
        content: buff.toString(),
        extension: path.extname(filePath).toLocaleLowerCase(),
        basename: path.basename(filePath)
    }

    addFile(filePath, cartridgeName);

    await parseScriptIncludes(filePath, cartridgeName, cartridgeBase, fileInfo);

    await parseTemplateIncludes(filePath, cartridgeName, cartridgeBase, fileInfo);
}


module.exports = {
    parseScriptIncludes: parseScriptIncludes,
    parseIncludes: parseIncludes
}