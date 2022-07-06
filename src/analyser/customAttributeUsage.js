const fs = require("fs");
const async = require("async");
const {parsePipelineExecute, parseUrlUtils, parseCustomAttributeUsage} = require("../parser/utils");

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
                        'occurences' : []
                    }
                })
            }
        })

        const cartridges = await fs.promises.readdir(cartridgesFolder);

        await async.each(cartridges, async (cartridgeName) => {
            console.log(arguments);

            const cartridgeBase = cartridgesFolder + '/' + cartridgeName + '/cartridge/';

            const result = await async.each([
                require('../walker/controller').bind(null, async function (file, cartridgeName, fileName) {
                    await async.each(Object.keys(prefs), async (group) => {
                        await parseCustomAttributeUsage(file, cartridgeName, cartridgeBase, Object.keys(prefs)[group]);
                    });
                }),
                require('../walker/pipeline').bind(null, async function (file, cartridgeName, fileName) {
                    await async.each(Object.keys(prefs), async (group) => {
                        await parseCustomAttributeUsage(file, cartridgeName, cartridgeBase, Object.keys(prefs)[group]);
                    });
                }),
                require('../walker/script').bind(null, async function (file, cartridgeName, fileName) {
                    await async.each(Object.keys(prefs), async (group) => {
                        await parseCustomAttributeUsage(file, cartridgeName, cartridgeBase, Object.keys(prefs)[group]);
                    });
                }),
                require('../walker/template').bind(null, async function (file, cartridgeName, fileName) {
                    await async.each(Object.keys(prefs), async (group) => {
                        await parseCustomAttributeUsage(file, cartridgeName, cartridgeBase, Object.keys(prefs)[group]);
                    });
                }),
            ]);

        })

        console.log('After loop');

    } else {
        console.error(metaDefinitionFile + ' does not exist');
    }

    // parse the sites/site_template/meta/system-objecttype-extensions.xml

    // run over pipelines, scripts, templates and controllers to see if the preference is used

}