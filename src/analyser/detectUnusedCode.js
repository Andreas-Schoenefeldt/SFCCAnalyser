const fs = require("fs");
const async = require("async");
const {parseIncludes} = require("../parser/includes");
const {usage} = require("../util/codeUsage");
const path = require("path");
const inquirer = require("inquirer");

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
        }, () => {
            console.log('Preparing Results - Scripts without usage:');

            let count = 0;
            const zeroUsageFiles = [];

            Object.keys(usage).forEach((file) => {

                if (
                    ['.js', '.ds', '.json'].indexOf(path.extname(file)) > -1 &&
                    usage[file].count === 0 &&
                    file.indexOf('cartridge/controllers') < 0 // controllers are the start point, they are not required themselves
                ) {
                    console.log(file);
                    count++;
                    zeroUsageFiles.push(file);
                }
            });

            if (zeroUsageFiles.length) {

                console.log('  - All in all, it looks like the above ' + count + ' files are unused and can be removed.');

                inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'delete',
                        message: 'Would you like to delete the unused files?'
                    }
                ]).then((res) => {
                    if (res.delete) {

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
                })
            } else {
                console.log('Congratulations! You have no unused files in your project that we could detect.');
            }

        });


    });
}

