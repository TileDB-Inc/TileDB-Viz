import * as React from 'react';
import './ToggleMenu.scss';

type Props = {
  toggleSidebarVisibility: () => void;
  active: boolean;
};

const ToggleMenu: React.FC<Props> = props => {
  const { toggleSidebarVisibility, active } = props;
  return (
    <button
      className="BioImageViewer-ToggleMenu"
      onClick={toggleSidebarVisibility}
      title="Toggle sidebar"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13.3333 3.33325C13.3333 2.96506 13.0349 2.66659 12.6667 2.66659H10.6667V13.3333H12.6667C13.0349 13.3333 13.3333 13.0348 13.3333 12.6666V3.33325ZM9.33334 13.3333V2.66659H3.33334C2.96515 2.66659 2.66667 2.96506 2.66667 3.33325V12.6666C2.66667 13.0348 2.96515 13.3333 3.33334 13.3333H9.33334ZM10 1.33325H12.6667C13.7712 1.33325 14.6667 2.22868 14.6667 3.33325V12.6666C14.6667 13.7712 13.7712 14.6666 12.6667 14.6666H10H3.33334C2.22877 14.6666 1.33334 13.7712 1.33334 12.6666V3.33325C1.33334 2.22868 2.22877 1.33325 3.33334 1.33325H10Z"
          fill={active ? '#0070F0' : 'var(--bioimg-text-tertiary)'}
        />
      </svg>
    </button>
  );
};

export default ToggleMenu;
