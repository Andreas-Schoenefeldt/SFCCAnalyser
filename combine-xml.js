const fs = require('fs');
const XmlStream = require('xml-stream');
const async = require("async");

const dir = './data/meta-xmls/';

const systemIdent = 'system:';

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
              reader.collect('display');
              reader.collect('unit');

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
                  try {
                      const currentAttribute = el['$']['attribute-id'];

                      if (!fatStructure[currentType]['custom-attribute-definitions'][currentAttribute]) {
                          fatStructure[currentType]['custom-attribute-definitions'][currentAttribute] = el;
                      } else {

                          // deep compare
                          Object.keys(el).forEach((key) => {

                              const existing = fatStructure[currentType]['custom-attribute-definitions'][currentAttribute][key];

                              if (JSON.stringify(existing) !== JSON.stringify(el[key])) {

                                  if (Array.isArray(el[key]) && Array.isArray(existing)) {

                                      el[key].forEach((item) => {
                                          if (item.$ && item.$['xml:lang']) {
                                              let found = false;
                                              for (let i = 0; i < existing.length; i++) {

                                                  if (currentAttribute === 'age') {
                                                      console.log('comparing ' + existing[i].$['xml:lang'] + ' == ' + item.$['xml:lang']);
                                                  }

                                                  if (existing[i].$['xml:lang'] === item.$['xml:lang']) {
                                                      existing[i] = item;
                                                      found = true;
                                                      break;
                                                  }
                                              }

                                              if (!found) {
                                                  existing.push(item);
                                              }

                                          } else {
                                              console.log('a Difference of ' + key + ' of ' + currentAttribute + ' ' + currentType);
                                              console.log(fatStructure[currentType]['custom-attribute-definitions'][currentAttribute][key]);
                                              console.log(el[key]);

                                              exit;
                                          }
                                      })
                                  } else if (typeof (el[key]) === 'object' && typeof(existing) === 'object') {

                                      if (key === 'value-definitions') {
                                          // run the the definition array
                                          el[key]['value-definition'].forEach((def) => {
                                              let foundEntry = false;

                                              for (let i = 0; i < existing['value-definition'].length; i++) {
                                                  if (def.value === existing['value-definition'][i].value) {
                                                      foundEntry = true;

                                                      def.display.forEach((item) => {
                                                          // test the display values
                                                          let found = false;

                                                          for (let k = 0; k < existing['value-definition'][i].display.length; k++) {
                                                              if (existing['value-definition'][i].display[k].$['xml:lang'] === item.$['xml:lang']) {
                                                                  existing['value-definition'][i].display[k] = item;
                                                                  found = true;
                                                                  break;
                                                              }
                                                          }

                                                          if (!found) {
                                                              existing['value-definition'][i].display.push(item);
                                                          }
                                                      })
                                                  }
                                              }

                                              if (!foundEntry) {
                                                  existing['value-definition'].push(def);
                                              }
                                          })

                                      } else {
                                          console.log('b Difference of ' + key + ' of ' + currentAttribute + ' ' + currentType);
                                          console.log(fatStructure[currentType]['custom-attribute-definitions'][currentAttribute][key]);
                                          console.log(el[key]);
                                          exit;
                                      }
                                  } else {

                                      if (existing !== undefined) {
                                          console.log(`  > Setting ${key} of ${currentType}:${currentAttribute} from ${existing} to ${el[key]} `);
                                      }
                                      fatStructure[currentType]['custom-attribute-definitions'][currentAttribute][key] = el[key];
                                  }
                              }
                          })

                      }
                  } catch (e) {
                      console.log(e);
                      exit;
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
                      const attributeName = (attributeNode.$['system'] ? systemIdent : '') +  attributeNode.$['attribute-id'];
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

        const inquirer = require('inquirer');

        /**
         * holds a couple of custom functions, which can return true (definete yes), false (definete no) or null (I don't care)
         * @type {{shouldIncludeCustomAttribute?: function}}
         */
        const config = fs.existsSync('./data/config.js') ? require('./data/config') : {};

        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'filter',
                message: 'Would you like to filter out unused custom attributes (please make sure the analyser ran before)',
                default: true
            }
        ]);

        const filterPrefs = answers.filter ? require('./data/result/custom-attribute-usage.json') : {};

        console.log('Writing the combined file');

        const indentString = '    ';
        const attributeDefinitionChildOrder = [
            'display-name',
            'description',
            'type',
            'localizable-flag',
            'site-specific-flag',
            'mandatory-flag',
            'visible-flag',
            'externally-managed-flag',
            'order-required-flag',
            'externally-defined-flag',
            'field-length',
            'field-height',
            'min-value',
            'max-value',
            'min-length',
            'select-multiple-flag',
            'unit',
            'value-definitions',
            'default-value'
        ];

        const fileWriter = fs.createWriteStream(combinedFile);

        const langCompare = (a, b) => {
            if (a.$['xml:lang'] === b.$['xml:lang']) {
                return 0;
            } else if (a.$['xml:lang'] === 'x-default') {
                return -1;
            } else if (b.$['xml:lang'] === 'x-default') {
                return 1;
            } else {
                return a.$['xml:lang'].localeCompare(b.$['xml:lang']);
            }
        };

        const sortAndFilterLabels = (labelArray) => {
            const langs = {

            }

            if (labelArray) {
                labelArray.sort(langCompare).forEach((langItem) => {

                    const lang = langItem.$['xml:lang'];
                    const label = langItem.$text;

                    if (lang === 'x-default') {
                        langs[lang] = label;
                        return true;
                    } else {
                        if (langs['x-default'] && label === langs['x-default']) {
                            // filter out duplicated labels
                            return false;
                        } else if (lang.length === 2) {
                            langs[lang] = label;
                            return true;
                        } else {
                            const parts = lang.split('-');

                            if (!langs[parts[0]]) {
                                langs[parts[0]] = label;
                                return false;
                            } else if (langs[parts[0]] === label) {
                                return false;
                            }
                        }
                    }

                    langs[lang] = label;
                    return true;
                });
            }

            labelArray = Object.keys(langs).map((lang) => {
                return { '$': { 'xml:lang': lang }, '$text': langs[lang] };
            });
            return labelArray;
        }

        const shouldIncludeCustomAttribute = (typeId, attributeId) => {
            if (config.shouldIncludeCustomAttribute) {
                const customResult = config.shouldIncludeCustomAttribute(typeId, attributeId, fatStructure[typeId]['custom-attribute-definitions'][attributeId]);

                if (typeof customResult === 'boolean') {
                    return customResult;
                }
            }

            return filterPrefs[typeId] && filterPrefs[typeId][attributeId] && filterPrefs[typeId][attributeId].count !== 0
        }

        const shouldIncludeGroupAttribute = (typeId, attributeId) => {
            if (attributeId.indexOf(systemIdent) === 0) {
                return true;
            }

            return shouldIncludeCustomAttribute(typeId, attributeId);
        }

        function writeXMLNode (tagName, attributes, indent = 0) {
            const isNode = typeof attributes === 'object'
            const nodeText = !isNode ? attributes : attributes.$text;
            const children = isNode ? Object.keys(attributes).filter((childTag) => {
                return childTag.indexOf('$') !== 0;
            }) : [];

            switch (tagName) {
                // assure a certain order of children (SFCC import requires it)
                case 'attribute-definition':
                    children.sort(function (a, b) {
                        return attributeDefinitionChildOrder.indexOf(a) - attributeDefinitionChildOrder.indexOf(b);
                    })

                    if (attributes['display-name']) {
                        attributes['display-name'] = sortAndFilterLabels(attributes['display-name']);
                    }

                    break;
                case 'value-definition':
                    // sort the display nodes
                    if (attributes.display) {
                        attributes.display = sortAndFilterLabels(attributes.display);
                    }
                    break;
                // prevent a few default tags fro beeing written
                case 'select-multiple-flag':
                    if (nodeText === 'false') {
                        return;
                    }
                    break;
            }

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


            const attributeIds = Object.keys(fatStructure[typeId]['custom-attribute-definitions']).filter(shouldIncludeCustomAttribute.bind(null, typeId));

            if (attributeIds.length) {
                fileWriter.write(`        <custom-attribute-definitions>\n`);
                attributeIds.forEach((attributeId) => {
                    writeXMLNode('attribute-definition', fatStructure[typeId]['custom-attribute-definitions'][attributeId], 3)
                })
                fileWriter.write(`        </custom-attribute-definitions>\n`);



                if (Object.keys(fatStructure[typeId]['group-definitions']).length) {
                    // do not write empty group definitions
                    if (Object.keys(fatStructure[typeId]['group-definitions']).some((groupId) => {
                        return fatStructure[typeId]['group-definitions'][groupId].attribute.length &&
                            fatStructure[typeId]['group-definitions'][groupId].attribute.some(shouldIncludeGroupAttribute.bind(null, typeId))
                    })) {

                        fileWriter.write(`        <group-definitions>\n`);

                        Object.keys(fatStructure[typeId]['group-definitions']).forEach((groupId) => {

                            if (fatStructure[typeId]['group-definitions'][groupId].attribute.some(shouldIncludeGroupAttribute.bind(null, typeId))) {
                                fileWriter.write(`            <attribute-group group-id="${groupId}">\n`);

                                fatStructure[typeId]['group-definitions'][groupId]['display-name']?.forEach((nodeConf) => {
                                    writeXMLNode('display-name', nodeConf, 4);
                                })

                                fatStructure[typeId]['group-definitions'][groupId].attribute.forEach((attributeId) => {
                                    if (shouldIncludeGroupAttribute(typeId, attributeId)) {

                                        let isSystem = false;
                                        if (attributeId.indexOf(systemIdent) === 0) {
                                            isSystem = true;
                                            attributeId = attributeId.replace(systemIdent, '');
                                        }



                                        fileWriter.write(`                <attribute attribute-id="${attributeId}"${isSystem ? ' system="true"' : ''}/>\n`);
                                    }
                                });

                                fileWriter.write(`            </attribute-group>\n`);
                            }
                        });

                        fileWriter.write(`        </group-definitions>\n`);
                    }
                }
            }

            fileWriter.write(`    </type-extension>\n`);
        })

        fileWriter.write(`</metadata>`);
        fileWriter.close();

    })

})

// const xmlFileReadStream = createReadStream('./data/meta-xmls/')