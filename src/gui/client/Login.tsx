import * as process from 'process';
import React from 'react';
import { Button, Form } from 'react-bootstrap';

import { ServerState } from '../types';

import './index.scss';

window.process = process;


const Login = ({
  onClose, onLogin,
}: {
  onClose: () => void;
  onLogin: (newServerState: ServerState) => void;
}) => {
  const [hasError, setError] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);
  const [password, setPassword] = React.useState('');
  return (
    <Form
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
          const res = await fetch('/login'.toString(), {
            method: 'POST',
            headers: {
              Accept: 'application/json, text/plain, */*',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
          });
          if (res.status === 200) {
            setError(false);
            onLogin(await res.json());
          } else {
            setError(true);
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      <Form.Group className="mb-3">
        <Form.Control
          disabled={isLoading}
          isInvalid={hasError}
          placeholder="Password"
          type="password"
          value={password}
          onChange={({ target }) => setPassword(target.value)}
        />
      </Form.Group>
      <Form.Control.Feedback type="invalid">
        Login failed
      </Form.Control.Feedback>
      <Button className="me-3" disabled={isLoading} type="submit">Log in</Button>
      <Button disabled={isLoading} variant="outline-secondary" onClick={onClose}>Cancel</Button>
    </Form>
  );
};

export default Login;
