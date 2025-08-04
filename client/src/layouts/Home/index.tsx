import React from 'react';
import { IpcRenderer, IpcRendererEvent } from 'electron';
import styled from 'styled-components';

import CircularProgress from '@mui/material/CircularProgress';
import { ProjectSection } from '../../components/Section';
import { HeaderImage, HeaderSection } from './components/Header';
import { Footer } from './components/Footer';
import { Login } from './components/Login';
import { SketchLoadInfo, SketchType } from '../Editor';
import { BrowserStorageManager } from '../../helpers/storage/BrowserStorageManager';
import type { SavedSketch } from '../../helpers/storage/StorageManager';
import { NewSketch } from './components/NewSketch';
import { RestoreFirmware } from './components/RestoreFirmware';
import { SpencerSettings } from './components/SpencerSettings';
import packageJson from '../../../package.json';

// const projects = [
//   {
//     title: 'Getting Started GuideModal',
//     author: 'Official Example',
//     description:
//       'In this sketch you can find real world examples of something important to your device programming.'
//   },
//   {
//     title: 'Getting Started Guide',
//     author: 'Official Example',
//     description:
//       'In this sketch you can find real world examples of something important to your device programming.'
//   }
// ];

const Main = styled.div`
  background-color: #fafafa;
  padding: 30px 0;
`;

interface HomeProps {
  isEditorOpen: boolean;
  openEditor: (data: SketchLoadInfo, filename?: string) => void;
  scrollStop: boolean;
  reportError: (error: string, fatal?: boolean) => void;
}

interface HomeState {
  animation: boolean;
  loggedIn: boolean;
  sketches: { block: Sketch[]; code: Sketch[] };
  examples: Category[];
  projectsLoading: boolean;
  examplesLoading: boolean;
  newSketchOpen: boolean;
  restoreFirmwareModalOpen: boolean;
  spencerSettingsModalOpen: boolean;
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

interface Device {
  fqbn: string;
  name: string;
}

export const Devices: { [name: string]: Device } = {
  'cm:esp32:ringo': { fqbn: 'cm:esp32:ringo', name: 'Ringo' },
  'cm:esp8266:nibble': { fqbn: 'cm:esp8266:nibble', name: 'Nibble' },
  'cm:esp32:spencer': { fqbn: 'cm:esp32:spencer', name: 'Spencer' },
  'cm:esp32:jayd': { fqbn: 'cm:esp32:jayd', name: 'Jay-D' },
  'cm:esp32:wheelson': { fqbn: 'cm:esp32:wheelson', name: 'Wheelson' },
  'cm:esp32:byteboi': { fqbn: 'cm:esp32:byteboi', name: 'ByteBoi' },
  'cm:esp32:chatter': { fqbn: 'cm:esp32:chatter', name: 'Chatter' },
  'cm:esp32:synthia': { fqbn: 'cm:esp32:chatter', name: 'Synthia' },
  'cm:esp32:circuitpet': { fqbn: 'cm:esp32:circuitpet', name: 'CircuitPet' }
};

export interface Sketch {
  title: string;
  device: string;
  path?: string;
  snapshot?: string;
  description?: string;
}

export interface Category {
  title: string;
  sketches: { code: Sketch[]; block: Sketch[] };
}

export default class Home extends React.Component<HomeProps, HomeState> {
  // useEffect(() => {
  //   setInterval(() => setLoggedIn((logged) => !logged), 2000);
  // }, []);

  handleDeleteSketch = async (sketch: Sketch) => {
    const isElectron = typeof window !== "undefined" && typeof (window as any).require === "function";
    if (isElectron && ipcRenderer) {
      // Electron: send IPC delete event (by title/device/path)
      ipcRenderer.once('delete', () => {
        this.loadSketches();
      });
      ipcRenderer.send('delete', { title: sketch.title, device: sketch.device, path: sketch.path });
    } else {
      // Web: IndexedDB
      try {
        const storage = new BrowserStorageManager();
        // Need to find the id of the sketch
        const all = await storage.loadAllSketches();
        const match = all.find(s => s.title === sketch.title && s.device === sketch.device);
        if (match) {
          await storage.deleteSketch(match.id);
        }
        this.loadSketches();
      } catch (e) {
        // Optionally show error
      }
    }
  };

