import React, { useRef, useState } from 'react';
import DimensionSlider from '../DimensionSlider';
import { Dimension } from '@tiledb-inc/viz-core';
import '../ChannelPanel/ChannelPanel.scss';

interface Props {
  dimensions: Dimension[];
  onDimensionUpdate: (value: number, name: string) => void;
}

interface ControlPanelState {
  isOpen: boolean;
}

const DimensionPanel: React.FC<Props> = props => {
  const listRef = useRef<HTMLUListElement>(null);
  const [state, setState] = useState<ControlPanelState>({
    isOpen: false
  });

  return (
    <div className="ImageViewer-ControlPanel">
      <h6 className="ImageViewer-ControlPanel__title">
        <div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM0 2a2 2 0 0 1 3.937-.5h8.126A2 2 0 1 1 14.5 3.937v8.126a2 2 0 1 1-2.437 2.437H3.937A2 2 0 1 1 1.5 12.063V3.937A2 2 0 0 1 0 2zm2.5 1.937v8.126c.703.18 1.256.734 1.437 1.437h8.126a2.004 2.004 0 0 1 1.437-1.437V3.937A2.004 2.004 0 0 1 12.063 2.5H3.937A2.004 2.004 0 0 1 2.5 3.937zM14 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM2 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm12 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
              fill="black"
              fillOpacity="0.7"
            />
          </svg>
          Extra Dimensions
        </div>
        <div
          className="ImageViewer-ControlPanel__toggle"
          onClick={() => setState({ ...state, isOpen: !state.isOpen })}
        >
          {state.isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                d="M.172 15.828a.5.5 0 0 0 .707 0l4.096-4.096V14.5a.5.5 0 1 0 1 0v-3.975a.5.5 0 0 0-.5-.5H1.5a.5.5 0 0 0 0 1h2.768L.172 15.121a.5.5 0 0 0 0 .707zM15.828.172a.5.5 0 0 0-.707 0l-4.096 4.096V1.5a.5.5 0 1 0-1 0v3.975a.5.5 0 0 0 .5.5H14.5a.5.5 0 0 0 0-1h-2.768L15.828.879a.5.5 0 0 0 0-.707z"
                fill="#0000009d"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707z"
                fill="#0000009d"
              />
            </svg>
          )}
        </div>
      </h6>
      <ul
        ref={listRef}
        className="ImageViewer-ControlPanel__list"
        style={{
          maxHeight: state.isOpen ? listRef.current?.scrollHeight : 0
        }}
      >
        {props.dimensions.map((item, index: number) => {
          return (
            <li className="ImageViewer-ControlPanel__item" key={index}>
              <DimensionSlider
                dimension={item}
                onDimensionUpdate={props.onDimensionUpdate}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DimensionPanel;
