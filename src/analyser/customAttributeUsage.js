const fs = require("fs");

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

        cartridges.forEach((cartridgeName) => {
            if (fs.lstatSync(cartridgesFolder + '/' + cartridgeName).isDirectory()) {
                const cartridgeBase = cartridgesFolder + '/' + cartridgeName + '/cartridge/';



            }
        })

    } else {
        console.error(metaDefinitionFile + ' does not exist');
    }

    // parse the sites/site_template/meta/system-objecttype-extensions.xml

    // run over pipelines, scripts, templates and controllers to see if the preference is used

}