  public constructor(props: HomeProps) {
    super(props);

    this.state = {
      spencerSettingsModalOpen: false,
      loggedIn: true,
      animation: false,
      sketches: { code: [], block: [] },
      examples: [],
      projectsLoading: true,
      examplesLoading: true,
      newSketchOpen: false,
      restoreFirmwareModalOpen: false
    };

    if (ipcRenderer) {
      ipcRenderer.on('sketches', (event: IpcRendererEvent, args) => {
        this.setState({
          sketches: args.sketches || { code: [], block: [] },
          projectsLoading: false
        });
      });

      ipcRenderer.on('examples', (event: IpcRendererEvent, args) => {
        this.setState({ examples: args.categories || [], examplesLoading: false });
      });
    }
  }

  private foo() {
    this.setState({ animation: true });
    setTimeout(() => this.setState({ loggedIn: true }), 300);
  }

  public componentDidUpdate(
    prevProps: Readonly<HomeProps>,
    prevState: Readonly<HomeState>,
    snapshot?: any
  ): void {
    if (prevProps.isEditorOpen == this.props.isEditorOpen) return;

    window.scrollTo(0, 0);

    this.loadSketches();
  }

  public componentDidMount(): void {
    this.loadSketches();
  }

  public async loadSketches() {
    this.setState({ projectsLoading: true, examplesLoading: true });

    const isElectron = typeof window !== "undefined" && typeof (window as any).require === "function";
    if (isElectron && ipcRenderer) {
      ipcRenderer.send('sketches');
      ipcRenderer.send('examples');
      // The 'sketches' IPC handler will update state via the ipcRenderer.on('sketches', ...) in the constructor
    } else {
      // Browser context: load sketches from IndexedDB
      const storage = new BrowserStorageManager();
      try {
        const all: SavedSketch[] = await storage.loadAllSketches();
        const block = all.filter(s => s.type === 'block');
        const code = all.filter(s => s.type === 'code');
        this.setState({
          sketches: { block, code },
          projectsLoading: false,
          examplesLoading: false
        });
      } catch (e) {
        this.setState({
          sketches: { block: [], code: [] },
          projectsLoading: false,
          examplesLoading: false
        });
      }
    }
  } // , [isEditorOpen]);

  public restoreFirmware(device: string) {
    this.setState({ restoreFirmwareModalOpen: false });
    ipcRenderer.send('firmware', { device });
  }

  public openErrorReport() {
    ipcRenderer.send('report');
  }

  public async openFile(
    type: 'NEW' | 'NEWTYPE' | 'OPEN',
    device: string,
    sketch?: Sketch,
    sketchType?: SketchType
  ) {
    const { reportError, openEditor } = this.props;
    const isElectron = typeof window !== "undefined" && typeof (window as any).require === "function";

    if (type === 'NEW') {
      this.setState({ newSketchOpen: true });
    } else if (type == 'NEWTYPE' && sketchType != undefined) {
      this.setState({ newSketchOpen: false });
      openEditor({ type: sketchType, device, data: '' }, undefined);
    } else if (sketch) {
      if (isElectron && ipcRenderer) {
        ipcRenderer.once('load', (event: IpcRendererEvent, args) => {
          if (args.error) {
            reportError(args.error);
          } else {
            openEditor({ type: args.type, device: args.device, data: args.data }, sketch.title);
          }
        });
        ipcRenderer.send('load', { path: sketch.path });
      } else {
        // Browser context: load sketch data from storage manager
        const storage = new BrowserStorageManager();
        try {
          // @ts-ignore
          const loaded = await storage.loadAllSketches();
          const match = loaded.find(s => s.title === sketch.title && s.device === sketch.device);
          if (!match) {
            reportError('Sketch not found.');
          } else {
            openEditor(
              {
                type: match.type === 'block' ? SketchType.BLOCK : SketchType.CODE,
                device: match.device,
                data: match.data
              },
              match.title
            );
          }
        } catch (e) {
          reportError('Failed to load sketch.');
        }
      }
    }
  }

  public openExample(sketch: Sketch) {
    const { reportError, openEditor } = this.props;

    ipcRenderer.once('load', (event: IpcRendererEvent, args) => {
      sketch.path = undefined;

      if (args.error) {
        reportError(args.error);
      } else {
        openEditor({ type: args.type, device: args.device, data: args.data });
      }
    });

    ipcRenderer.send('load', { path: sketch.path });
  }

