import React from 'react';

import { Card, CardContainer } from '../Card';
import Section from './Section';
import { Devices, Sketch } from '../../layouts/Home';

interface ProjectSectionProps {
  title: string;
  projects: { block: Sketch[]; code: Sketch[] };
  onPress: (type: 'NEW' | 'OPEN', sketch?: Sketch) => void;
  onDelete?: (sketch: Sketch) => void;
  createNew?: boolean;
}

const ProjectSection: React.FC<ProjectSectionProps> = (props: ProjectSectionProps) => {
  const { title, projects, onPress, onDelete, createNew } = props;

  return (
    <Section>
      <h2>{title}</h2>
      <CardContainer>
        {createNew && (
          <Card onClick={() => onPress('NEW')} className="new">
            <div>
              <i className="material-icons"> add </i>
              <h3>New sketch</h3>
            </div>
          </Card>
        )}

        {projects.block.map((sketch: Sketch, index) => (
          <Card
            key={`section-${title}-block-${index}`}
            className={
              'descriptive ' +
              (Devices.hasOwnProperty(sketch.device)
                ? Devices[sketch.device].name.toLowerCase()
                : undefined)
            }
            onClick={() => onPress('OPEN', sketch)}
          >
            <div className="image">
              <svg dangerouslySetInnerHTML={{ __html: sketch.snapshot || '' }} />
            </div>
            <div className="cover">
              <div className="title">{sketch.title}</div>
              <div className="description">
                <p className="device">{Devices[sketch.device].name}</p>
                {sketch.description && <p>{sketch.description}</p>}
              </div>
              {onDelete && (
                <button
                  className="delete-btn"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#c00',
                    fontSize: 20
                  }}
                  title="Delete sketch"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(sketch);
                  }}
                >
                  <i className="material-icons">delete</i>
                </button>
              )}
            </div>
          </Card>
        ))}

        {projects.code.map((sketch: Sketch, index) => (
          <Card
            key={`section-${title}-code-${index}`}
            className={
              'descriptive ' +
              (Devices.hasOwnProperty(sketch.device)
                ? Devices[sketch.device].name.toLowerCase()
                : undefined)
            }
            onClick={() => onPress('OPEN', sketch)}
          >
            <div className="image code">
              <i className="material-icons"> code </i>
            </div>
            <div className="cover">
              <div className="title">{sketch.title}</div>
              <div className="description">
                <p className="device">{Devices[sketch.device].name}</p>
                {sketch.description && <p>{sketch.description}</p>}
              </div>
              {onDelete && (
                <button
                  className="delete-btn"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#c00',
                    fontSize: 20
                  }}
                  title="Delete sketch"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(sketch);
                  }}
                >
                  <i className="material-icons">delete</i>
                </button>
              )}
            </div>
          </Card>
        ))}
      </CardContainer>
    </Section>
  );
};

export { ProjectSection };
