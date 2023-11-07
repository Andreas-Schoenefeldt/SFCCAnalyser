const fs = require("fs");
const {addPotentialFile, TYPE, addFile} = require("../util/codeUsage");

async function parseScriptIncludes(filePath, cartridgeName, base) {

    const buff = await fs.promises.readFile(filePath);
    const content = buff.toString();

    // https://regex101.com/r/HAmed7/1 - ignore all commented lines
    const requireRegex = /^(?!\s*(\*|\/\/)).*require\(['"](.*?)['"]\)/gmi;

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

    const importScriptRegex = /^(?!\s*(\*|\/\/)).*importScript\(['"](.*?)['"]\)/gmi;

    while ((m = importScriptRegex.exec(content)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === importScriptRegex.lastIndex) {
            importScriptRegex.lastIndex++;
        }

        if (m.length > 2) {

            console.log(m);
            process.exit(108);


            // addPotentialFile(m[2], cartridgeName, filePath, TYPE.SCRIPT);
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