import * as React from 'react';
import Header from '../Header';
import './Section.scss';

type Props = {
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  initialVisibility?: boolean;
};

const Section: React.FC<Props> = (props: Props) => {
  const { title, children, className, initialVisibility = true } = props;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(initialVisibility);

  const toggleVisibility = React.useCallback(() => {
    setVisible(v => !v);
  }, []);

  return (
    <div className={`ImageViewer-Section ${className}`}>
      <Header toggleVisibility={toggleVisibility} visibleContent={visible}>
        {title}
      </Header>
      <div
        ref={containerRef}
        className="ImageViewer-Section__container"
        style={{
          maxHeight: visible ? containerRef.current?.scrollHeight : 0
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Section;
