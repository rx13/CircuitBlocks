import React, { Component, DOMElement, RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { IpcRenderer } from 'electron';
import { saveAs } from 'file-saver';

import { BrowserStorageManager } from '../../helpers/storage/BrowserStorageManager';
import { uuidv4 } from '../../helpers/storage/uuid';
import type { SavedSketch } from '../../helpers/storage/StorageManager';

import { toolbox } from '../../assets/xmls.js';
import EditorHeader from './components/EditorHeader';
import * as Modal from '../../components/Modal';
import EditorPopup from './components/EditorPopup';
import EditorPopupHeader from './components/EditorPopupHeader';
import Monaco from './components/Monaco';
import BlocklyEditor from '../../components/BlocklyEditor';
import Toolbox from '../../components/Toolbox';
import Prompt from '../../components/Modal/Prompt';
import Notification, { NotificationWrapper } from '../../components/Notification';
import Serial from './components/Serial';
import { Devices, Sketch } from '../Home/index';
import Toolboxes from '../../components/BlocklyToolbox/Toolbox';
import MonacoRO from './components/MonacoRO';
import { CloseConfirm } from './components/CloseConfirm';
import { Pixel, Sprite } from './components/SpriteEditor/Sprite';
import SpriteEditor from './components/SpriteEditor/index';
import GameExport from './components/GameExport';

const StartSketches: { [name: string]: { block: string; code: string } } = {};

StartSketches['cm:esp32:ringo'] = {
  block: `<xml xmlns="http://www.w3.org/1999/xhtml"><block type="arduino_functions" id="a2?I/d{0K_Umf.d2k4D0" x="40" y="50"></block></xml>`,
  code: `#include <MAKERphone.h>

MAKERphone mp;

void setup() {
  mp.begin(1);
  mp.display.fillScreen(TFT_BLACK);
}

void loop() {
  mp.update();
  
}`
};

StartSketches['cm:esp8266:nibble'] = {
  block: `<xml xmlns="http://www.w3.org/1999/xhtml"><block type="arduino_functions" id="a2?I/d{0K_Umf.d2k4D0" x="40" y="50"></block></xml>`,
  code: `#include <Arduino.h>

void setup() {
  
}

void loop() {
  
}`
};

StartSketches['cm:esp32:circuitpet'] =
  StartSketches['cm:esp32:synthia'] =
  StartSketches['cm:esp32:chatter'] =
  StartSketches['cm:esp32:byteboi'] =
  StartSketches['cm:esp32:wheelson'] =
  StartSketches['cm:esp32:jayd'] =
  StartSketches['cm:esp32:spencer'] =
    StartSketches['cm:esp8266:nibble'];

const sanitizeName = (name: string) => name.replace(/ /g, '_').replace(/\./g, '');

export enum SketchType {
  BLOCK,
  CODE
}

export interface SketchLoadInfo {
  data: string;
  type: SketchType;
  device: string;
}

interface EditorProps {
  isEditorOpen: boolean;
  openHome: () => void;
  title: string;
  setFilename: (filename: string) => void;
  monacoRef: React.RefObject<any>;
  reportError: (error: string, fatal?: boolean) => void;
  device: string;
}

interface State {
  isModalOpen: boolean;
  modal: {
    type: 'save' | 'load';
    data?: any;
  };
  serial: string;
  isSerialOpen: boolean;
  isCodeOpen: boolean;
  isCodeFull: boolean;
  width?: number;
  height?: number;
  theme: 'vs-light' | 'vs-dark';
  initState?: string;
  isPromptOpen?: boolean;
  promptText?: string;
  runningStage?: string;
  running: boolean;
  notifications: Notification[];
  makerPhoneConnected: boolean;
  filename: string;
  filenames?: string[];
  filenameError?: string;
  xml?: string;
  type: SketchType;
  code: string;
  minimalCompile: boolean;
  startCode: string;
  codeDidChange?: boolean;
  isExitEditor: boolean;
  isExitEditorOption: string;
  spriteEditorOpen: boolean;
  sprites: Sprite[];
  gameExportOpen: boolean;
}

const NAV_BAR_HEIGHT = 64;

const INIT_STATE: State = {
  isModalOpen: false,
  modal: {
    type: 'save'
  },
  isCodeOpen: true,
  isCodeFull: false,
  height: window.innerHeight - NAV_BAR_HEIGHT,
  theme: 'vs-dark',
  notifications: [],
  makerPhoneConnected: false,
  filename: '',
  running: false,
  serial: '',
  isSerialOpen: false,
  type: SketchType.BLOCK,
  code: '',
  minimalCompile: true,
  startCode: '',
  codeDidChange: false,
  isExitEditor: false,
  isExitEditorOption: '',
  spriteEditorOpen: false,
  sprites: [],
  gameExportOpen: false
};

interface Notification {
  id: string;
  message: string;
  icon?: string;
  close?: boolean;
}

let ipcRenderer: typeof import('electron').ipcRenderer | undefined;
if (typeof window !== 'undefined' && typeof (window as any).require === 'function') {
  try {
    const electron = (window as any).require('electron') as typeof import('electron');
    ipcRenderer = electron.ipcRenderer;
  } catch (e) {
    ipcRenderer = undefined;
  }
}

class Editor extends Component<EditorProps, State> {
  toolboxRoot: any = null;
  blocklyDiv: any = undefined;
  workspace: any = undefined;
  Blockly: any = null;
  callback: (value: string) => void = () => {};

  public static readonly DefaultSpriteNames = [
    'sword',
    'knife',
    'morning_star',
    'trident',
    'shield',
    'potion',
    'tree1',
    'tree2',
    'tree3',
    'rock1',
    'rock2',
    'rock3',
    'character1',
    'character2',
    'character3',
    'character4',
    'bush1',
    'bush2',
    'house'
  ];

  constructor(props: EditorProps) {
    super(props);
    this.handleKeyboardSave = this.handleKeyboardSave.bind(this);

    this.state = {
      ...INIT_STATE
    };

    this.updateDimensions = this.updateDimensions.bind(this);

    if (ipcRenderer) {
      ipcRenderer.on('ports', (event: any, args: any) => {
        const { port } = args;
        const { device } = this.props;

        if (port && !this.state.makerPhoneConnected) {
          this.addNotification(`${Devices[device].name} connected`);
          this.setState({ makerPhoneConnected: true });
        } else if (!port && this.state.makerPhoneConnected) {
          this.addNotification(`${Devices[device].name} disconnected`);
          this.setState({ makerPhoneConnected: false });
        }
      });

      ipcRenderer.on('runprogress', (event: any, args: any) => {
        if (args.stage == 'DONE' && args.running) {
          this.setState({ running: true });
          return;
        }

        if (!this.state.running) return;

        if (args.cancel) {
          this.addNotification('Run operation cancelled.');
        }

        if (args.stage == 'DONE') {
          this.setState({ running: false, runningStage: undefined });
          return;
        }

        if (this.state.runningStage != args.stage) {
          this.setState({ runningStage: args.stage });
        }
      });
    }
  }

  handleKeyboardSave(e: any) {
    console.log(e);
    if (e.keyCode === 83 && e.ctrlKey === true) {
      console.log(this);
      if (!this.props.title) {
        this.openSaveModal();
      } else {
        this.save();
      }
    }
  }
  getCode() {
    let code: string;

    if (this.state.type == SketchType.CODE) {
      if (this.props.monacoRef == undefined || this.props.monacoRef.current == null) return '';

      code = this.props.monacoRef.current.getCode();
    } else {
      if (!this.workspace || !this.Blockly) return '';
      // @ts-ignore
      code = this.Blockly.Arduino.workspaceToCode(this.workspace);

      if (
        this.Blockly.Device != 'Spencer' &&
        this.Blockly.Device != 'MAKERphone' &&
        this.Blockly.Device != 'Synthia'
      ) {
        let spriteCode = '';
        if (this.Blockly.Sprites !== undefined && Array.isArray(this.Blockly.Sprites)) {
          this.Blockly.Sprites.forEach((sprite) => {
            spriteCode += sprite.toCode() + '\n\n';
          });
        }

        this.Blockly.DefaultSprites.forEach((sprite) => {
          spriteCode += sprite.toCode() + '\n\n';
        });

        code = code.replace('Display* display;', spriteCode + '\nDisplay* display;');
      }
    }

    // this.setState({ code });
    return code;
  }

  updateDimensions() {
    const { innerWidth, innerHeight } = window;
    this.setState({
      width: innerWidth,
      height: innerHeight - NAV_BAR_HEIGHT
    });

    if (this.Blockly) {
      this.Blockly.svgResize(this.workspace);
    }
  }

  async componentDidMount() {
    const BlocklyModule = await import('../../blockly/blockly');
    this.Blockly = BlocklyModule.default || BlocklyModule;

    this.Blockly.prompt = (a, b, c) => {
      const initState = a.split("'")[1];
      this.callback = c;
      this.setState({ initState, isPromptOpen: true, promptText: a });
    };

    (window as any).Blockly = this.Blockly;
    this.loadDefaultSprites();
    this.workspace = this.Blockly.inject(this.blocklyDiv, {
      toolbox,
      trashcan: false,
      zoom: { wheel: true, controls: true }
    });
    this.workspace.addChangeListener((e: any) => {
      // @ts-ignore
      const code = this.Blockly.Arduino.workspaceToCode(this.workspace);
      this.setState({ code });
      this.setState({ codeDidChange: true });
    });

    this.updateDimensions();
    window.addEventListener('resize', this.updateDimensions);
    window.addEventListener('keydown', this.handleKeyboardSave, false);

    if (ipcRenderer) {
      ipcRenderer.send('ports');
    }
  }

  UNSAFE_componentWillUpdate(
    nextProps: Readonly<EditorProps>,
    nextState: Readonly<State>,
    nextContext: any
  ): void {
    const stateUpdate: any = {};
    if (this.props.isEditorOpen && !nextProps.isEditorOpen) {
      this.setState({ isSerialOpen: false });
    }
  }

  injectToolbox(device: string) {
    const blockly = this.blocklyDiv as Element;
    const blocklyToolboxDiv = blockly.getElementsByClassName('blocklyToolboxDiv')[0];
    if (!this.toolboxRoot) {
      this.toolboxRoot = createRoot(blocklyToolboxDiv);
    }

    const blocklyToolbox = (
      <div className="blocklyToolbox">
        <Toolbox editorname="blocks" blockly={this.Blockly} categories={Toolboxes[device]()} />
      </div>
    );

    this.toolboxRoot.render(
      <div className="blocklyToolbox">
        <Toolbox editorname="blocks" blockly={this.Blockly} categories={Toolboxes[device]()} />
      </div>
    );
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions);
    window.removeEventListener('keydown', this.handleKeyboardSave);
  }

  run = () => {
    if (this.state.running) {
      if (ipcRenderer) {
        ipcRenderer.send('stop', { code: this.getCode(), minimal: this.state.minimalCompile });
      }
    } else {
      this.setState({ running: true });
      if (ipcRenderer) {
        ipcRenderer.send('run', {
          code: this.getCode(),
          device: this.props.device,
          minimal: this.state.minimalCompile
        });
      }
    }
  };

  openLoadModal = () => {
    this.setState({ isModalOpen: true });
  };

  closeNotification = (id: string) => () => {
    this.setState((oldState) => {
      const newNotifications = oldState.notifications.map((item) =>
        item.id !== id ? item : { ...item, close: true }
      );

      setTimeout(() => {
        this.setState((oldState) => {
          const removeNotifications = oldState.notifications.filter((item) => item.id !== id);
          return { notifications: removeNotifications };
        });
      }, 500);

      return { notifications: newNotifications };
    });
  };

  addNotification = (message: string, time = 2000) => {
    const notification: Notification = {
      message,
      id: new Date().getTime().toString()
    };
    this.setState({ notifications: [...this.state.notifications, notification] });

    if (time !== -1) {
      setTimeout(this.closeNotification(notification.id), time);
    }
  };

  loadDefaultSprites = async () => {
    if (!this.Blockly) return;
    this.Blockly.DefaultSprites = [];

    // Load predefined sprites
    if (Array.isArray(this.Blockly.DefaultSprites) && this.Blockly.DefaultSprites.length == 0) {
      Editor.DefaultSpriteNames.forEach((s) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          const iData = ctx.getImageData(0, 0, img.width, img.height);
          const { data } = iData;

          const sprite = new Sprite(s, img.width, img.height);
          for (let x = 0; x < sprite.width; x++) {
            for (let y = 0; y < sprite.height; y++) {
              const i = y * sprite.width + x;
              sprite.setPixel(x, y, {
                r: data[i * 4],
                g: data[i * 4 + 1],
                b: data[i * 4 + 2],
                a: data[i * 4 + 3] == 255
              });
            }
          }

          this.Blockly.DefaultSprites.push(sprite);
        };

        img.src = require(`../../assets/sprites/${s}.png`);
      });
    }

    // Load custom sprites from storage and append
    try {
      const storage = new BrowserStorageManager();
      const customSprites = await storage.loadAllCustomSprites();
      for (const cs of customSprites) {
        const sprite = new Sprite(cs.name, cs.width, cs.height);
        await sprite.fromFile(cs.imageData);
        this.Blockly.DefaultSprites.push(sprite);
      }
    } catch (e) {
      // Ignore errors loading custom sprites
    }
  };

  load = (sketch: SketchLoadInfo) => {
    if (!this.Blockly) return;
    const Name: { [name: string]: string } = {
      'cm:esp32:ringo': 'MAKERphone',
      'cm:esp8266:nibble': 'Nibble',
      'cm:esp32:spencer': 'Spencer',
      'cm:esp32:jayd': 'Jay-D',
      'cm:esp32:wheelson': 'Wheelson',
      'cm:esp32:byteboi': 'ByteBoi',
      'cm:esp32:chatter': 'Chatter',
      'cm:esp32:synthia': 'Synthia',
      'cm:esp32:circuitpet': 'CircuitPet'
    };

    this.Blockly.Device = Name[sketch.device];

    const sprites: Sprite[] = [];
    this.Blockly.Sprites = sprites;

    if (sketch.type == SketchType.CODE) {
      let startCode: string;

      if (sketch.data === '') {
        startCode = StartSketches[sketch.device].code;
      } else {
        startCode = sketch.data;
      }

      this.setState({ code: startCode, type: sketch.type, startCode, sprites });
    } else {
      if (sketch.data === '') sketch.data = StartSketches[sketch.device].block;
      const xml = this.Blockly.Xml.textToDom(sketch.data);
      this.workspace.clear();
      this.Blockly.Xml.domToWorkspace(xml, this.workspace);
      this.injectToolbox(sketch.device);

      if (sketch.data && sketch.data !== '') {
        const domParser = new DOMParser();
        const dom = domParser.parseFromString(sketch.data, 'application/xml');
        const spritesEl = dom.getElementsByTagName('sprites');
        if (spritesEl.length != 0) {
          const spriteEls = spritesEl[0].getElementsByTagName('sprite');

          for (let i = 0; i < spriteEls.length; i++) {
            const name = spriteEls[i].getAttribute('name');
            const width = spriteEls[i].getAttribute('width');
            const height = spriteEls[i].getAttribute('height');
            if (!name || !width || !height) continue;

            const sprite = new Sprite(name, parseInt(width), parseInt(height));
            const data = spriteEls[i].innerHTML.split(',');
            for (let j = 0; j < sprite.width * sprite.height; j++) {
              const y = Math.floor(j / sprite.width);
              const x = j - y * sprite.width;
              sprite.setPixel(x, y, {
                r: parseInt(data[j * 4]),
                g: parseInt(data[j * 4 + 1]),
                b: parseInt(data[j * 4 + 2]),
                a: data[j * 4 + 3] == '1'
              });
            }

            sprites.push(sprite);
          }
        }
      }

      this.workspace.clearUndo();
      this.setState({ type: sketch.type, sprites });

      setTimeout(() => this.setState({ codeDidChange: false }), 1250);
    }
  };

  private onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    console.log(e.key);
  };

  private generateSketch(): string {
    if (!this.Blockly) return '';
    const xmlDom = this.Blockly.Xml.workspaceToDom(this.workspace) as unknown as Element;

    const node = this.workspace.getCanvas().cloneNode(true);
    node.removeAttribute('transform');
    node.firstChild.removeAttribute('transform');

    const snapshot = document.createElement('snapshot');
    snapshot.appendChild(node);

    const device = document.createElement('device');
    device.innerText = this.props.device;

    const sprites = document.createElement('sprites');
    this.Blockly.Sprites.forEach((s: any) => {
      const sprite = document.createElement('sprite');
      sprite.setAttribute('name', s.name);
      sprite.setAttribute('width', s.width);
      sprite.setAttribute('height', s.height);

      const data: string[] = [];
      s.data.forEach((pixel: Pixel) => {
        data.push('' + pixel.r);
        data.push('' + pixel.g);
        data.push('' + pixel.b);
        data.push('' + (pixel.a ? 1 : 0));
      });

      sprite.innerHTML = data.join(',');
      sprites.appendChild(sprite);
    });

    xmlDom.prepend(snapshot);
    xmlDom.prepend(device);
    xmlDom.prepend(sprites);

    return this.Blockly.Xml.domToText(xmlDom);
  }

  save = async () => {
    // Detect Electron vs Web
    const isElectron = typeof window !== "undefined" && typeof (window as any).require === "function";
    let data: string | undefined;
    let snapshot: string | undefined = undefined;
    let sprites: any[] | undefined = undefined;

    if (this.state.type == SketchType.BLOCK) {
      data = this.generateSketch();
      try {
        const domParser = new DOMParser();
        const dom = domParser.parseFromString(data, 'application/xml');
        const snapshotEl = dom.getElementsByTagName('snapshot')[0];
        if (snapshotEl && snapshotEl.firstChild) {
          const node = snapshotEl.firstChild;
          snapshot = (node instanceof Element && node.outerHTML) ? node.outerHTML : (node.textContent || '');
        }
        const spritesEl = dom.getElementsByTagName('sprites')[0];
        if (spritesEl) {
          sprites = [];
          const spriteEls = spritesEl.getElementsByTagName('sprite');
          for (let i = 0; i < spriteEls.length; i++) {
            const s = spriteEls[i];
            sprites.push({
              name: s.getAttribute('name'),
              width: s.getAttribute('width'),
              height: s.getAttribute('height'),
              data: s.innerHTML
            });
          }
        }
      } catch (e) {
        // fallback: ignore snapshot/sprites if parsing fails
      }
    } else {
      data = this.getCode();
    }

    if (isElectron && ipcRenderer) {
      ipcRenderer.once('save', (event, arg) => {
        if (arg.error) {
          this.props.reportError(arg.error);
        } else {
          this.addNotification('Sketch saved.');
        }
      });

      ipcRenderer.send('save', {
        title: this.props.title,
        data,
        type: this.state.type,
        device: this.props.device
      });
    } else {
      // Web: IndexedDB
      const storage = new BrowserStorageManager();
      const now = new Date().toISOString();

      // Check for existing sketch with same title/device
      let id = uuidv4();
      let created = now;
      try {
        const all = await storage.loadAllSketches();
        const existing = all.find(
          s => s.title === this.props.title && s.device === this.props.device
        );
        if (existing) {
          id = existing.id;
          created = existing.created;
        }
      } catch (e) {
        // ignore XML parsing errors for snapshot/sprites extraction
      }

      const sketch: SavedSketch = {
        id,
        title: this.props.title,
        device: this.props.device,
        type: this.state.type === SketchType.BLOCK ? 'block' : 'code',
        data: data || '',
        sprites,
        snapshot,
        description: '', // Optionally add description support
        lastModified: now,
        created
      };

      try {
        await storage.saveSketch(sketch);
        this.addNotification('Sketch saved.');
      } catch (err) {
        this.props.reportError('Failed to save sketch.');
      }
    }

    if (this.state.isExitEditor === true) {
      this.setState({ isExitEditor: false });
      this.props.openHome();
    } else {
      this.setState({ isExitEditor: false });
    }
  };

  onSubmitSaveModal = async (e?: React.FormEvent<HTMLFormElement>) => {
    const filename = sanitizeName(this.state.filename);
    e && e.preventDefault();

    if (!filename) {
      this.setState({ filenameError: 'EMPTY' });
      return;
    }

    const isElectron = typeof window !== "undefined" && typeof (window as any).require === "function";
    let data: string | undefined;
    let snapshot: string | undefined = undefined;
    let sprites: any[] | undefined = undefined;

    if (this.state.type == SketchType.BLOCK) {
      data = this.generateSketch();
      try {
        const domParser = new DOMParser();
        const dom = domParser.parseFromString(data, 'application/xml');
        const snapshotEl = dom.getElementsByTagName('snapshot')[0];
        if (snapshotEl && snapshotEl.firstChild) {
          const node = snapshotEl.firstChild;
          snapshot = (node instanceof Element && node.outerHTML) ? node.outerHTML : (node.textContent || '');
        }
        const spritesEl = dom.getElementsByTagName('sprites')[0];
        if (spritesEl) {
          sprites = [];
          const spriteEls = spritesEl.getElementsByTagName('sprite');
          for (let i = 0; i < spriteEls.length; i++) {
            const s = spriteEls[i];
            sprites.push({
              name: s.getAttribute('name'),
              width: s.getAttribute('width'),
              height: s.getAttribute('height'),
              data: s.innerHTML
            });
          }
        }
      } catch (e) {
        // ignore XML parsing errors for snapshot/sprites extraction
      }
    } else {
      data = this.getCode();
    }

    if (isElectron && ipcRenderer) {
      ipcRenderer.once('save', (event, arg) => {
        if (arg.error) {
          this.props.reportError(arg.error);
        } else {
          this.props.setFilename(filename);
          this.finishSaveModal();
          this.addNotification('Sketch saved.');
          if (window && window.location && window.location.reload) {
            setTimeout(() => window.location.reload(), 500);
          }
        }
      });

      ipcRenderer.send('save', {
        title: filename,
        data,
        type: this.state.type,
        device: this.props.device
      });
    } else {
      // Web: IndexedDB
      const storage = new BrowserStorageManager();
      const now = new Date().toISOString();

      // Check for existing sketch with same title/device
      let id = uuidv4();
      let created = now;
      try {
        const all = await storage.loadAllSketches();
        const existing = all.find(
          s => s.title === filename && s.device === this.props.device
        );
        if (existing) {
          id = existing.id;
          created = existing.created;
        }
      } catch (e) {
        // fallback: ignore snapshot/sprites if parsing fails
      }

      const sketch: SavedSketch = {
        id,
        title: filename,
        device: this.props.device,
        type: this.state.type === SketchType.BLOCK ? 'block' : 'code',
        data: data || '',
        sprites,
        snapshot,
        description: '', // Optionally add description support
        lastModified: now,
        created
      };

      try {
        await storage.saveSketch(sketch);
        this.props.setFilename(filename);
        this.finishSaveModal();
        this.addNotification('Sketch saved.');
        if (window && window.location && window.location.reload) {
          setTimeout(() => window.location.reload(), 500);
        }
      } catch (err) {
        this.props.reportError('Failed to save sketch.');
      }
    }

    this.setState({ isExitEditor: false });
  };

  openSaveModal = (option?: string) => {
    if (this.state.type == SketchType.BLOCK && this.workspace.getAllBlocks().length === 0) {
      this.props.reportError("You can't save an empty sketch.");
      return;
    }

    // Always open the modal in browser context
    this.setState({
      isModalOpen: true,
      modal: {
        type: 'save'
      },
      filename: '',
      filenameError: 'EMPTY'
    });

    // Optionally, handle saveAndExit logic
    if (option === 'saveAndExit') {
      if (this.props.title !== '') {
        this.props.openHome();
      }
    }
  };

  exportBinary = () => {
    // Electron-only: disabled in browser
    this.addNotification('Export is only available in the desktop app.');
  };

  exportGame = (name: string, sprite?: Sprite) => {
    // Electron-only: disabled in browser
    this.addNotification('Game export is only available in the desktop app.');
  };

  saveExternal = () => {
    if (this.state.xml) {
      const blob = new Blob([this.state.xml], {
        type: 'application/xml;charset=utf-8'
      });
      saveAs(blob, 'filename.xml');
    }
    this.finishSaveModal();
  };

  toggle = () => {
    this.setState({ isCodeOpen: !this.state.isCodeOpen });
    this.updateDimensions();
  };

  closeModal = () => {
    this.setState({ isModalOpen: false });
  };

  closeCode = () => {
    this.state.isCodeOpen && this.toggle();
  };

  fullScreenToggle = () => {
    this.setState({ isCodeFull: !this.state.isCodeFull });
  };

  setRef = (ref: any) => {
    this.blocklyDiv = ref;
  };

  toggleTheme = () => {
    this.setState({ theme: this.state.theme === 'vs-dark' ? 'vs-light' : 'vs-dark' });
  };

  closePrompt = () => {
    this.setState({ isPromptOpen: false });
  };

  saveAndExit = (option?: string) => {
    if (this.state.codeDidChange === true) {
      this.setState({ isExitEditor: true });
      switch (option) {
        case 'saveAndExit':
          if (this.props.title === '') {
            this.openSaveModal(option);
            this.setState({ isExitEditor: false });
            option = '';
            break;
          } else if (this.props.title !== '') {
            this.save();
            this.setState({ isExitEditor: false });
            this.props.openHome();
            break;
          }
        case 'exit': {
          this.props.openHome();
          this.setState({ isExitEditor: false });
          break;
        }

        case 'cancel':
          this.setState({ isExitEditor: false });
          console.log(this.state.codeDidChange);
          break;
      }
    } else {
      this.setState({ isExitEditor: false });
      this.props.openHome();
    }
  };

  onChangeSaveModal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filename = e.target.value;
    const newState: { filename: string; filenameError: string | undefined } = {
      filename,
      filenameError: undefined
    };

    if (filename.length === 0) {
      newState.filenameError = 'EMPTY';
    } else if (this.state.filenames && this.state.filenames.includes(filename)) {
      newState.filenameError = 'EXISTS';
    }

    console.log(newState);

    this.setState(newState);
  };

  finishSaveModal = () => {
    this.setState({
      isModalOpen: false,
      filename: '',
      filenameError: undefined
    });
  };

  cleanup = () => {
    if (this.Blockly) {
      this.Blockly.hideChaff();
    }
  };

  openSpriteEditor = () => {
    this.setState({ spriteEditorOpen: !this.state.spriteEditorOpen });
  };

  render() {
    const {
      isModalOpen,
      modal,
      isCodeOpen,
      isCodeFull,
      height,
      width,
      theme,
      isPromptOpen,
      initState,
      promptText,
      runningStage,
      notifications,
      makerPhoneConnected,
      filename,
      filenameError,
      serial,
      isSerialOpen,
      type,
      minimalCompile,
      startCode,
      spriteEditorOpen,
      sprites,
      gameExportOpen
    } = this.state;
    const { isEditorOpen, openHome, title, monacoRef, device } = this.props;

    const stateCode = this.state.code;
    let code: string = stateCode;

    if (type == SketchType.CODE) {
      code = this.getCode();
    }

    const footer = {
      left: [{ text: 'Save externally', onClick: this.saveExternal }],
      right: [
        { text: 'Cancel', onClick: this.closeModal },
        { text: 'Save', onClick: this.save, color: 'blue' },
        { text: 'Save', onClick: this.save, color: 'blue', disabled: true }
      ]
    };

    const saveFooter = {
      left: [{ text: 'Save externally', onClick: this.saveExternal }],
      right: [
        { text: 'Cancel', onClick: this.closeModal },
        {
          text: 'Save',
          onClick: this.onSubmitSaveModal,
          color: 'blue',
          disabled: this.state.filenameError !== undefined
        }
      ]
    };

    const modalProps = {
      footer: modal.type === 'save' ? saveFooter : footer,
      title: 'Modal title',
      close: this.closeModal
    };

    return (
      <div className={isEditorOpen ? 'e-open' : 'e-close'} style={{ backgroundColor: '#F9F9F9' }}>
        {isEditorOpen && (
          <>
            {isModalOpen &&
              (modal.type === 'save' ? (
                <Modal.SaveModal
                  {...modalProps}
                  filename={filename}
                  filenameError={filenameError}
                  onChange={this.onChangeSaveModal}
                  onSubmit={this.onSubmitSaveModal}
                />
              ) : null)}

            {isPromptOpen && (
              <Prompt
                initValue={initState || ''}
                callback={this.callback}
                promptText={promptText || ''}
                closePrompt={this.closePrompt}
              />
            )}
            {spriteEditorOpen && type == SketchType.BLOCK && (
              <SpriteEditor
                sprites={sprites}
                close={() => this.setState({ spriteEditorOpen: false })}
              />
            )}
            {gameExportOpen && type == SketchType.BLOCK && (
              <GameExport
                sprites={sprites}
                close={() => {
                  this.setState({ gameExportOpen: false });
                }}
                save={(name, sprite) => {
                  this.setState({ gameExportOpen: false });
                  this.exportGame(name, sprite);
                }}
              />
            )}
            <CloseConfirm
              open={this.state.isExitEditor}
              closeModalCallback={(option) => this.saveAndExit(option)}
            />
            <EditorHeader
              gameExportButton={type == SketchType.BLOCK && device == 'cm:esp32:byteboi'}
              openGameExport={() => this.setState({ gameExportOpen: true })}
              spriteEditorButton={
                type == SketchType.BLOCK &&
                device != 'cm:esp32:spencer' &&
                device != 'cm:esp32:ringo' &&
                device != 'cm:esp32:synthia'
              }
              isSpriteOpen={spriteEditorOpen}
              openSpriteEditor={() => this.openSpriteEditor()}
              home={this.saveAndExit}
              load={this.openLoadModal}
              run={this.run}
              save={this.props.title.length > 0 ? this.save : this.openSaveModal}
              toggle={this.toggle}
              title={title}
              isCodeOpen={isCodeOpen}
              isSerialOpen={isSerialOpen}
              openSerial={() => this.setState({ isSerialOpen: !this.state.isSerialOpen })}
              connected={makerPhoneConnected}
              exportBinary={this.exportBinary}
              codeButton={type == SketchType.BLOCK}
              minimalCompile={minimalCompile}
              device={device}
              toggleMinimal={() => {
                this.setState({ minimalCompile: !minimalCompile });
              }}
            />

            {notifications && (
              <NotificationWrapper>
                {notifications.map((item) => (
                  <Notification key={item.id} {...item} onClick={this.closeNotification(item.id)} />
                ))}
              </NotificationWrapper>
            )}
          </>
        )}

        <BlocklyEditor
          running={this.state.running}
          runStage={this.state.runningStage}
          height={height}
          width={width}
          isCodeOpen={isCodeOpen}
          setRef={this.setRef}
          ws={this.workspace}
          disabled={type == SketchType.CODE}
        />

        <Serial
          connected={this.state.makerPhoneConnected && runningStage != 'UPLOAD'}
          isOpen={isSerialOpen}
        />

        {isCodeOpen && isEditorOpen && (
          <EditorPopup
            className={isCodeFull || type == SketchType.CODE ? 'fullscreen' : ''}
            theme={theme}
          >
            <EditorPopupHeader
              closeCode={this.closeCode}
              fullScreenToggle={this.fullScreenToggle}
              toggleTheme={this.toggleTheme}
              theme={theme}
              extendedHeader={type == SketchType.BLOCK}
            />
            {(type == SketchType.CODE && (
              <Monaco ref={monacoRef} startCode={startCode} theme={theme} editing />
            )) || <MonacoRO code={code} theme={theme} />}
          </EditorPopup>
        )}
      </div>
    );
  }
}

export default Editor;
