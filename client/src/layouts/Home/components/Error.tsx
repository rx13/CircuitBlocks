import React from 'react';
import Button from '@mui/material/Button';
import Backdrop from '@mui/material/Backdrop';
import { IpcRenderer } from 'electron';
import { ModalBase } from '../../../components/Modal/Common';

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

interface ErrorProps {
  message: string;
  dismiss?: () => void;
}

export default class Error extends React.Component<ErrorProps, {}> {
  public constructor(props: ErrorProps) {
    super(props);
  }

  private report() {
    if (ipcRenderer) {
      ipcRenderer.send('report', { fatal: true });
    }
  }

  public render() {
    const { message, dismiss } = this.props;

    return (
      <Backdrop open sx={{ zIndex: 1200 }} onClick={dismiss}>
        <div onClick={e => e.stopPropagation()}>
          <ModalBase className="small">
            <div className="title">Error</div>
            <div className="content">
              <p>{message}</p>
            </div>
            <div className="buttons">
              {dismiss ? (
                <Button variant="contained" color="primary" onClick={dismiss}>
                  Ok
                </Button>
              ) : (
                <Button variant="contained" color="primary" onClick={() => this.report()}>
                  Send error report
                </Button>
              )}
            </div>
          </ModalBase>
        </div>
      </Backdrop>
    );
  }
}
