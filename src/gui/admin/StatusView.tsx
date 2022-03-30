import { arrayMoveImmutable } from 'array-move';
import capitalize from 'lodash/capitalize';
import React from 'react';
import {
  Badge, Button, ButtonGroup, Card, Col, Form, Modal, OverlayTrigger, Row, Tooltip,
} from 'react-bootstrap';
import * as Icon from 'react-bootstrap-icons';
import { connect, ConnectedProps } from 'react-redux';
import { v4 as uuidV4 } from 'uuid';

import { changeSettings } from '../../state/actions';
import {
  HttpState, LanguageLiveState, LanguageSettings, ServerState, State,
} from '../../state/types';
import ConditionalTooltip from '../ConditionalTooltip';
import EnableButton from './EnableButton';


const getColorForServerStatus = (status: HttpState['status']) => {
  switch (status) {
    case 'stopped':
      return 'secondary';
    case 'starting':
      return 'info';
    case 'started':
      return 'success';
    default:
      return 'danger';
  }
};


const DeletingDialog = ({ name, onDelete, onHide }: {
  name: string | undefined;
  onDelete: () => void;
  onHide: () => void;
}) => (
  <Modal size="sm" show={!!name} onHide={onHide}>
    <Modal.Header closeButton>
      <Modal.Title>Delete language</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {'Are you sure you want to delete '}
      <strong>{name}</strong>
      ?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={onHide}>Cancel</Button>
      <Button variant="danger" onClick={onDelete}>Delete</Button>
    </Modal.Footer>
  </Modal>
);


const connector = connect((state: State) => ({
  state,
}), {
  onChangeSettings: changeSettings,
});

