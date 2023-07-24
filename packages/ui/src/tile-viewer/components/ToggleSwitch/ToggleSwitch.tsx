import * as React from 'react';
import './ToggleSwitch.scss';

type Props = {
  label: (active: boolean) => string;
  active: boolean;
  onClick: () => void;
};

const ToggleSwitch: React.FC<Props> = (props: Props) => {
  const { label, onClick, active } = props;
  return (
    <div className="ImageViewer-ToggleSwitch">
      <button
        onClick={onClick}
        className={`ImageViewer-ToggleSwitch__button ${
          active ? 'ImageViewer-ToggleSwitch__button--active' : ''
        }`}
      >
        <div
          className={`ImageViewer-ToggleSwitch__ball ${
            active ? 'ImageViewer-ToggleSwitch__ball--active' : ''
          }`}
        ></div>
      </button>
      <p className="ImageViewer-ToggleSwitch__label">{label(active)}</p>
    </div>
  );
};

export default ToggleSwitch;
