import React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
import { IpcRenderer } from 'electron';
import { ModalBase } from './Modal/Common';

let ipcRenderer: typeof import('electron').ipcRenderer | undefined;
if (typeof window !== 'undefined' && window.require) {
  try {
    const electron = window.require('electron') as typeof import('electron');
    ipcRenderer = electron.ipcRenderer;
  } catch (e) {
    ipcRenderer = undefined;
  }
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

  private send() {
    if (ipcRenderer) {
      ipcRenderer.send('reportsend');
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
                        The following data will be sent and stored on our servers. You can contact
                        us at contact@circuitmess.com if you wish we remove your data from our
                        server.
                      </p>
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
                          onClick={() => this.send()}
                          color="primary"
                          sx={{ minWidth: 80, fontSize: 14, boxShadow: 'none' }}
                        >
                          Send report
                        </Button>
                      </ButtonGroup>
                    </div>
                  </div>
                ) : (
                  <div>
                    {id == -1 ? (
                      <div>
                        <p>
                          There has been an error sending the report, but it has been saved at{' '}
                          <b>{path}</b>. You can contact us with your problem at{' '}
                          <b>contact@circuitmess.com</b>. Don't forget to attach the generated
                          report!
                        </p>
                        {jsonContent && (
                          <div>
                            <p>
                              If you're having trouble finding the file, you can also copy the
                              report into a text file manually:
                            </p>
                            <div
                              style={{
                                maxHeight: 200,
                                overflowY: 'auto',
                                whiteSpace: 'pre',
                                padding: '5px 10px',
                                boxShadow: '0 0 3px rgba(0, 0, 0, 0.5) inset'
                              }}
                            >
                              {JSON.stringify(jsonContent)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p>The report has been sent. Your report ID is</p>
                        <p
                          style={{
                            padding: '10px 0',
                            textAlign: 'center',
                            fontSize: '2em',
                            fontWeight: 'bold'
                          }}
                        >
                          {id}
                        </p>
                        <p>
                          You can contact us with your problem at <b>contact@circuitmess.com</b>.
                          Don't forget to attach your report ID!
                        </p>
                      </div>
                    )}
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
