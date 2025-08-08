import React from 'react';
import Button from '@mui/material/Button';
import Backdrop from '@mui/material/Backdrop';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import styled from 'styled-components';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { Sprite } from './SpriteEditor/Sprite';
import { ModalBase } from '../../../components/Modal/Common';
import SpriteDrawer from './SpriteEditor/SpriteDrawer';

interface GameExportProps {
  close: () => void;
  save: (name: string, sprite?: Sprite) => void;
  sprites: Sprite[];
}

interface GameExportState {
  name: string;
  icon: number;
  sprite?: Sprite;
}

export default class GameExport extends React.Component<GameExportProps, GameExportState> {
  public static readonly DefaultIconNames = [
    'adventure',
    'alien',
    'castle',
    'dino',
    'football',
    'motors',
    'robot',
    'space'
  ];

  constructor(props: GameExportProps) {
    super(props);
    this.state = {
      name: 'Game',
      icon: -1
    };

    library.add(fas);
  }

  private setName(name: string) {
    if (!name.match(/^[a-zA-Z0-9 _-]+$/)) return;
    this.setState({ name });
  }

  private setSprite(icon: number) {
    if (isNaN(icon)) return;
    let sprite: Sprite | undefined;

    if (icon >= 0 && icon < this.props.sprites.length && this.props.sprites[icon] != undefined) {
      sprite = this.props.sprites[icon].getCropped(64, 64);
      this.setState({ icon, sprite });
    } else if (icon >= 0 && icon >= this.props.sprites.length) {
      icon -= this.props.sprites.length;
      sprite = new Sprite(GameExport.DefaultIconNames[icon]);

      import(`../../../assets/gameIcons/${GameExport.DefaultIconNames[icon]}.png`).then((mod) => {
        sprite.fromFile(mod.default).then(() => this.setState({ icon, sprite }));
      });
    } else {
      this.setState({ icon, sprite });
    }
  }

  public render() {
    const { close, sprites, save } = this.props;
    const { name, icon, sprite } = this.state;

    const icons = [
      { text: 'No icon', value: -1 },
      ...sprites.map((sprite, i) => ({ text: sprite.name, value: i })),
      ...GameExport.DefaultIconNames.map((icon, i) => ({ text: icon, value: sprites.length + i }))
    ];

    return (
      <div>
        <Backdrop open sx={{ zIndex: 1200 }}>
          <ModalBase className="small" style={{ maxWidth: 300, overflowY: 'visible' }}>
            <Elements>
              <div>
                Name{' '}
                <TextField
                  value={name}
                  onChange={(e) => this.setName(e.target.value)}
                  size="small"
                  variant="outlined"
                  fullWidth
                />
              </div>
              <div>
                Icon{' '}
                <Select
                  value={icon}
                  onChange={(e) => this.setSprite(Number(e.target.value))}
                  size="small"
                  variant="outlined"
                  fullWidth
                >
                  {icons.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.text}
                    </MenuItem>
                  ))}
                </Select>
              </div>
              {sprite && (
                <div>
                  <SpriteDrawer sprite={sprite} width={252} />
                </div>
              )}
            </Elements>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button onClick={close}>Cancel</Button>
              <Button variant="contained" color="primary" onClick={() => save(name, sprite)}>
                Export
              </Button>
            </div>
          </ModalBase>
        </Backdrop>
      </div>
    );
  }
}

const Elements = styled.div`
  > div {
    margin-bottom: 10px;
  }
  canvas {
    border: 1px solid #000;
  }
  div.input,
  div.dropdown {
    margin-left: 16px;
  }
`;
