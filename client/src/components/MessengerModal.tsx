import React, { ReactElement } from 'react';
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

enum MessageType {
  ERROR,
  INSTALL,
  UPDATE,
  RESTORE,
  RUN,
  EXPORT,
  DAEMON
}

interface MessengerData {
  type: MessageType;
  text: string[];
  callback?: MessengerCallback[];
  loader?: boolean;
}

interface MessengerCallback {
  title: string;
  action?: string;
  secondary?: boolean;
}

interface MessengerModalProps {}

interface MessengerModalState {
  data: MessengerData | undefined;
}

export class MessengerModal extends React.Component<MessengerModalProps, MessengerModalState> {
  private readonly titles = [
    'Error',
    'Installing...',
    'Updating...',
    'Restoring firmware',
    'Running',
    'Export',
    'Daemon'
  ];

  public constructor(props: MessengerModalProps) {
    super(props);

    this.state = {
      data: undefined
    };

    if (ipcRenderer) {
      ipcRenderer.on('messenger', (event, args) => {
        this.setState({ data: args.data });
      });
    }
  }

  private pingBack(callback?: string) {
    if (callback && ipcRenderer) {
      ipcRenderer.send(callback);
    }
    this.setState({ data: undefined });
  }

  private openExternal(href: string) {
    if (ipcRenderer) {
      ipcRenderer.send('openlink', { href });
    } else {
      window.open(href, '_blank');
    }
  }

  public render() {
    const { data } = this.state;
    if (!data) return null;

    const { type, text, callback, loader } = data;

    const title = this.titles[type];

    const textDom: ReactElement[] = [];
    text.forEach((t) => {
      let dom: ReactElement;

      let start;
      if ((start = t.indexOf('[[')) != -1) {
        const end = t.indexOf(']]', start + 2);
        const href = t.substring(start + 2, end);

        let domain = href.indexOf('/', 10);
        domain = href.indexOf('/', domain);

        const file = href.lastIndexOf('/');

        let text;
        if (file - domain > 30) {
          text = href.substring(0, domain + 1) + '...' + href.substring(file);
        } else {
          text = href;
        }

        const link = (
          <a
            onClick={() => {
              this.openExternal(href);
            }}
            style={{ cursor: 'pointer' }}
          >
            {text}
          </a>
        );

        dom = (
          <div style={{ paddingTop: 0, paddingBottom: 5, textAlign: 'center' }}>
            {t.substring(0, start)}
            {link}
            {t.substring(end + 2)}
          </div>
        );
      } else {
        dom = <div style={{ paddingTop: 0, paddingBottom: 5, textAlign: 'center' }}>{t}</div>;
      }

      textDom.push(dom);
    });

    let callbackDom: ReactElement | null = null;
    if (callback && callback.length > 0) {
      callbackDom = (
        <ButtonGroup
          variant="contained"
          color="primary"
          size="small"
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            margin: '20px auto 0',
            boxShadow: 'none'
          }}
        >
          {callback.map((t, idx) => (
            <Button
              key={t.title + idx}
              onClick={() => this.pingBack(t.action)}
              color={t.secondary ? 'secondary' : 'primary'}
              sx={{ minWidth: 80, fontSize: 14, boxShadow: 'none' }}
            >
              {t.title}
            </Button>
          ))}
        </ButtonGroup>
      );
    }

    return (
      <div>
        <Backdrop open sx={{ zIndex: 1200 }} />
        <ModalBase className="small">
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
            {title}
          </div>
          <div className="content">
            {loader && (
              <CircularProgress size={64} sx={{ display: 'block', margin: '20px auto' }} />
            )}
            {textDom}
            {callbackDom}
          </div>
        </ModalBase>
      </div>
    );
  }
}

export default MessengerModal;
