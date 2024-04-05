import React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Checkbox from '@mui/material/Checkbox';
import Backdrop from '@mui/material/Backdrop';
import { IpcRenderer, IpcRendererEvent } from 'electron';
import styled from 'styled-components';
import { ModalBase } from '../../../components/Modal/Common';
import eye from '../../../assets/eye.svg';
import eyegrey from '../../../assets/eyegrey.svg';
import reload from '../../../assets/reload.svg';
import reloadgrey from '../../../assets/reloadgrey.svg';
import { SpencerPrivacy } from './SpencerPrivacy';

let electron: typeof import('electron') | undefined;
let ipcRenderer: typeof import('electron').ipcRenderer | undefined;

if (typeof window !== 'undefined' && typeof (window as any).require === 'function') {
  try {
    electron = (window as any).require('electron') as typeof import('electron');
    ipcRenderer = electron.ipcRenderer;
  } catch (e) {
    electron = undefined;
    ipcRenderer = undefined;
  }
}

const SpinButton = styled.img`
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  &.spin {
    animation: spin 3s linear infinite;
  }
`;

export interface SpencerSettingsProps {
  open: boolean;
  closeCallback: () => void;
}

interface SpencerSettingsState {
  saving: boolean;
  fahrenheit: boolean;
  ssid: string;
  password: string;
  showWifiPass: boolean;
  wifiList: string[];
  connected: boolean;
  scanning: boolean;
  privacyOpen: boolean;
  privacyAccepted: boolean;
}

export class SpencerSettings extends React.Component<SpencerSettingsProps, SpencerSettingsState> {
  private getInterval: number | undefined;

  public constructor(props: SpencerSettingsProps) {
    super(props);

    this.state = {
      saving: false,
      ssid: '',
      password: '',
      fahrenheit: false,
      showWifiPass: false,
      wifiList: [],
      connected: false,
      scanning: false,
      privacyOpen: false,
      privacyAccepted: false
    };

    if (ipcRenderer) {
      ipcRenderer.on('SpencerScan', (event: IpcRendererEvent, args) => {
        if (args.error && args.error === 'nocon') {
          this.clear();
          this.startCheck();
          return;
        }

        this.setState({ wifiList: args.networks || [], connected: true, scanning: false });
      });

      ipcRenderer.on('SpencerGet', (event: IpcRendererEvent, args) => {
        if (args.error && args.error === 'nocon') {
          this.clear();
          this.startCheck();
          return;
        }

        if (this.getInterval !== undefined) {
          clearInterval(this.getInterval);
          this.getInterval = undefined;
        }

        const { ssid, password, fahrenheit } = args.settings;
        this.setState({ ssid, password, fahrenheit: fahrenheit == 1, connected: true });
      });

      ipcRenderer.on('SpencerSet', (event: IpcRendererEvent, args) => {
        if (args.error && args.error === 'nocon') {
          this.clear();
          this.startCheck();
          return;
        }

        this.clear();
        this.props.closeCallback();
      });
    }
  }

  private startCheck() {
    if (this.getInterval !== undefined) return;

    this.getInterval = setInterval(() => {
      if (this.state.connected) return;

      if (ipcRenderer) {
        ipcRenderer.send('SpencerGet');
      }
    }, 2000) as unknown as number;
  }

  private clear() {
    this.setState({
      connected: false,
      wifiList: [],
      fahrenheit: false,
      ssid: '',
      password: '',
      scanning: false,
      showWifiPass: false,
      saving: false
    });
  }

  componentDidUpdate(
    prevProps: Readonly<SpencerSettingsProps>,
    prevState: Readonly<SpencerSettingsState>,
    snapshot?: any
  ) {
    if (this.props.open && !prevProps.open) {
      this.clear();
      if (ipcRenderer) {
        ipcRenderer.send('SpencerGet');
      }
    }
  }

  public saveSettings() {
    if (this.state.saving || !this.state.connected) return;

    this.setState({ saving: true });

    const { ssid, password, fahrenheit } = this.state;

    if (ipcRenderer) {
      ipcRenderer.send('SpencerSet', {
        settings: {
          ssid,
          password,
          fahrenheit: fahrenheit ? 1 : 0
        }
      });
    }
  }

