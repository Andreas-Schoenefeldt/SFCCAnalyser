const fs = require('fs');
const XmlStream = require('xml-stream');
const async = require("async");

const dir = './data/meta-xmls/';

const fatStructure = {};

// preperation
const combinedFile = dir + 'combined.xml';
if (fs.existsSync(combinedFile)) {
    fs.unlinkSync(combinedFile);
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// run through the files
fs.promises.readdir(dir).then((files) => {

    async.series(files.map((file) => {
      return function (cb) {
          const regex = new RegExp('\\.xml$', 'gm')

          if (regex.test(file)) {

              console.log('starting ' + file);

              const xmlFileReadStream = fs.createReadStream(dir + file);
              const reader = new XmlStream(xmlFileReadStream);

              let currentType;

              reader.collect('attribute');
              reader.collect('description');
              reader.collect('display-name');
              reader.collect('value-definition');

              reader.on('startElement: type-extension', (el) => {
                  currentType = el['$']['type-id'];

                  if (!fatStructure[currentType]) {
                      fatStructure[currentType] = {
                          'custom-attribute-definitions': {},
                          'group-definitions': {}
                      }
                  }

                  // console.log(file + ': ' + currentType);
              });

              reader.on('endElement: type-extension custom-attribute-definitions attribute-definition', (el) => {
                  const currentAttribute = el['$']['attribute-id'];

                  if (!fatStructure[currentType]['custom-attribute-definitions'][currentAttribute]) {
                      fatStructure[currentType]['custom-attribute-definitions'][currentAttribute] = el;
                  } else {
                      // @todo - deep compare of the nodes
                      console.log(currentAttribute + ' on ' + currentType + ' already exists.');
                  }

              });

              reader.on('endElement: type-extension attribute-group', (el) => {
                  const groupId = el.$['group-id'];

                  if (!fatStructure[currentType]['group-definitions'][groupId]) {
                      fatStructure[currentType]['group-definitions'][groupId] = {
                          'display-name' : el['display-name'],
                          'attribute' : [],
                      }
                  }

                  el.attribute?.forEach((attributeNode) => {
                      const attributeName =  attributeNode.$['attribute-id'];
                      if (fatStructure[currentType]['group-definitions'][groupId]['attribute'].indexOf(attributeName) < 0) {
                          fatStructure[currentType]['group-definitions'][groupId]['attribute'].push(attributeName)
                      }
                  });
              })

              reader.on('end', () => {
                  console.log('done ' + file);
                  cb();
              })

          } else {
              console.log('Ignoring ' + file);
              cb();
          }
      }
    }), async () => {
        console.log('Done with all :)');
        console.log('Writing the combined file');

        const indentString = '    ';
        const fileWriter = fs.createWriteStream(combinedFile);

        function writeXMLNode (tagName, attributes, indent = 0) {
            const isNode = typeof attributes === 'object'
            const nodeText = !isNode ? attributes : attributes.$text;
            const children = isNode ? Object.keys(attributes).filter((childTag) => {
                return childTag.indexOf('$') !== 0;
            }) : [];

            fileWriter.write(`${indentString.repeat(indent)}<${tagName}${
                attributes.$ ? ' ' + Object.keys(attributes.$).map((key) => {
                    return key + '="' + attributes.$[key] + '"';
                }).join(' ') : ''
            }${nodeText || children.length ? '>' : '/>'}`);

            if (nodeText) {
                fileWriter.write(htmlEntities(nodeText));
            }

            if (children.length) {
                fileWriter.write('\n');
                children.forEach((childTag) => {

                    if (Array.isArray(attributes[childTag])) {
                        attributes[childTag].forEach((childAttributes) => {
                            writeXMLNode(childTag, childAttributes, indent + 1);
                        })
                    } else {
                        writeXMLNode(childTag, attributes[childTag], indent + 1);
                    }
                });
            }

            if (nodeText || children.length) {
                fileWriter.write(`${children.length ? indentString.repeat(indent) : ''}</${tagName}>`);
            }

            fileWriter.write('\n');
        }

        fileWriter.write(`<?xml version="1.0" encoding="UTF-8"?>\n`);
        fileWriter.write(`<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">\n`);

        Object.keys(fatStructure).sort().forEach(function (typeId) {
            fileWriter.write(`    <type-extension type-id="${typeId}">\n`);

            if (Object.keys(fatStructure[typeId]['custom-attribute-definitions']).length) {
                fileWriter.write(`        <custom-attribute-definitions>\n`);

                Object.keys(fatStructure[typeId]['custom-attribute-definitions']).forEach((attributeId) => {
                    writeXMLNode('attribute-definition', fatStructure[typeId]['custom-attribute-definitions'][attributeId], 3)
                })
                fileWriter.write(`        </custom-attribute-definitions>\n`);
            }

            if (Object.keys(fatStructure[typeId]['group-definitions']).length) {
                fileWriter.write(`        <group-definitions>\n`);

                Object.keys(fatStructure[typeId]['group-definitions']).forEach((groupId) => {

                    if (fatStructure[typeId]['group-definitions'][groupId].attribute?.length) {
                        fileWriter.write(`            <attribute-group group-id="${groupId}">\n`);

                        fatStructure[typeId]['group-definitions'][groupId]['display-name']?.forEach((nodeConf) => {
                            writeXMLNode('display-name', nodeConf, 4);
                        })

                        fatStructure[typeId]['group-definitions'][groupId].attribute.forEach((attributeId) => {
                            fileWriter.write(`                <attribute attribute-id="${attributeId}"/>\n`);
                        });

                        fileWriter.write(`            </attribute-group>\n`);
                    }
                });

                fileWriter.write(`        </group-definitions>\n`);
            }

            fileWriter.write(`    </type-extension>\n`);
        })

        fileWriter.write(`</metadata>`);
        fileWriter.close();

    })

})

// const xmlFileReadStream = createReadStream('./data/meta-xmls/')