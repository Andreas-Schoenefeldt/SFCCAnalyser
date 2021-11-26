const fs = require("fs");
const async = require("async");
const {assurePipeStructure, pipes} = require("../util/data");

module.exports = function (cartridgeBase, cartridgeName, cb) {

    // run through all Controller Files
    fs.readdir(cartridgeBase + 'controllers', (err, files) => {
        if (!err){
            async.each(files, function (file, callback) {
                fs.readFile(cartridgeBase + 'controllers/' + file, (err, buff) => {
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
                        callback(null);
                    } else {
                        // console.log('some other err?');
                        callback(err);
                    }
                });
            }, function () {
                cb(null);
            });
        } else {
            // the cartridge has no controller folder, so we scip it silently
            cb(null);
        }
    });

}