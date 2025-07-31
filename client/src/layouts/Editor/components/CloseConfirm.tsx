import React from 'react';
import Button from '@mui/material/Button';
import Backdrop from '@mui/material/Backdrop';
import { ModalBase } from '../../../components/Modal/Common';

interface SaveModalProps {
  open: boolean;
  closeModalCallback: (option: string) => void;
}

interface SaveModalState {}

export class CloseConfirm extends React.Component<SaveModalProps, SaveModalState> {
  public render() {
    const { open } = this.props;

    return (
      <div>
        <Backdrop open={open} sx={{ zIndex: 1200 }}>
          <ModalBase className="small">
            <h2>Discard unsaved changes?</h2>
            <Button
              variant="contained"
              color="primary"
              onClick={() => this.props.closeModalCallback('saveAndExit')}
            >
              Save and close
            </Button>
            <Button variant="outlined" onClick={() => this.props.closeModalCallback('exit')}>
              Close without saving
            </Button>
            <Button variant="outlined" onClick={() => this.props.closeModalCallback('cancel')}>
              Don't close
            </Button>
          </ModalBase>
        </Backdrop>
      </div>
    );
  }
}
