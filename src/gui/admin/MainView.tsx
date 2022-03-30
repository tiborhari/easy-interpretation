import React from 'react';
import {
  Button, ButtonGroup, Container,
} from 'react-bootstrap';
import { connect, ConnectedProps } from 'react-redux';

import { State } from '../../state/types';
import HowToUse from './HowToUse';
import Settings from './Settings';
import StatusView from './StatusView';


const connector = connect((state: State) => ({ hasSettings: !!state.settings }));


const pages: { [pageName: string]: { title: string; Component: React.ComponentType } } = {
  state: { title: 'Status', Component: StatusView },
  howToUse: { title: 'How to use', Component: HowToUse },
  settings: { title: 'Settings', Component: Settings },
};

const MainView = ({ hasSettings }: ConnectedProps<typeof connector>) => {
  const [page, setPage] = React.useState('state');

  React.useEffect(() => {
    document.title = 'Easy interpretation';
  }, []);

  if (!hasSettings) {
    return null;
  }

  const PageComponent = pages[page].Component;

  return (
    <Container className="d-flex flex-column p-3">
      <ButtonGroup className="align-self-center mb-3">
        {Object.entries(pages).map(([pageName, pageInfo]) => (
          <Button
            key={pageName}
            variant={pageName === page ? 'primary' : 'outline-primary'}
            onClick={() => setPage(pageName)}
          >
            {pageInfo.title}
          </Button>
        ))}
      </ButtonGroup>
      <PageComponent />
    </Container>
  );
};

export default connector(MainView);
