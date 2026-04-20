import App from './App';
import { useAppContainerModel } from './hooks/useAppContainerModel.js';

function AppContainer() {
  const appProps = useAppContainerModel();

  return <App {...appProps} />;
}

export default AppContainer;
