/**
 *
 * @type {Map<string, {
 *  executesFrom: Map<string, number>,
 *  calledFrom: Map<string, number>,
 *  callsToExternal: Map<string, number>,
 *  branches: [],
 *  cartridges: []
 * }>|{}}
 */
const pipes = {

    /*
     'pipeName' : {
        executesFrom: {
            'cartridge:script': count
        },
        calledFrom: {
            'cartridge:pipeName': count
        },
        templateReferences: {
            'cartridge:template': count
        },
        callsToExternal: {
            'pipeName-branch': count
        },
        branches: [],
        cartridges: []
     }

     */

};


module.exports.pipes = pipes;

module.exports.assurePipeStructure = function (pipeId) {
    if (!pipes[pipeId]) {
        pipes[pipeId] = {
            executesFrom: {},
            calledFrom: {},
            callsToExternal: {},
            templateReferences: {},
            branches: [],
            cartridges: []
        }
    }
}