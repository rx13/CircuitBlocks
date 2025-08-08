import React from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Backdrop from '@mui/material/Backdrop';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { ModalBase } from '../../../components/Modal/Common';
import { SketchType } from '../../Editor';

export interface RestoreFirmwareProps {
  open: boolean;
  callback: (device: string) => void;
  closeFirmwareModal: () => void;
}

interface RestoreFirmwareState { }

export class RestoreFirmware extends React.Component<RestoreFirmwareProps, RestoreFirmwareState> {
  public constructor(props: RestoreFirmwareProps) {
    super(props);

    this.state = {
      nibble: false,
      type: SketchType.BLOCK
    };
  }

  public render() {
    const { open, callback } = this.props;

    return (
      <Backdrop
        open={open}
        sx={{ zIndex: 1200 }}
        onClick={this.props.closeFirmwareModal}
      >
        <div onClick={e => e.stopPropagation()}>
          <ModalBase className="medium">
            <div style={{ display: 'inline-flex', width: '100%' }}>
              <div
                className="title"
                style={{
                  position: 'relative',
                  fontSize: 26,
                  top: 0,
                  textAlign: 'center',
                  marginBottom: 30,
                  lineHeight: 1.2,
                  flex: 1
                }}
              >
                Restore firmware
              </div>
              <IconButton
                aria-label="close"
                onClick={this.props.closeFirmwareModal}
                sx={{ position: 'absolute', right: 10, top: 10 }}
                size="large"
              >
                <CloseIcon />
              </IconButton>
            </div>
            <div
              className="content"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <p style={{ marginBottom: 15, fontSize: 18, fontWeight: 'bold' }}>Device:</p>
              <ButtonGroup
                variant="contained"
                size="small"
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 2,
                  margin: '0 auto 20px',
                  boxShadow: 'none'
                }}
              >
                {[
                  { label: 'Ringo', value: 'cm:esp32:ringo' },
                  { label: 'Nibble', value: 'cm:esp8266:nibble' },
                  { label: 'Spencer', value: 'cm:esp32:spencer' },
                  { label: 'Jay-D', value: 'cm:esp32:jayd' },
                  { label: 'Wheelson', value: 'cm:esp32:wheelson' },
                  { label: 'ByteBoi', value: 'cm:esp32:byteboi' },
                  { label: 'Chatter', value: 'cm:esp32:chatter' },
                  { label: 'Synthia', value: 'cm:esp32:synthia' },
                  { label: 'CircuitPet', value: 'cm:esp32:circuitpet' }
                ].map((device) => (
                  <Button
                    key={device.value}
                    onClick={() => callback(device.value)}
                    color="primary"
                    sx={{ minWidth: 100, fontSize: 14, boxShadow: 'none', marginBottom: 10 }}
                  >
                    {device.label}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
          </ModalBase>
        </div>
      </Backdrop>
    );
  }
}
