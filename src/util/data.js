/**
 *
 * @type {Map<string, {
 *  executesFrom: Map<string, number>,
 *  calledFrom: Map<string, number>,
 *  callsToExternal: Map<string, number>,
 *  branches: Map<string, number>,
 *  cartridges: Map<string, string>
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
        callsToExternal: {
            'pipeName-branch': count
        },
        branches: {
            branchName: callCount
        },
        cartridges: {
            'cartridgeId': cartridgeName
        }
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
            branches: {},
            cartridges: {}
        }
    }
}