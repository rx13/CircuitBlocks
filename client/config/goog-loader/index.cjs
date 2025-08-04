const path = require("path");
const paths = require("../paths.cjs");
const ProvideCollector = require("./provideCollector.cjs");

const sources = [
  path.join(paths.appSrc, "blockly")
];

let provideMap = [];
(function collectProvides() {
  let collector = new ProvideCollector(sources);
  provideMap = collector.collect();
})();


const fs = require('fs');
const googRegex = new RegExp("\\s*goog\\.(provide|require)\\(\\s*[\"'](.*)[\"']\\s*\\)");
const googLibRegex = new RegExp(".*goog\\..*", "g");
const dotRegex = new RegExp("\\.", "g");
const strictRegex = new RegExp("\\s*[\"']use strict[\"'].*", "g");


let output = "";
let importSet = new Set();
let importLines = [];
let importerPath = null;

function appendLine(line) {
  output += line + "\n";
}
function append(code) {
  if (Array.isArray(code)) {
    code.forEach(appendLine);
  } else {
    appendLine(code);
  }
}
function addImport(module) {
  const filePath = provideMap[module];
  if (!filePath) return;
  // Only add each import once
  if (importSet.has(module)) return;
  importSet.add(module);
  // Use relative path for import
  let basedir = importerPath ? path.dirname(importerPath) : paths.appSrc;
  let relPath = './' + path.relative(basedir, filePath).replace(/\\/g, '/');
  importLines.push(`import '${relPath}';`);
}

const googs = { provide: gProvide, require: gRequire };

let libIncluded = false;

function processLine(line) {
  if (line.match(strictRegex) !== null) return;

  let result = line.match(googRegex);

  if (line.startsWith("//") || result === null) {
    append(line);
    return;
  }

  let goog = result[1];
  let module = result[2];

  if (googs.hasOwnProperty(goog)) {
    googs[goog](module); // Will now recursively include code for requires
  } else {
    append(line);
  }
}

let provides = [];
let emittedRoots = new Set();

// Helper to emit variable declarations for provided namespaces
function optionalObject(module, object) {
  let addVar = object.split(".").length === 1;
  if (addVar) {
    // Only emit 'var' for root object once
    if (emittedRoots.has(object)) return "";
    emittedRoots.add(object);
    provides.push(object);
  } else if (provides.indexOf(object) !== -1) {
    // If not provided, don't emit anything
    return "";
  };

  // If the object is imported, skip emitting 'var'
  return (addVar ? "var " : "") + object + " = typeof " + object + " === 'undefined' ? {} : " + object + ";";
}

function gProvide(module) {
  buildup(module)?.forEach(object => append(optionalObject(module, object)));
  append(optionalObject(null, module));
}

function gRequire(module) {
  if (module === 'goog') return;
  const filePath = provideMap[module];
  if (!filePath) {
    // Fallback: just emit global assignment
    let basename = module.split(".")[0];
    if (basename === "goog") return;
    if (basename === module) {
      append("var " + module + " = typeof " + module + " === 'undefined' ? window." + module + " : {} ;");
      return;
    }
  }
  append(module + " = typeof " + module + " === 'undefined' ? window." + module + " : " + module + " ;");
  addImport(module);
}

function printProvides() {
  if (provides.length === 0) return;

  let mainExport = provides[0].split(".")[0];
  // Assign to global for browser/ESM/Node 22+
  append("if (typeof window !== 'undefined') { window." + mainExport + " = " + mainExport + "; }");
  append("else if (typeof globalThis !== 'undefined') { globalThis." + mainExport + " = " + mainExport + "; };");
  append("export default " + mainExport + ";");
}

function rename(module) {
  return module.replace(dotRegex, "___");
}


function buildup(namespace) {
  if (!namespace.includes(".")) return;

  let objects = [];

  let parts = namespace.split(".");

  for (let i = 1; i < parts.length - 1; i++) {
    let upTo = parts.slice(0, i + 1);
    objects.push(upTo.join("."));
  }

  return objects;
}

function init() {
  output = "";
  provides = [];
  libIncluded = false;
  emittedRoots = new Set();
}

module.exports = function (content, map, meta) {
  importerPath = this && this.resourcePath ? this.resourcePath : paths.appSrc;
  return function (source) {
    init();

    source.split("\n").forEach(processLine);
    printProvides();

    // Prepend imports at the top
    const result = (importLines.length ? importLines.join('\n') + '\n' : '') + output;
    importSet.clear();
    importLines = [];
    return result;
  }(content);
};
