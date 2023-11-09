# SFCCAnalyser

A node script, which allows to analyse pipeline, script and controller usage. Ideal to identify potentially unused code.

## Installation

* checkout the code
* run `npm i`

## Usage

Use as `npm start` and follow the script. First it will request the cartridges folder of the project to analyse.

The following analysis are available:

* cartridge usage (Checks Pipeline and Controller Usage)
    * The result is written to `data/result/analyse.csv`.
* custom attribute usage (combine the custom objects before - see below)
* detect unused code (analyses the import and require chains in order to identify and potentially delete unused scripts)

### cartridge usage

#### Exclude Pipelines from the analysis

Create a `data/ignores.json` file and add the cartridge names to the list. Example:

```json
[
  "bm_serviceframework",
  "bm_integrationframework",
  "bm_contentcopytool",
  "bm_cache_clear_plugin",
  "bm_customfeeds",
  "bm_instore",
  "bc_library"
]
```

### detect unused code

This script takes controller and pipelines as base and sees, which scripts are actually imported from them.

# Combine and analyse system objecttype extension XML Files

1. put all xml files you would like to merge into one in `./data/meta-xmls/`
2. run `node combine-xml.js`
3. the resulting merged and cleaned xml file will be in `./data/meta-xmls/combined.xml`