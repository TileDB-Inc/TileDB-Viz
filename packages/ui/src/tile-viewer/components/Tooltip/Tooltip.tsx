import * as React from 'react';
import './Tooltip.scss';

interface Props {
  tooltipText: string;
  children?: React.ReactNode;
}

const Tooltip: React.FC<Props> = props => {
  const { tooltipText, children } = props;
  return (
    <div className="BIV-Tooltip">
      {children}
      <div className="BIV-Tooltip__content">{tooltipText}</div>
    </div>
  );
};

export default Tooltip;
