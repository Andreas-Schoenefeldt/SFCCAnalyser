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