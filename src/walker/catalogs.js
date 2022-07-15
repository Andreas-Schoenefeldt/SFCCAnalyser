const fs = require("fs");
const async = require("async");

module.exports = function (parserFnc, dir, cb) {

    // run through all Controller Files
    fs.readdir(dir, (err, files) => {
        if (!err){
            async.each(files, function (file, callback) {
                    parserFnc(dir + '/' + file, file).then(callback);
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