const fs = require("fs");
const async = require("async");
const {assurePipeStructure, pipes} = require("../util/data");
const {parsePipelineExecute} = require("../util/parser");

module.exports = function (cartridgeBase, cartridgeName, cb) {

    // run through all Controller Files
    fs.readdir(cartridgeBase + 'controllers', (err, files) => {
        if (!err){
            async.each(files, function (file, callback) {
                parsePipelineExecute(cartridgeBase + 'controllers/' + file, cartridgeName, file).then(callback);
            }, function () {
                cb(null);
            });
        } else {
            // the cartridge has no controller folder, so we scip it silently
            cb(null);
        }
    });

}