const StatusView = ({ onChangeSettings, state }: ConnectedProps<typeof connector>) => {
  const [deleting, setDeleting] = React.useState<LanguageSettings | null>(null);
  const [editor, setEditor] = React.useState<{ id: string | null; name: string } | null>(null);

  const partialChangeSettings = (partialSettings: Partial<typeof state.settings>) => (
    onChangeSettings({ newSettings: { ...state.settings, ...partialSettings } })
  );

  const saveEditor = () => {
    if (!editor) {
      return;
    }
    const newLanguages = editor.id
      ? state.settings.languages.map(language => (
        language.id === editor.id
          ? { ...language, name: editor.name }
          : language
      ))
      : [
        ...state.settings.languages,
        {
          enable: true, id: uuidV4(), name: editor.name, public: true,
        },
      ];
    partialChangeSettings({ languages: newLanguages });
    setEditor(null);
  };

  return (
    <>
      <Modal size="sm" show={!!editor} onHide={() => setEditor(null)}>
        <Modal.Header closeButton>
          <Modal.Title>{editor?.id ? 'Edit language' : 'Add language'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(event) => {
              event.preventDefault();
              saveEditor();
            }}
          >
            <Form.Group className="mb-3">
              <Form.Control
                autoFocus
                placeholder="Language name"
                required
                value={editor?.name ?? ''}
                onChange={({ target }) => (
                  setEditor({ ...(editor ?? { id: null }), name: target.value })
                )}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditor(null)}>Close</Button>
          <Button variant="primary" onClick={saveEditor}>Save</Button>
        </Modal.Footer>
      </Modal>
      <DeletingDialog
        name={deleting?.name}
        onDelete={() => {
          if (deleting) {
            partialChangeSettings({
              languages: state.settings.languages.filter(language => language.id !== deleting.id),
            });
          }
          setDeleting(null);
        }}
        onHide={() => setDeleting(null)}
      />
      <h2>Server</h2>
      <Row className="mb-3">
        {(['http', 'https'] as (keyof ServerState)[]).map((protocol) => {
          const serverState = state.liveState.server[protocol];
          const serverSettings = state.settings.server[protocol];
          const httpsDisabled = protocol === 'https' && (!state.settings.server.https.certPath || !state.settings.server.https.keyPath);
          return (
            <Col xs={6}>
              <Card>
                <Card.Body>
                  <div className="card-title d-flex align-items-end mb-3">
                    <h5 className="m-0">
                      {protocol.toUpperCase()}
                    </h5>
                    <ConditionalTooltip show={serverState.status === 'error'} tooltip={'error' in serverState ? serverState.error : null}>
                      <Badge bg={getColorForServerStatus(serverState.status)} className="ms-auto">
                        {capitalize(serverState.status)}
                      </Badge>
                    </ConditionalTooltip>
                  </div>
                  <ConditionalTooltip
                    show={httpsDisabled}
                    tooltip="HTTPS can only be enabled, if the certificate and private key is set on the Settings tab."
                  >
                    <div>
                      <EnableButton
                        disabled={httpsDisabled}
                        value={serverSettings.enable}
                        onChange={enable => partialChangeSettings({
                          server: {
                            ...state.settings.server,
                            [protocol]: { ...state.settings.server[protocol], enable },
                          },
                        })}
                      />
                    </div>
                  </ConditionalTooltip>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      <h2>Languages</h2>
      {state.settings.languages.map((language, idx) => {
        const status: LanguageLiveState | null = state.liveState.languages[language.id] ?? null;

        const changeLanguage = (newSettings: Partial<typeof language>) => partialChangeSettings({
          languages: state.settings.languages
            .map(l => (l.id === language.id ? { ...l, ...newSettings } : l)),
        });

        return (
          <Card key={language.id} className="mb-3">
            <Card.Body>
              <div className="card-title d-flex justify-content-between">
                <h5 className="m-0">
                  {language.name}
                </h5>
                <ButtonGroup>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setEditor({ id: language.id, name: language.name })}
                  >
                    <Icon.Pencil />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => setDeleting(language)}
                  >
                    <Icon.Trash />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => partialChangeSettings({
                      languages: arrayMoveImmutable(
                        state.settings.languages, idx, Math.max(0, idx - 1),
                      ),
                    })}
                  >
                    <Icon.ChevronUp />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => partialChangeSettings({
                      languages: arrayMoveImmutable(state.settings.languages, idx, idx + 1),
                    })}
                  >
                    <Icon.ChevronDown />
                  </Button>
                </ButtonGroup>
              </div>
              <EnableButton
                className="me-3 mb-2"
                value={language.enable}
                onChange={enable => changeLanguage({ enable })}
              />
              <ButtonGroup className="mb-2">
                <Button
                  size="sm"
                  variant={language.public ? 'primary' : 'outline-primary'}
                  onClick={() => changeLanguage({ public: true })}
                >
                  Public
                </Button>
                <OverlayTrigger
                  placement="bottom"
                  overlay={(
                    <Tooltip id="tooltip-private-button">
                      Private languages are only seen by interpreters.
                    </Tooltip>
                  )}
                >
                  <Button
                    size="sm"
                    variant={language.public ? 'outline-secondary' : 'secondary'}
                    onClick={() => changeLanguage({ public: false })}
                  >
                    Private
                  </Button>
                </OverlayTrigger>
              </ButtonGroup>
              {status ? (
                <>
                  <div className="mb-2">
                    {'Interpreter: '}
                    <Badge bg={status.interpreterSocketId ? 'success' : 'secondary'}>
                      {status.interpreterSocketId ? 'connected' : 'not connected'}
                    </Badge>
                  </div>
                  <div>
                    {'Listeners: '}
                    <Badge bg={status.listeners.length > 0 ? 'success' : 'secondary'}>
                      {status.listeners.length}
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2">&nbsp;</div>
                  <div>&nbsp;</div>
                </>
              )}
            </Card.Body>
          </Card>
        );
      })}
      <Button
        className="align-self-start"
        variant="outline-secondary"
        onClick={() => setEditor({ id: null, name: '' })}
      >
        <Icon.PlusLg />
        Add language
      </Button>
    </>
  );
};

export default connector(StatusView);
