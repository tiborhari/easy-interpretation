/* eslint-env browser */
import * as process from 'process';
import React from 'react';
import {
  Button, Col, Container, Row, Spinner,
} from 'react-bootstrap';
import ReactDOM from 'react-dom';
import useInterval from 'use-interval';

import { ServerState } from '../types';
import InterpreterView from './InterpreterView';
import ListenerView from './ListenerView';
import Login from './Login';

import './index.scss';

window.process = process;


const ClientGUI = () => {
  const [isLoggingIn, setLoggingIn] = React.useState(false);
  const [serverState, setServerState] = React.useState<ServerState | null>(null);

  useInterval(() => {
    fetch('/state').then(res => res.json()).then((newState) => {
      setServerState(newState);
    });
  }, 10000, true);

  if (serverState === null) {
    return <Spinner animation="border" />;
  }

  const login = (newServerState: ServerState) => {
    setLoggingIn(false);
    setServerState(newServerState);
  };

  const logout = async () => {
    const res = await fetch('/logout'.toString(), {
      method: 'POST',
    });
    setServerState(await res.json());
  };

  const handleInterpreterClose = (stoppedLanguageId: string) => setServerState({
    ...serverState,
    // Change the closed language status to non-live, so that its button will not be disabled.
    languages: serverState.languages.map(language => (
      language.id === stoppedLanguageId
        ? { ...language, live: false }
        : language)),
  });

  return (
    <Container className="p-3">
      {isLoggingIn ? (
        <Login onClose={() => setLoggingIn(false)} onLogin={login} />
      ) : (
        <>
          <Row className="mb-3">
            <Col className="ms-auto" xs="auto">
              <Button
                variant="link"
                onClick={() => (
                  serverState.isLoggedIn ? logout() : setLoggingIn(true)
                )}
              >
                {serverState.isLoggedIn ? 'Log out' : 'Log in'}
              </Button>
            </Col>
          </Row>
          {serverState.isLoggedIn
            ? <InterpreterView serverState={serverState} onClose={handleInterpreterClose} />
            : <ListenerView serverState={serverState} />}
        </>
      )}
    </Container>
  );
};


ReactDOM.render(<ClientGUI />, document.getElementById('root'));
