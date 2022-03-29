import Peer, { Instance } from 'simple-peer';
import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ReconnectingWebSocket from 'reconnecting-websocket';

import { ServerState } from '../types';
import KeepAwake from './KeepAwake';
import ListenerView from './ListenerView';
import { getWebSocketURL, websocketOptions } from './utils';

type InterpreterState = 'idle' | 'pending' | 'live';

const colorFromStatus = (status: InterpreterState) => {
  switch (status) {
    case 'idle':
      return 'primary';
    case 'pending':
      return 'info';
    case 'live':
      return 'success';
    default:
      return 'danger';
  }
};


const LanguageDisabledTooltip = ({
  children, showTooltip,
}: {
  children: React.ReactElement;
  showTooltip: boolean;
}) => (showTooltip ? (
  <OverlayTrigger
    placement="top"
    overlay={(
      <Tooltip>
        This language is already being interpreted by somebody else.
      </Tooltip>
    )}
  >
    {children}
  </OverlayTrigger>
) : (
  children
));


const InterpreterView = ({ onClose, serverState }: {
  onClose: (stoppedLanguageId: string) => void;
  serverState: ServerState;
}) => {
  const mediaStreamRefRef = React.useRef<MediaStream>();
  const wsRef = React.useRef<ReconnectingWebSocket>();
  const peersRef = React.useRef<{ [key: string]: Instance }>();
  const [interpreterState, setInterpreterState] = React.useState<InterpreterState>('idle');
  const [interpretLanguage, setInterpretlanguage] = React.useState<string | null>(null);
  const [hasError, setError] = React.useState<string | null>(null);

  const closeWs = () => {
    if (wsRef.current) {
      wsRef.current.close();
    } if (mediaStreamRefRef.current) {
      mediaStreamRefRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }
    setInterpreterState('idle');
    if (interpretLanguage) {
      onClose(interpretLanguage);
    }
    setInterpretlanguage(null);
  };

  const startInterpreting = async (languageId: string) => {
    // Close existing connection (if any)
    closeWs();

    // Waits until the user gives permission for microphone access.
    try {
      mediaStreamRefRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch (err: any) {
      setError(err.toString());
      return;
    }

    setInterpreterState('pending');
    setInterpretlanguage(languageId);

    // TODO: Proper URL formatting
    const ws = new ReconnectingWebSocket(
      `${getWebSocketURL()}/interpret/${languageId}`, undefined, websocketOptions,
    );
    wsRef.current = ws;

    ws.onerror = (ev) => {
      console.info('WebSocket error');
      setError(ev.message);
    };

    ws.onopen = () => {
      console.info('WebSocket open');
      setInterpreterState('live');
      setError(null);
      peersRef.current = {};
    };

    ws.onmessage = (event) => {
      console.info('WebSocket message');
      const data = JSON.parse(event.data);
      if (!peersRef.current) {
        console.warn('peersRef.current is undefined');
        return;
      }
      if (data.type === 'signal') {
        const { listenerId, signal } = data;
        if (!(listenerId in peersRef.current)) {
          console.info('Peer create');
          peersRef.current[listenerId] = new Peer({
            config: { iceServers: [] },
            stream: mediaStreamRefRef.current,
            trickle: false,
          });
          peersRef.current[listenerId].on('signal', (sig) => {
            ws.send(JSON.stringify({ type: 'signal', listenerId, signal: JSON.stringify(sig) }));
          });
          peersRef.current[listenerId].on('connect', () => {
            console.info(`Peer ${listenerId} connected`);
          });
          peersRef.current[listenerId].on('close', () => {
            console.info('Peer close');
            if (peersRef.current) {
              delete peersRef.current[listenerId];
            }
          });
        }
        console.info('Peer signal input');
        peersRef.current[listenerId].signal(JSON.parse(signal));
      } else if (data.type === 'removeListener') {
        const { listenerId } = data;
        if (peersRef.current && listenerId in peersRef.current) {
          console.info('Peer destroy');
          peersRef.current[listenerId].destroy();
        }
      }
    };

    ws.onclose = () => {
      console.info('WebSocket close');
      setInterpreterState('pending');
      if (peersRef.current) {
        Object.values(peersRef.current).forEach((peer) => {
          peer.destroy();
        });
      }
    };
  };

  React.useEffect(() => closeWs, []); // Close the connection when unmounting

  return (
    <div className="d-flex flex-column gap-3">
      <KeepAwake active={!!interpretLanguage} />
      <h1>Interpret</h1>
      {(serverState?.languages ?? []).map((language) => {
        const isActive = language.id === interpretLanguage;
        const disabled = language.live && !isActive;
        return (
          <LanguageDisabledTooltip showTooltip={disabled}>
            {/* Disabled buttons don't fire hover events, so we have to wrap them into a div
                to show the tooltip. */}
            <div className="d-flex">
              <Button
                key={language.id}
                className="flex-fill"
                disabled={language.live && !isActive}
                variant={isActive ? colorFromStatus(interpreterState) : 'primary'}
                size="lg"
                onClick={() => (isActive ? closeWs() : startInterpreting(language.id))}
              >
                {language.name}
              </Button>
            </div>
          </LanguageDisabledTooltip>
        );
      })}
      {hasError ?? null}
      <h1>Listen</h1>
      <ListenerView serverState={serverState} small />
    </div>
  );
};

export default InterpreterView;
