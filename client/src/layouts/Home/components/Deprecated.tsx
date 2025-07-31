import React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Backdrop from '@mui/material/Backdrop';
import { IpcRenderer } from 'electron';
import { ModalBase } from '../../../components/Modal/Common';
import { SketchType } from '../../Editor';

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

export interface DeprecatedProps {
  open: boolean;
  closeModal: () => void;
}

export interface DeprecatedState {
  installed: boolean;
}

export class Deprecated extends React.Component<DeprecatedProps, DeprecatedState> {
  public constructor(props: DeprecatedProps) {
    super(props);

    this.state = {
      installed: false
    };
  }

  private async yes() {
    if (electron?.shell) {
      await electron.shell.openExternal('https://code.circuitmess.com/');
    } else {
      window.open('https://code.circuitmess.com/', '_blank');
    }
    if (ipcRenderer) {
      await ipcRenderer.send('kill', null);
    }
  }

  private no() {
    if (!this.state.installed) {
      if (ipcRenderer) {
        ipcRenderer.send('install', null);
      }
      this.setState({ installed: true });
    }
    this.props.closeModal();
  }

  public render() {
    const { open } = this.props;

    return (
      <Backdrop open={open} sx={{ zIndex: 1200 }}>
        <ModalBase className="small">
          <div style={{ display: 'inline-flex' }}>
            <div
              className="title"
              style={{
                position: 'relative',
                fontSize: 26,
                top: 0,
                textAlign: 'center',
                marginBottom: 30,
                lineHeight: 1.2
              }}
            >
              CircuitBlocks
            </div>
            <i
              className="close link icon"
              style={{ right: 10, top: 10, position: 'absolute' }}
              onClick={() => this.no()}
            />
          </div>

          <div
            className="content"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <p style={{ marginBottom: 42, fontSize: 18, lineHeight: 1.4 }}>
              This version of CircuitBlocks is no longer supported, check out the brand new
              web-based app.
            </p>
            <ButtonGroup
              variant="contained"
              size="small"
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 2,
                margin: '0 auto 10px',
                boxShadow: 'none'
              }}
            >
              <Button
                onClick={() => this.yes()}
                color="primary"
                sx={{ minWidth: 120, fontSize: 14, boxShadow: 'none' }}
              >
                Open web version
              </Button>
              <Button
                onClick={() => this.no()}
                color="secondary"
                variant="outlined"
                sx={{ minWidth: 120, fontSize: 14, boxShadow: 'none' }}
              >
                Continue offline
              </Button>
            </ButtonGroup>
          </div>
        </ModalBase>
      </Backdrop>
    );
  }
}
