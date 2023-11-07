const fs = require("fs");
const async = require("async");

module.exports = function (parserFnc, cartridgeBase, cartridgeName, cb) {

    // run through all Pipeline Files
    fs.readdir(cartridgeBase + 'pipelines', (err, files) => {
        if (!err){
            async.each(files, function (file, callback) {
                parserFnc(cartridgeBase + 'pipelines/' + file, cartridgeName, file).then(callback).catch((reason) => {
                    console.log('Error Pipeline');
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