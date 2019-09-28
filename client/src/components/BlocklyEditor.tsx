import React from 'react';

import Blockly from '../blockly/blockly';
import {Dimmer, Loader} from "semantic-ui-react";

interface BlocklyEditorProps {
  height?: number;
  width?: number;
  isCodeOpen: boolean;
  ws: any;
  setRef: (instance: HTMLDivElement | null) => void;
  running: boolean;
}

class BlocklyEditor extends React.Component<BlocklyEditorProps, {}> {
  componentDidUpdate() {
    const blockly: typeof Blockly = (window as any).Blockly;

    if (blockly) {
      blockly.svgResize(this.props.ws);
    }
  }

  render() {
    const { setRef, height, width, isCodeOpen, running } = this.props;

    let style: any = {
      height,
      width: isCodeOpen ? width && width / 2 : width,
      position: "relative"
    };

    if(running){
      style.pointerEvents = "none";
    }

    const overlayStyle: any = {
      background: "rgba(100, 100, 100, 0.2)",
      cursor: "wait"
    };

    return (
        <div style={style}>
          <Dimmer active={running} style={overlayStyle} inverted><Loader massive indeterminate>Running sketch...</Loader></Dimmer>
          <div
              id="blocklyDiv"
              style={{ width: "100%", height: "100%" }}
              ref={setRef}
          />
        </div>
    );
  }
}

export default BlocklyEditor;
