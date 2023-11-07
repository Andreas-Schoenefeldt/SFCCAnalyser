const fs = require("fs");
const async = require("async");

module.exports = function (parserFnc, cartridgeBase, cartridgeName, cb) {

    // run through all Controller Files
    fs.readdir(cartridgeBase + 'controllers', (err, files) => {
        if (!err){
            async.each(files, function (file, callback) {
                parserFnc(cartridgeBase + 'controllers/' + file, cartridgeName, file).then(callback).catch((err) => {
                    console.error('Err');
                });
            },
            function () {
                cb(null);
            });
        } else {
            // the cartridge has no controller folder, so we skip it silently
            cb(null);
        }
    });

}