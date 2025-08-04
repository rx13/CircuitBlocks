import React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
import { IpcRenderer } from 'electron';
import { ModalBase } from './Modal/Common';

let ipcRenderer: typeof import('electron').ipcRenderer | undefined;
if (typeof window !== 'undefined') {
  import('electron')
    .then(electron => {
      ipcRenderer = electron.ipcRenderer;
    })
    .catch(() => {
      ipcRenderer = undefined;
    });
}

interface ErrorReportProps {
  setIsOpen: (isOpen: boolean) => void;
}

interface ErrorReportState {
  collecting: boolean;
  sending: boolean;
  id: number | undefined;
  content: string | undefined;
  shown: boolean;
  path: string | undefined;
  jsonContent: string | undefined;
}

export class InstallInfo extends React.Component<ErrorReportProps, ErrorReportState> {
  public constructor(props: ErrorReportProps) {
    super(props);

    this.state = {
      collecting: false,
      sending: false,
      id: undefined,
      content: undefined,
      shown: false,
      path: undefined,
      jsonContent: undefined
    };

    if (ipcRenderer) {
      ipcRenderer.on('report', (event, args) => {
        const { collecting, sending, content, id, path, jsonContent } = args;
        this.setState({ collecting, sending, content, id, path, jsonContent, shown: true });
        this.props.setIsOpen(true);
      });
    }
  }


  private save() {
    if (ipcRenderer) {
      ipcRenderer.send('reportdone'); // Triggers save in main process
    }
  }

  private close() {
    this.setState({
      content: undefined,
      collecting: false,
      sending: false,
      id: undefined,
      path: undefined,
      shown: false
    });
    this.props.setIsOpen(false);
  }

  private done() {
    if (ipcRenderer) {
      ipcRenderer.send('reportdone');
    }
    this.close();
  }

  public render() {
    const { sending, collecting, id, path, content, shown, jsonContent } = this.state;

    if (!shown) return null;

    const loading = sending || collecting;
    const status = sending ? 'Sending report...' : 'Collecting report...';

    return (
      <div>
        <Backdrop open sx={{ zIndex: 1200 }} />
        <ModalBase className="medium">
          <div
            className="title"
            style={{
              position: 'relative',
              fontSize: 24,
              top: 0,
              textAlign: 'center',
              marginBottom: 10,
              lineHeight: 1.2
            }}
          >
            Error report
          </div>
          <div className="content">
            {loading && (
              <CircularProgress size={64} sx={{ display: 'block', margin: '20px auto' }} />
            )}
            {loading ? (
              <div style={{ paddingTop: 0, textAlign: 'center' }}>{status}</div>
            ) : (
              <div>
                {id == undefined ? (
                  <div>
                    <div>
                      <p>
                        The following data will be saved to a file on your computer. If you need support, please open an issue at <b><a href="https://github.com/rx13/CircuitBlocks/issues" target="_blank" rel="noopener noreferrer">https://github.com/rx13/CircuitBlocks</a></b> and attach this file.
                      </p>
                      <ul style={{ textAlign: 'left', margin: '10px 0 10px 20px', fontSize: 14 }}>
                        <li>Before opening a new issue, please search for existing issues describing your problem. If you find one, comment there and attach your report file.</li>
                        <li>If no existing issue matches, open a new issue and attach your report file.</li>
                        <li>In your issue, describe what you were doing when the error occurred, and any steps to reproduce the problem.</li>
                        <li>Do <b>not</b> include any sensitive or private information in your report or issue.</li>
                      </ul>
                      <div
                        style={{
                          maxHeight: 200,
                          overflowY: 'auto',
                          whiteSpace: 'pre',
                          padding: '5px 10px',
                          boxShadow: '0 0 3px rgba(0, 0, 0, 0.5) inset'
                        }}
                      >
                        {content != undefined ? content : ''}
                      </div>
                    </div>
                    <div>
                      <ButtonGroup
                        variant="contained"
                        size="small"
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: 2,
                          margin: '20px auto 0',
                          boxShadow: 'none'
                        }}
                      >
                        <Button
                          onClick={() => this.close()}
                          color="secondary"
                          variant="outlined"
                          sx={{ minWidth: 80, fontSize: 14, boxShadow: 'none' }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => this.save()}
                          color="primary"
                          sx={{ minWidth: 80, fontSize: 14, boxShadow: 'none' }}
                        >
                          Save report file
                        </Button>
                      </ButtonGroup>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div>
                      <p>
                        <b>There was an error saving the report file.</b>
                      </p>
                      <p>
                        Please open an issue at <b><a href="https://github.com/rx13/CircuitBlocks/issues" target="_blank" rel="noopener noreferrer">https://github.com/rx13/CircuitBlocks</a></b> and describe your problem.
                      </p>
                      <ul style={{ textAlign: 'left', margin: '10px 0 10px 20px', fontSize: 14 }}>
                        <li>Before opening a new issue, search for existing issues describing your problem. If you find one, comment there with your details.</li>
                        <li>If no existing issue matches, open a new issue and describe your problem.</li>
                        <li>Include what you were doing when the error occurred, your operating system, and a step-by-step way to reproduce the error (especially if it happens more than once).</li>
                        <li>Mention that the error report file could not be saved.</li>
                        <li>Do <b>not</b> include any sensitive or private information in your issue.</li>
                      </ul>
                    </div>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => this.done()}
                      sx={{
                        display: 'block',
                        margin: '20px auto 0',
                        minWidth: 80,
                        fontSize: 14,
                        boxShadow: 'none'
                      }}
                    >
                      Ok
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBase>
      </div>
    );
  }
}

export default InstallInfo;
