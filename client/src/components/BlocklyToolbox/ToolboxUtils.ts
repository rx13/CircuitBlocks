let Blockly: any = null;
export async function getBlockly() {
  if (!Blockly) {
    const mod = await import('../../blockly/blockly');
    Blockly = mod.default || mod;
  }
  return Blockly;
}

export const blockColors: any = {
  loops: '#FFAB19',      // Control (orange) #FFAB19
  logic: '#4B4A60',      // Sensing (gray-blue, closest to Scratch)
  math: '#0FBD8C',       // Operators (green)
  variables: '#FF8C1A',  // Variables (dark orange)
  functions: '#FF6680',  // My Blocks (pink)
  text: '#9966FF',       // Purple - Looks/Text in Scratch
  arrays: '#FF661A',     // Lists (red-orange)
  advanced: '#3c3c3c',
  addpackage: '#717171',
  search: '#000',
  debug: '#e03030',
  default: '#dddddd',
  topblocks: '#4C97FF',  // Motion (blue)
  recipes: '#717171'
};

// Use Material Icons names for each category (only valid, filled icons)
export const blockIcons: any = {
  loops: 'repeat',                // repeat
  logic: 'tune',                  // logic/adjust
  math: 'functions',              // math/function
  variables: 'call_split',        // variable/branch
  functions: 'functions',         // function symbol
  text: 'text_fields',            // text
  arrays: 'view_module',          // grid/array
  io: 'input',                    // I/O
  display: 'tv',                  // display/tv
  time: 'schedule',               // time/clock
  advancedcollapsed: 'expand_more', // chevron-down
  advancedexpanded: 'expand_less',  // chevron-up
  more: 'more_horiz',             // ellipsis-h
  addpackage: 'add',              // plus
  search: 'search',               // search
  debug: 'bug_report',            // bug
  default: 'extension',           // puzzle-piece
  topblocks: 'star',              // star
  recipes: 'menu_book'            // book
};

const toolboxStyleBuffer = '';
/* export function appendToolboxIconCss(className: string, i: string): void {
        if (toolboxStyleBuffer.indexOf(className) > -1) return;

        if (i.length === 1) {
            const icon = Util.unicodeToChar(i);
            toolboxStyleBuffer += `
                .blocklyTreeIcon.${className}::before {
                    content: "${icon}";
                }
            `;
        }
        else {
            toolboxStyleBuffer += `
                .blocklyTreeIcon.${className} {
                    background-image: url("${Util.pathJoin(pxt.webConfig.commitCdnUrl, encodeURI(i))}")!important;
                    width: 30px;
                    height: 100%;
                    background-size: 20px !important;
                    background-repeat: no-repeat !important;
                    background-position: 50% 50% !important;
                }
            `;
        }
    } */

export function getNamespaceColor(ns: string): string {
  ns = ns.toLowerCase();
  if (/* pxt.appTarget.appTheme. */ blockColors && /* pxt.appTarget.appTheme. */ blockColors[ns])
    return /* pxt.appTarget.appTheme. */ blockColors[ns] as string;
  /* if (pxt.toolbox.blockColors[ns])
            return pxt.toolbox.blockColors[ns] as string; */
  return '';
}

export function getNamespaceIcon(ns: string): string {
  ns = ns.toLowerCase();
  if (/* pxt.appTarget.appTheme. */ blockIcons && /* pxt.appTarget.appTheme. */ blockIcons[ns]) {
    return blockIcons[ns];
  }
  /* if (pxt.toolbox.blockIcons[ns]) {
            return pxt.toolbox.blockIcons[ns] as string;
        } */
  return '';
}

export function advancedTitle() {
  return 'Advanced';
}
export function recipesTitle() {
  return '{id:category}Tutorials';
}

/**
 * Convert blockly hue to rgb
 */
export function convertColor(colour: string): string {
  const hue = parseInt(colour);
  if (!isNaN(hue)) {
    if (!Blockly) {
      // Fallback to default color if Blockly is not loaded
      return colour;
    }
    const { HSV_SATURATION } = Blockly;
    const HSV_VALUE = Blockly.HSV_VALUE * 255;
    const rgbArray = hsvToRgb(hue, HSV_SATURATION, HSV_VALUE);
    return `#${componentToHex(rgbArray[0])}${componentToHex(rgbArray[1])}${componentToHex(rgbArray[2])}`;
  }
  return colour;
}

export function hueToRgb(hue: number) {
  if (!Blockly) {
    return '#000000';
  }
  const { HSV_SATURATION } = Blockly;
  const HSV_VALUE = Blockly.HSV_VALUE * 255;
  const rgbArray = hsvToRgb(hue, HSV_SATURATION, HSV_VALUE);
  return `#${componentToHex(rgbArray[0])}${componentToHex(rgbArray[1])}${componentToHex(rgbArray[2])}`;
}

/**
 * Converts an HSV triplet to an RGB array.  V is brightness because b is
 *   reserved for blue in RGB.
 * Closure's HSV to RGB function: https://github.com/google/closure-library/blob/master/closure/goog/color/color.js#L613
 */
function hsvToRgb(h: number, s: number, brightness: number) {
  let red = 0;
  let green = 0;
  let blue = 0;
  if (s == 0) {
    red = brightness;
    green = brightness;
    blue = brightness;
  } else {
    const sextant = Math.floor(h / 60);
    const remainder = h / 60 - sextant;
    const val1 = brightness * (1 - s);
    const val2 = brightness * (1 - s * remainder);
    const val3 = brightness * (1 - s * (1 - remainder));
    switch (sextant) {
      case 1:
        red = val2;
        green = brightness;
        blue = val1;
        break;
      case 2:
        red = val1;
        green = brightness;
        blue = val3;
        break;
      case 3:
        red = val1;
        green = val2;
        blue = brightness;
        break;
      case 4:
        red = val3;
        green = val1;
        blue = brightness;
        break;
      case 5:
        red = brightness;
        green = val1;
        blue = val2;
        break;
      case 6:
      case 0:
        red = brightness;
        green = val3;
        blue = val1;
        break;
    }
  }
  return [Math.floor(red), Math.floor(green), Math.floor(blue)];
}

function componentToHex(c: number) {
  const hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}

export function fadeColor(hex: string, luminosity: number, lighten: boolean): string {
  // #ABC => ABC
  hex = hex.replace(/[^0-9a-f]/gi, '');

  // ABC => AABBCC
  if (hex.length < 6) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];

  // tweak
  let rgb = '#';
  for (let i = 0; i < 3; i++) {
    let c = parseInt(hex.substr(i * 2, 2), 16);
    c = Math.round(Math.min(Math.max(0, lighten ? c + c * luminosity : c - c * luminosity), 255));
    const cStr = c.toString(16);
    rgb += ('00' + cStr).substr(cStr.length);
  }

  return rgb;
}

export function defaultIconForArgType(typeName = '') {
  switch (typeName) {
    case 'number':
      return 'calculator';
    case 'string':
      return 'text width';
    case 'boolean':
      return 'random';
    default:
      return 'align justify';
  }
}
