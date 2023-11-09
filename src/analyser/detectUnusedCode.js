const fs = require("fs");
const async = require("async");
const {parseIncludes} = require("../parser/includes");
const {usage} = require("../util/codeUsage");
const path = require("path");
const inquirer = require("inquirer");
const {prompt} = require("inquirer");

module.exports = function (cartridgesFolder) {
    // analyse pipeline usage
    fs.readdir(cartridgesFolder, (err, files) => {
        if (err) {
            throw err;
        }

        console.log(`Start unused code detection of ${cartridgesFolder}`);

        async.each(files, function (cartridgeName, outerCallback) {

            if (fs.lstatSync(cartridgesFolder + '/' + cartridgeName).isDirectory()) {

                console.log('  > process ' + cartridgeName);

                const cartridgeBase = cartridgesFolder + '/' + cartridgeName + '/cartridge/';

                async.each([
                    // @todo - parse cartridge json files
                    require('../walker/controller').bind(null, parseIncludes),
                    require('../walker/pipeline').bind(null, parseIncludes),
                    require('../walker/script').bind(null, parseIncludes),
                    require('../walker/template').bind(null, parseIncludes),
                ], function (fnc, callback) {

                    try {
                        fnc(cartridgeBase, cartridgeName, callback);
                    } catch (e) {
                        console.log(`! Error during ${cartridgeName} analysis`);
                        console.log(e);
                    }
                }, function () {
                    outerCallback(null); // the whole cartridge was processed
                });

            } else {
                outerCallback(null); // it is not a directory, just ignore it silently
            }
        }, async () => {
            console.log('Preparing Results:');

            let count = 0;
            const zeroUsageFiles = [];
            let tmplCount = 0;
            const zeroUsageTemplates = [];

            Object.keys(usage).forEach((file) => {

                if (
                    ['.js', '.ds', '.json'].indexOf(path.extname(file)) > -1 &&
                    usage[file].count === 0 &&
                    file.indexOf('cartridge/controllers') < 0 // controllers are the start point, they are not required themselves
                ) {
                    console.log(file);
                    count++;
                    zeroUsageFiles.push(file);
                } else if (
                    ['.isml'].indexOf(path.extname(file)) > -1 &&
                    usage[file].count === 0 &&
                    file.indexOf('/slots/') < 0 // slot templates are never removed, as they can be included by the slots
                ) {
                    tmplCount++;
                    zeroUsageTemplates.push(file);
                }
            });

            if (zeroUsageFiles.length || zeroUsageTemplates.length) {

                let res;

                const inquire = async function (message) {
                    return new Promise((resolve) => {
                        inquirer.prompt([
                            {
                                type: 'confirm',
                                name: 'decision',
                                message: message,
                                default: false
                            }
                        ]).then((res) => {
                            resolve(res);
                        })
                    });
                }

                if (zeroUsageFiles.length) {

                    console.log('  - All in all, it looks like the above ' + count + ' files are unused and can be removed.');

                    res = await inquire('Would you like to delete the unused script files (this will potentially delete more files, as the ones that are required only by unused files are also deleted in the process)?');

                    if (res.decision) {

                        let removedFiles = 0;
                        let removedDirectories = 0;

                        const deleteEmptyDirectoriesUp = function (dir) {
                            if (!fs.readdirSync(dir).length) {
                                fs.rmdirSync(dir);
                                removedDirectories++;
                                console.log(' > removing now empty folder: ' + dir);

                                deleteEmptyDirectoriesUp(path.dirname(dir));
                            }
                        }

                        const deleteFileIfNotUsed = function (file) {

                            if (usage[file].includedFrom.length === 0) {

                                const absPath = path.resolve(cartridgesFolder + '/' + file);

                                if (fs.existsSync(absPath)) {
                                    fs.rmSync(absPath);
                                    removedFiles++;

                                    console.log(' > deleted: ' + file);

                                    deleteEmptyDirectoriesUp(path.dirname(absPath));

                                    usage[file].includes.forEach((include) => {
                                        usage[include].includedFrom = usage[include].includedFrom.filter((includeFile) => {
                                            return includeFile !== file;
                                        });

                                        deleteFileIfNotUsed(include);
                                    });
                                }
                            }
                        }

                        zeroUsageFiles.forEach((file) => {
                            deleteFileIfNotUsed(file);
                        });

                        console.log(`Done. Removed ${removedFiles} files and ${removedDirectories} directories - please test your project, before proceeding.`);
                    }
                } else {
                    console.log('No unused files in your project that we could detect :).');
                }

                res = await inquire('Would you like to list potentially unused template files?');

                if (res.decision) {

                    zeroUsageTemplates.forEach((tmpl) => {
                        console.log(tmpl);
                    });

                    console.log(`The above ${tmplCount} templates might be unused`)
                    console.log('! WARNING: High probability or Error.');
                }

            } else {
                console.log('Congratulations! You have no unused files in your project that we could detect.');
            }

        });


    });
}

