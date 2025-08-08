import React from 'react';
import Button from '@mui/material/Button';
import Backdrop from '@mui/material/Backdrop';
import { ModalBase } from '../../../components/Modal/Common';
import { SketchType } from '../../Editor';

export interface NewSketchProps {
  open: boolean;
  callback: (type: SketchType, device: string) => void;
  closeNewSketchModal: () => void;
}

interface NewSketchState {
  device: string;
  type: SketchType;
}

export class NewSketch extends React.Component<NewSketchProps, NewSketchState> {
  public constructor(props: NewSketchProps) {
    super(props);

    this.state = {
      device: 'cm:esp8266:nibble',
      type: SketchType.BLOCK
    };
  }

  private create() {
    const { callback } = this.props;
    const { type } = this.state;
    callback(type, this.state.device);
  }

  public render() {
    const { open, callback } = this.props;
    const { type, device } = this.state;

    return (
      <Backdrop open={open} sx={{ zIndex: 1200 }} onClick={this.props.closeNewSketchModal}>
        <div onClick={e => e.stopPropagation()}>
          <ModalBase className="medium" style={{ width: '30%', minWidth: '400px' }}>
            <div>
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
                New sketch
              </div>
              <i
                className="close link icon"
                style={{ right: 10, top: 10, position: 'absolute' }}
                onClick={() => this.props.closeNewSketchModal()}
              />
            </div>
            <div
              className="content"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <p style={{ marginBottom: 15, fontSize: 18, fontWeight: 'bold' }}>Device:</p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginBottom: 20,
                  flexWrap: 'wrap'
                }}
              >
                <Button
                  variant={this.state.device === 'cm:esp32:ringo' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp32:ringo' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  Ringo
                </Button>
                <Button
                  variant={this.state.device === 'cm:esp8266:nibble' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp8266:nibble' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  Nibble
                </Button>
                <Button
                  variant={this.state.device === 'cm:esp32:spencer' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp32:spencer' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  Spencer
                </Button>
                <Button
                  variant={this.state.device === 'cm:esp32:jayd' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp32:jayd' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  Jay-D
                </Button>
                <Button
                  variant={this.state.device === 'cm:esp32:wheelson' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp32:wheelson' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  Wheelson
                </Button>
                <Button
                  variant={this.state.device === 'cm:esp32:byteboi' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp32:byteboi' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  ByteBoi
                </Button>
                <Button
                  variant={this.state.device === 'cm:esp32:chatter' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp32:chatter' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  Chatter
                </Button>
                <Button
                  variant={this.state.device === 'cm:esp32:synthia' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp32:synthia' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  Synthia
                </Button>
                <Button
                  variant={this.state.device === 'cm:esp32:circuitpet' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ device: 'cm:esp32:circuitpet' })}
                  style={{ margin: '0 15px', height: 40, whiteSpace: 'nowrap', marginBottom: 10 }}
                >
                  CircuitPet
                </Button>
              </div>
              <p style={{ marginBottom: 15, fontSize: 18, fontWeight: 'bold' }}>Sketch type:</p>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                <Button
                  variant={type === SketchType.CODE ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ type: SketchType.CODE })}
                  style={{ margin: '0 15px' }}
                >
                  Code
                </Button>
                <Button
                  variant={type === SketchType.BLOCK ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => this.setState({ type: SketchType.BLOCK })}
                  style={{ margin: '0 15px' }}
                >
                  Block
                </Button>
              </div>

              <Button
                variant="contained"
                sx={{ backgroundColor: '#E3384D', width: '50%', margin: '0 auto', marginTop: 3 }}
                size="large"
                onClick={() => this.create()}
              >
                Create
              </Button>
            </div>
          </ModalBase>
        </div>
      </Backdrop>
    );
  }
}
