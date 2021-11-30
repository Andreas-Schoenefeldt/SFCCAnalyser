# SFCCAnalyser
A node script, which allows to analyse pipeline and controller usage. Ideal to identify potentially unused code.

Use as `npm start` and follow the script. First it will request the cartridges folder of the project to analyse.

The result is written to `data/result/analyse.csv`.

## Exclude Pipelines from the analysis

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