const fs = require("fs");
const {assurePipeStructure, pipes} = require("../util/data");

module.exports.parsePipelineExecute = async function (filePath, cartridgeName, file) {

    return new Promise(function(resolve, reject){
        fs.readFile(filePath, (err, buff) => {
            if (!err){
                const content = buff.toString();
                const regex = /Pipeline\s*\.\s*execute\s*\(\s*['"]\s*([\w-]+)\s*['"]/gm;

                let m;

                while ((m = regex.exec(content)) !== null) {
                    // This is necessary to avoid infinite loops with zero-width matches
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }

                    if (m.length > 1) {
                        const route = m[1];
                        const parts = route.split('-');
                        const pipeId = parts[0];
                        const scriptId = cartridgeName + ':' + file;

                        assurePipeStructure(pipeId);

                        if (pipes[pipeId].executesFrom[scriptId]) {
                            pipes[pipeId].executesFrom[scriptId] = pipes[pipeId].executesFrom[scriptId] + 1;
                        } else {
                            pipes[pipeId].executesFrom[scriptId] = 1;
                        }
                    }
                }
                resolve(null);
            } else {
                // console.log('some other err?');
                reject(err);
            }
        });
    })
}

module.exports.parseUrlUtils = async function (filePath, cartridgeName, base) {

    return new Promise(function(resolve, reject){
        fs.readFile(filePath, (err, buff) => {
            if (!err){
                const content = buff.toString();
                const regex = /URLUtils\.(url|http|https|abs)\(['"]([a-z\-]+)['"]/gmi;

                let m;

                while ((m = regex.exec(content)) !== null) {
                    // This is necessary to avoid infinite loops with zero-width matches
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }

                    if (m.length > 1) {
                        const route = m[2];
                        const parts = route.split('-');
                        const pipeId = parts[0];
                        const templateId = cartridgeName + ':' + filePath.split(base)[1];

                        assurePipeStructure(pipeId);

                        if (pipes[pipeId].urlReferences[templateId]) {
                            pipes[pipeId].urlReferences[templateId] = pipes[pipeId].urlReferences[templateId] + 1;
                        } else {
                            pipes[pipeId].urlReferences[templateId] = 1;
                        }
                    }
                }
                resolve(null);
            } else {
                // console.log('some other err?');
                reject(err);
            }
        });
    })
}

module.exports.parseCustomAttributeUsage = async function (filePath, cartridgeName, base, attributeNames) {
    const buff = await fs.promises.readFile(filePath);
    const content = buff.toString();
    const regex = new RegExp('\\b(' + attributeNames.join('|') + ')\\b', 'gm');

    let m;

    while ((m = regex.exec(content)) !== null) {
        console.log(m);
    }


    throw new Error('OM');


}