  public render() {
    const { isEditorOpen, scrollStop } = this.props;
    const {
      newSketchOpen,
      animation,
      loggedIn,
      sketches,
      examples,
      projectsLoading,
      examplesLoading,
      restoreFirmwareModalOpen,
      spencerSettingsModalOpen
    } = this.state;

    return (
      <div
        className={isEditorOpen ? 'd-none' : 'h-open'}
        style={{
          height: '100%',
          backgroundSize: 'cover',
          backgroundImage: `url(${require('../../assets/images/bg/bg-02.png')})`,
          zIndex: 10,
          overflow: scrollStop || newSketchOpen ? 'hidden' : undefined
        }}
      >
        <NewSketch
          open={newSketchOpen}
          callback={(type: SketchType, device: string) =>
            this.openFile('NEWTYPE', device, undefined, type)
          }
          closeNewSketchModal={() => this.setState({ newSketchOpen: false })}
        />
        <HeaderImage className={loggedIn ? 'shrink' : ''} loggedIn={loggedIn} />
        <HeaderSection
          loggedIn={loggedIn}
          restoreCallback={() => this.setState({ restoreFirmwareModalOpen: true })}
          openSpencerModal={() => this.setState({ spencerSettingsModalOpen: true })}
        />
        <RestoreFirmware
          open={restoreFirmwareModalOpen}
          callback={(device) => this.restoreFirmware(device)}
          closeFirmwareModal={() => this.setState({ restoreFirmwareModalOpen: false })}
        />
        <SpencerSettings
          open={spencerSettingsModalOpen}
          closeCallback={() => {
            this.setState({ spencerSettingsModalOpen: false });
          }}
        />
        {loggedIn ? (
          <>
            <Main>
              <ProjectSection
                title="Your sketches"
                projects={sketches}
                onPress={(type, sketch) =>
                  this.openFile(type, sketch ? sketch.device : 'cm:esp32:ringo', sketch)
                }
                onDelete={this.handleDeleteSketch}
                createNew
              />

              <CircularProgress
                sx={{
                  display: projectsLoading || examplesLoading ? 'block' : 'none',
                  margin: '0 auto 20px auto'
                }}
              />

              {examples.map((category) => (
                <ProjectSection
                  title={category.title}
                  projects={category.sketches}
                  key={`Section-${category.title}`}
                  onPress={(type, sketch) => sketch && this.openExample(sketch)}
                />
              ))}
            </Main>
            <Footer>
              <p>
                <span>v{packageJson.version}</span>
                <span style={{ padding: '0 10px' }}> | </span>
                <a 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => {
                    if (typeof window !== 'undefined' && typeof (window as any).require === 'function') {
                      try {
                        const { shell } = (window as any).require('electron');
                        shell.openExternal('https://github.com/rx13/CircuitBlocks/');
                      } catch (e) {
                        window.open('https://github.com/rx13/CircuitBlocks/', '_blank');
                      }
                    } else {
                      window.open('https://github.com/rx13/CircuitBlocks/', '_blank');
                    }
                  }}
                >
                  Help
                </a>
              </p>
            </Footer>
          </>
        ) : (
          <Login className={animation ? 'log-in' : ''}>
            <img src={require('../../assets/SVG/login.svg')} height="80px" alt="Login" />
            <div className="form">
              <h2>Log In</h2>
              <p>Connect with your CircuitMess ID</p>
              <br />
              <div className="label">Email</div>
              <input type="text" className="error" />
              <div className="errortext">You must provide an Email!</div>

              <div className="label">Password</div>
              <input type="password" />
              <div className="errortext">&nbsp;</div>

              <div className="button mid blue">
                <div className="text">Log In</div>
              </div>
            </div>
            <div className="form clickable a-l">
              <h3 className="stack blue">Sign Up</h3>
              <p>Not a member? Not a problem!</p>
              <div className="icon right blue">
                <i className="material-icons"> open_in_new </i>
              </div>
            </div>
            <div className="button mid teal">
              <button onClick={() => this.foo()}>Skip Log In</button>
            </div>
          </Login>
        )}
      </div>
    );
  }
}
