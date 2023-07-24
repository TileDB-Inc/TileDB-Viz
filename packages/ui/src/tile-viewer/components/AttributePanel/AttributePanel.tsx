import React from 'react';
import { Attribute } from '@tiledb-inc/viz-core';
import './AttributePanel.scss';
import { capitalize } from '../../utils/helpers';

interface Props {
  attributes: Attribute[];
  onAttributeUpdate: (name: string) => void;
}

const AttributePanel: React.FC<Props> = props => {
  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    props.onAttributeUpdate((event?.target as HTMLInputElement)?.value);
  };

  return (
    <div className="ImageViewer-AttributePanel">
      <h6 className="ImageViewer-AttributePanel__title">
        Available Attributes
      </h6>
      {props.attributes.map((item, index: number) => {
        return (
          <div key={item.name} className="ImageViewer-AttributePanel__item">
            <input
              type="radio"
              value={item.name}
              name="attribute"
              id={item.name}
              checked={item.visible}
              onChange={handleOnChange}
              className="ImageViewer-AttributePanel__radio"
            />
            <label
              className="ImageViewer-AttributePanel__label"
              htmlFor={item.name}
            >
              {capitalize(item.name)}
            </label>
          </div>
        );
      })}
    </div>
  );
};

export default AttributePanel;
