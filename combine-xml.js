const fs = require('fs');
const XmlStream = require('xml-stream');
const async = require("async");
const path = require("path");

const dir = './data/meta-xmls/';

const fatStructure = {};

// preperation
const combinedFile = dir + 'combined.xml';
if (fs.existsSync(combinedFile)) {
    await fs.promises.unlink(combinedFile);
}

// run through the files
fs.promises.readdir(dir).then((files) => {

    async.series(files.map((file) => {
      return function (cb) {
          if (file.indexOf('.xml') > 0) {

              console.log('starting ' + file);

              const xmlFileReadStream = fs.createReadStream(dir + file);
              const reader = new XmlStream(xmlFileReadStream);

              let currentType;
              let currentAttribute;

              reader.collect('attribute');
              reader.collect('display-name');

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

              reader.on('startElement: type-extension custom-attribute-definitions attribute-definition', (el) => {
                  currentAttribute = el['$']['attribute-id'];
                  if (!fatStructure[currentType]['custom-attribute-definitions'][currentAttribute]) {
                      fatStructure[currentType]['custom-attribute-definitions'][currentAttribute] = {};
                  }
                  // console.log('  ' + currentType + ': ' + currentAttribute)
              })

              reader.on('endElement: type-extension attribute-group', (el) => {
                  const groupId = el.$['group-id'];
                  if (!fatStructure[currentType]['group-definitions'][groupId]) {
                      fatStructure[currentType]['group-definitions'][groupId] = {
                          'display-name' : groupId['display-name'],
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
              cb();
          }
      }
    }), async () => {
        console.log('Done with all :)');
        console.log('Writing te combined file');

        const fileWriter = fs.createWriteStream(combinedFile);

        fileWriter.write(`<?xml version="1.0" encoding="UTF-8"?>\n`);
        fileWriter.write(`<metadata xmlns="http://www.demandware.com/xml/impex/metadata/2006-10-31">\n`);
        fileWriter.write(`</metadata>`);

    })

})

// const xmlFileReadStream = createReadStream('./data/meta-xmls/')