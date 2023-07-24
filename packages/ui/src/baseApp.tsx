import ReactDOM from 'react-dom/client';
import * as ReactDomExports from 'react-dom';
import ErrorBoundary from './ErrorBoundary';
import Viewer from './Viewer';

interface Options {
  rootElement: string | HTMLDivElement;
  token: string;
  basePath?: string;
  assetID: string;
  namespace: string;
  baseGroup?: string;
  width?: string;
  height?: string;
  onLoad?: () => void;
  onError?: (err: Error) => void;
}

const App: React.FC<Omit<Options, 'rootElement'>> = props => {
  return (
    <ErrorBoundary errorHandler={props.onError}>
      <Viewer
        token={props.token}
        assetID={props.assetID}
        baseGroup={props.baseGroup}
        namespace={props.namespace}
        onError={props.onError}
        basePath={props.basePath}
        onLoad={props.onLoad}
        width={props.width}
        height={props.height}
      />
    </ErrorBoundary>
  );
};

const createViewer = (options: Options) => {
  console.log(options);
  let container: HTMLDivElement;
  if (typeof options.rootElement === 'string') {
    container = document.getElementById(options.rootElement) as HTMLDivElement;
  } else {
    container = options.rootElement;
  }
  if (ReactDomExports.version.startsWith('18.')) {
    
    const root = ReactDOM.createRoot(container);
    root.render(
      <App
      onError={options.onError}
      token={options.token}
      assetID={options.assetID}
      baseGroup={options.baseGroup}
      namespace={options.namespace}
      basePath={options.basePath}
      onLoad={options.onLoad}
      width={options.width}
      height={options.height}
    />
    );
  } else {
    /** Run in previous versions of react */
    ReactDomExports.render(
      <App
      onError={options.onError}
      token={options.token}
      assetID={options.assetID}
      baseGroup={options.baseGroup}
      namespace={options.namespace}
      basePath={options.basePath}
      onLoad={options.onLoad}
      width={options.width}
      height={options.height}
    />,
      container
    );
  }
};

export default createViewer;
