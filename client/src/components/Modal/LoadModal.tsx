import React from 'react';
import styled from 'styled-components';

import Modal, { Props } from './Modal';

const ScrollArea = styled.div``;

type LoadModalProps = Props

const LoadModal: React.FC<LoadModalProps> = (props) => (
  <Modal {...props}>
    <h4> Previous sketches </h4>
    <ScrollArea>
      <div className="button long blue"> Untitled Sketch 1 </div>
      <div className="button long white"> Untitled Sketch 1 </div>
      <div className="button long white"> Untitled Sketch 1 </div>
      <div className="button long white"> Untitled Sketch 1 </div>
    </ScrollArea>
    <input type="text" placeholder="Untitled Project" />
  </Modal>
);

export default LoadModal;
