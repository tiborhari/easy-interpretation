import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';
import React from 'react';
import {
  Button, Form, InputGroup,
} from 'react-bootstrap';
import * as Icon from 'react-bootstrap-icons';
import { connect, ConnectedProps } from 'react-redux';

import { changeSettings } from '../../state/actions';
import { State } from '../../state/types';
import { generateSecretKey } from '../../utils';
import { RecursivePartial } from './utils';


const connector = connect((state: State) => ({
  settings: state.settings,
}), {
  onSave: changeSettings,
});

const VisiblePasswordInput = ({ onChange, value }: {
  onChange: (newValue: string) => void;
  value: string;
}) => {
  const [isVisible, setVisible] = React.useState(false);

  return (
    <InputGroup>
      <Form.Control
        required
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={({ target }) => onChange(target.value)}
      />
      <Button variant="outline-secondary" onClick={() => setVisible(!isVisible)}>
        {isVisible ? <Icon.EyeSlash /> : <Icon.Eye />}
      </Button>
    </InputGroup>
  );
};

const Settings = ({ onSave, settings }: ConnectedProps<typeof connector>) => {
  const [newSettings, changeNewSettings] = React.useState(settings);

  React.useEffect(() => changeNewSettings(settings), [settings]);

  const change = (partialSettings: RecursivePartial<typeof settings>) => (
    changeNewSettings(merge({}, newSettings, partialSettings))
  );

  const isChanged = React.useMemo(
    () => !isEqual(newSettings, settings),
    [newSettings, settings],
  );

  return (
    <>
      <h1>Settings</h1>
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ newSettings });
        }}
      >
        <Form.Group className="mb-3">
          <Form.Label>Interpreter password</Form.Label>
          <VisiblePasswordInput
            value={newSettings.interpreterPassword}
            onChange={newValue => change({ interpreterPassword: newValue })}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            label="Log out all users"
            checked={newSettings.secretKey !== settings.secretKey}
            onChange={({ target }) => (
              target.checked
                ? change({ secretKey: generateSecretKey() })
                : change({ secretKey: settings.secretKey })
            )}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>HTTP server port</Form.Label>
          <Form.Control
            required
            type="number"
            value={newSettings.server.http.port}
            onChange={({ target }) => (
              change({ server: { http: { port: Number.parseInt(target.value, 10) } } })
            )}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>HTTPS server port</Form.Label>
          <Form.Control
            required
            type="number"
            value={newSettings.server.https.port}
            onChange={({ target }) => (
              change({ server: { https: { port: Number.parseInt(target.value, 10) } } })
            )}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>HTTPS certificate path</Form.Label>
          <Form.Control
            value={newSettings.server.https.certPath}
            onChange={({ target }) => (
              change({ server: { https: { certPath: target.value } } })
            )}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>HTTPS private key path</Form.Label>
          <Form.Control
            value={newSettings.server.https.keyPath}
            onChange={({ target }) => (
              change({ server: { https: { keyPath: target.value } } })
            )}
          />
        </Form.Group>
        <div className="align-self-center">
          <Button className="me-3" disabled={!isChanged} variant="outline-secondary" onClick={() => change(settings)}>Reset</Button>
          <Button disabled={!isChanged} variant="primary" type="submit">Save</Button>
        </div>
      </Form>
    </>
  );
};

export default connector(Settings);
