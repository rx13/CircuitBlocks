import React, { useEffect, useState } from 'react';

import Alert from './components/Modal/Modal';
import Home from './layouts/Home';
import Editor, { SketchLoadInfo } from './layouts/Editor';

import './tmp.css';
import './assets/material_icons.css';
import './assets/poppins.css';
import './assets/source_code_pro.css';
import InstallInfo from './components/InstallInfo';
import ErrorReport from './components/ErrorReport';
import Error from './layouts/Home/components/Error';

import { IpcRenderer } from 'electron';
import MessengerModal from './components/MessengerModal';

let ipcRenderer: typeof import('electron').ipcRenderer | undefined;
if (typeof window !== 'undefined' && typeof (window as any).require === 'function') {
  try {
    const electron = (window as any).require('electron') as typeof import('electron');
    ipcRenderer = electron.ipcRenderer;
  } catch (e) {
    ipcRenderer = undefined;
  }
}

function App() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [errorFatal, setErrorFatal] = useState<boolean>(false);
  const [filename, setFilename] = useState('');
  const [device, setDevice] = useState('cm:esp32:ringo');
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isErrorReportOpen, setIsErrorReportOpen] = useState(false);

  const monacoRef = React.createRef();
  const blocklyRef = React.createRef<Editor>();

  const openHome = () => {
    (blocklyRef.current as any).cleanup();
    setIsEditorOpen(false);
  };

  const openEditor = (data: SketchLoadInfo, filename?: string) => {
    (blocklyRef.current as any).load(data);
    setFilename(filename || '');
    setDevice(data.device);
    setIsEditorOpen(true);
  };

  const closeAlert = () => {
    console.log('No :(');
    setIsAlertOpen(false);
  };

  const okAlert = () => {
    console.log('Ok');
    setIsAlertOpen(false);
  };

  const reportError = (message: string, fatal?: boolean) => {
    setError(message);
    if (fatal) {
      setErrorFatal(true);
    }
  };

  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('daemonfatal', (event, args) => {
        setErrorFatal(true);
        setError(args.error);
      });
      // ipcRenderer.send("daemoncheck");
    }
  }, []);

  return (
    <>
      {isAlertOpen && (
        <Alert
          title="Foobar"
          close={closeAlert}
          footer={{
            left: [{ text: 'No', onClick: closeAlert }],
            right: [{ text: 'Ok', onClick: okAlert }]
          }}
        >
          Something......
        </Alert>
      )}
      {error && (
        <Error message={error} dismiss={errorFatal ? undefined : () => setError(undefined)} />
      )}
      <MessengerModal />
      <InstallInfo
        setIsInstalling={(installing) => setIsInstalling(installing)}
        reportError={(message, fatal) => reportError(message, fatal)}
      />
      <ErrorReport setIsOpen={(open) => setIsErrorReportOpen(open)} />
      <Home
        reportError={(message, fatal) => reportError(message, fatal)}
        scrollStop={error != undefined || isInstalling || isErrorReportOpen}
        isEditorOpen={isEditorOpen}
        openEditor={openEditor}
      />
      <Editor
        reportError={(message, fatal) => reportError(message, fatal)}
        isEditorOpen={isEditorOpen}
        title={filename}
        device={device}
        setFilename={setFilename}
        openHome={openHome}
        monacoRef={monacoRef}
        ref={blocklyRef}
      />
    </>
  );
}

export default App;
