const fs = require("fs");
const {addPotentialFile, TYPE, addFile} = require("../util/codeUsage");
const path = require("path");

async function parseScriptIncludes(filePath, cartridgeName, base) {

    const buff = await fs.promises.readFile(filePath);
    const content = buff.toString();

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


    // next regex on pipelines: <pipelet-node pipelet-name="Script" pipelet-set-identifier="bc_api">
    //   <config-property key="ScriptFile" value="productquality/CheckProductQuality.ds"/>


}

async function parseIncludes(filePath, cartridgeName, cartridgeBase) {

    addFile(filePath, cartridgeName);

    await parseScriptIncludes(filePath, cartridgeName, cartridgeBase);
}


module.exports = {
    parseScriptIncludes: parseScriptIncludes,
    parseIncludes: parseIncludes
}