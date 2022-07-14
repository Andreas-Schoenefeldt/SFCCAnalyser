const fs = require("fs");
const async = require("async");
const {parseCustomAttributeUsage} = require("../parser/utils");

module.exports = async function (cartridgesFolder) {

    const metaDefinitionFile = cartridgesFolder + '/../sites/site_template/meta/system-objecttype-extensions.xml';

    if (fs.existsSync(metaDefinitionFile)) {
        const buff = await fs.promises.readFile(metaDefinitionFile);
        const cheerio = require('cheerio');
        const $ = cheerio.load(buff.toString());

        const prefs = {};

        $('type-extension').each(function (i, a) {

            const attributeDefinitions = $(a).find('custom-attribute-definitions attribute-definition');

            if (attributeDefinitions.length) {
                const type = a.attribs['type-id'];
                prefs[type] = {};

                attributeDefinitions.each(function (j, b) {
                    prefs[type][b.attribs['attribute-id']] = {
                        files : {},
                        count: 0
                    }
                })
            }
        })

        const cartridges = await fs.promises.readdir(cartridgesFolder);

        async.each(cartridges, (cartridgeName, outerCb) => {
            if (fs.lstatSync(cartridgesFolder + '/' + cartridgeName).isDirectory()) {

                const cartridgeBase = cartridgesFolder + '/' + cartridgeName + '/cartridge/';

                const parser = async function (file, cartridgeName, fileName) {
                    return new Promise(function(resolve, reject){
                        async.each(Object.keys(prefs), (group, cb) => {
                            parseCustomAttributeUsage(file, cartridgeName, cartridgeBase, Object.keys(prefs[group]), prefs[group]).then(cb);
                        }, function () {
                            resolve();
                        });
                    })
                }

                async.each([
                    require('../walker/controller').bind(null, parser),
                    require('../walker/pipeline').bind(null, parser),
                    require('../walker/script').bind(null, parser),
                    require('../walker/model').bind(null, parser),
                    require('../walker/template').bind(null, parser),
                ], function (fnc, callback) {
                    fnc(cartridgeBase, cartridgeName, callback);
                }, function () {
                    outerCb();
                });
            } else {
                outerCb();
            }
        }, () => {

            fs.writeFileSync(__dirname + '/../../data/result/custom-attribute-usage.json', JSON.stringify(prefs, null, 2));

            console.log('After loop - listing potentially unused custom attributes:');
            console.log('');

            Object.keys(prefs).forEach((group) => {

                const zeroPrefs = Object.keys(prefs[group]).filter((attributeId) => {
                    return !prefs[group][attributeId].count;
                });

                if (zeroPrefs.length) {

                    console.log('');
                    console.log(group);

                    zeroPrefs.forEach((attributeId) => {
                        console.log(` * ${attributeId}`);
                    });
                }
            });
        });

    } else {
        console.error(metaDefinitionFile + ' does not exist');
    }

    // parse the sites/site_template/meta/system-objecttype-extensions.xml

    // run over pipelines, scripts, templates and controllers to see if the preference is used

}