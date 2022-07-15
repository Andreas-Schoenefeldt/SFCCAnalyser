const XmlStream = require('xml-stream');
const path = require("path");
const fs = require("fs");

const attributes = {

}

const catalogParser = async function(file) {
    return new Promise(function(resolve, reject){
        const regex = new RegExp('\\.xml$', 'gm')
        if (regex.test(file)) {
            console.log('Analysing ' + path.resolve(file));

            const xmlFileReadStream = fs.createReadStream(file);
            const reader = new XmlStream(xmlFileReadStream);

            reader.on('startElement: refinement-definitions refinement-definition', (el) => {

                try {

                    if (el.$.type === 'attribute' && el.$.system === 'false') {
                        const attributeId = el.$['attribute-id'];
                        if (!attributes[attributeId]) {
                            attributes[attributeId] = {
                                files: {},
                                count: 0
                            }

                            console.log('  > found ' + attributeId);
                        }

                        attributes[attributeId].files[file] = attributes[attributeId].files[file] ? attributes[attributeId].files[file] + 1 : 1;
                        attributes[attributeId].count++;
                    }
                } catch (e) {
                    console.log(e);
                }
            });

            reader.on('end', () => {
                console.log('Finished ' + file);
                resolve();
            })
        } else {
            resolve();
        }
    });
}


module.exports = async function (catalogsDir) {
    return new Promise(function(resolve, reject){
        require('../walker/catalogs')(catalogParser, catalogsDir, () => {
            resolve(attributes);
        });
    });
}