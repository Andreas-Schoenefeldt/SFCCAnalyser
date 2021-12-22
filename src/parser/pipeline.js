const fs = require("fs");
const async = require("async");
const {assurePipeStructure, pipes} = require("../util/data");

module.exports = function (cartridgeBase, cartridgeName, cb) {

    // run through all Controller Files
    fs.readdir(cartridgeBase + 'pipelines', (err, files) => {
        if (!err){
            async.each(files, function (file, callback) {
                fs.readFile(cartridgeBase + 'pipelines/' + file, (err, buff) => {
                    if (!err){
                        const pipeId = file.replace('.xml', '');
                        const cheerio = require('cheerio');
                        const $ = cheerio.load(buff.toString());

                        assurePipeStructure(pipeId);

                        pipes[pipeId].cartridges.push(cartridgeName);

                        // loop through all the toplevel branches
                        $('pipeline').find('branch').each((i, a) => {
                            let basename = a.attribs.basename;

                            if (!a.attribs['source-connector'] && basename.indexOf('_ANONYMOUS_BRANCH_') !== 0) {
                                if (pipes[pipeId].branches.indexOf(basename) < 0) {
                                    pipes[pipeId].branches.push(basename);
                                }
                            }
                        });

                        $('pipeline').find('call-node, jump-node').each((j, cn) => {

                            const route = cn.attribs['start-name-ref'];
                            if (route) {
                                const parts = route.split('-');
                                const callsTo = parts[0];

                                if (callsTo !== pipeId) {
                                    if (pipes[pipeId].callsToExternal[route]) {
                                        pipes[pipeId].callsToExternal[route] = pipes[pipeId].callsToExternal[route] + 1;
                                    } else {
                                        pipes[pipeId].callsToExternal[route] = 1;
                                    }

                                    assurePipeStructure(callsTo);

                                    const currentPipeIdent = cartridgeName + ':' + pipeId;

                                    if (pipes[callsTo].calledFrom[currentPipeIdent]) {
                                        pipes[callsTo].calledFrom[currentPipeIdent] = pipes[callsTo].calledFrom[currentPipeIdent] + 1;
                                    } else {
                                        pipes[callsTo].calledFrom[currentPipeIdent] = 1;
                                    }
                                }
                            }
                        });

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