  private scanNetworks() {
    if (!this.state.connected || this.state.scanning) return;
    this.setState({ scanning: true });
    if (ipcRenderer) {
      ipcRenderer.send('SpencerScan');
    }
  }

  public render() {
    const { open, closeCallback } = this.props;
    const { fahrenheit, connected, scanning, saving, privacyOpen, privacyAccepted } = this.state;

    let { ssid } = this.state;
    if (ssid == 'SpencerFoo') {
      ssid = '';
    }

    const { wifiList } = this.state;
    if (ssid && ssid !== '' && ssid !== 'SpencerFoo' && wifiList.indexOf(ssid) === -1) {
      wifiList.unshift(ssid);
    }

    let { password } = this.state;
    if (password == 'SpencerFoo') {
      password = '';
    }

    return (
      <div>
        <Backdrop open={open} sx={{ zIndex: 1200 }}>
          <ModalBase className="medium">
            <div
              className="title"
              style={{
                position: 'relative',
                fontSize: 26,
                top: 0,
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 1.2
              }}
            >
              Spencer settings
            </div>

            {!connected && (
              <p style={{ marginBottom: 20, fontSize: 18, lineHeight: 1.2 }}>
                Connect Spencer to your PC and tell him to <i>enter configuration mode</i>.
              </p>
            )}

            <p style={{ marginBottom: 15, fontSize: 18, fontWeight: 'bold', marginTop: 15 }}>
              Temperature:
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                marginBottom: 20
              }}
            >
              <Button
                variant={fahrenheit ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => this.setState({ fahrenheit: false })}
                style={{ margin: '0 15px' }}
                disabled={!connected}
              >
                Celsius
              </Button>
              <Button
                variant={!fahrenheit ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => this.setState({ fahrenheit: true })}
                style={{ margin: '0 15px' }}
                disabled={!connected}
              >
                Fahrenheit
              </Button>
            </div>

            <div
              style={{
                marginTop: 25,
                marginBottom: 25,
                maxWidth: 350,
                marginLeft: 'auto',
                marginRight: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
                <input
                  placeholder="SSID"
                  type="text"
                  disabled={!connected}
                  value={ssid}
                  onChange={(e) => {
                    this.setState({ ssid: e.target.value });
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
                <input
                  style={{ width: 275, marginRight: 30 }}
                  placeholder="Password"
                  type={this.state.showWifiPass ? 'text' : 'password'}
                  id="wifi-password"
                  disabled={!connected}
                  value={password}
                  onChange={(e) => {
                    this.setState({ password: e.target.value });
                  }}
                />

                <a
                  onClick={() => this.setState({ showWifiPass: !this.state.showWifiPass })}
                  style={{
                    width: '30px',
                    height: '30px',
                    float: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <img src={this.state.showWifiPass ? eye : eyegrey} />
                </a>
              </div>
            </div>

            <p style={{ fontSize: 14, lineHeight: '20px', cursor: 'pointer' }}>
              <Checkbox
                checked={privacyAccepted}
                onChange={(_, checked) => {
                  this.setState({ privacyAccepted: !!checked });
                }}
                style={{ marginRight: 10, position: 'relative', top: 3 }}
              />
              <span onClick={() => this.setState({ privacyAccepted: !privacyAccepted })}>
                I have read and I accept Spencer's
              </span>
              <a onClick={() => this.setState({ privacyOpen: true })}>privacy policy</a>
            </p>

            <ButtonGroup
              variant="contained"
              size="small"
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 2,
                margin: '25px auto 0',
                boxShadow: 'none'
              }}
            >
              <Button
                onClick={() => this.saveSettings()}
                color="primary"
                disabled={!connected || saving || !privacyAccepted}
                sx={{ minWidth: 120, fontSize: 14, boxShadow: 'none' }}
              >
                Save and close
              </Button>
              <Button
                onClick={() => {
                  this.clear();
                  closeCallback();
                }}
                color="secondary"
                variant="outlined"
                sx={{ minWidth: 120, fontSize: 14, boxShadow: 'none' }}
              >
                Cancel changes
              </Button>
            </ButtonGroup>
          </ModalBase>
        </Backdrop>
        <SpencerPrivacy
          open={privacyOpen}
          closeCallback={() => this.setState({ privacyOpen: false })}
        />
      </div>
    );
  }
}
