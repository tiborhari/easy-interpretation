import Peer, { Instance } from 'simple-peer';
import React from 'react';
import { Dots, Levels } from 'react-activity';
import { Button } from 'react-bootstrap';
import * as Icon from 'react-bootstrap-icons';
import ReconnectingWebSocket from 'reconnecting-websocket';

import { ServerState } from '../types';
import KeepAwake from './KeepAwake';
import { getWebSocketURL, websocketOptions } from './utils';


type ListenerState = 'idle' | 'pending' | 'connecting' | 'live' | 'waitingForUser';


const colorFromStatus = (status: ListenerState) => {
  switch (status) {
    case 'idle':
      return 'primary';
    case 'connecting':
    case 'pending':
    case 'waitingForUser':
      return 'info';
    case 'live':
      return 'success';
    default:
      return 'danger';
  }
};

const ListenerView = ({ serverState, small }: { serverState: ServerState; small?: boolean }) => {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const peerRef = React.useRef<Instance>();
  const interpreterIdRef = React.useRef<string>();
  const wsRef = React.useRef<ReconnectingWebSocket>();
  const [interpreterState, setInterpreterState] = React.useState<ListenerState>('idle');
  const [interpretLanguage, setInterpretlanguage] = React.useState<string | null>(null);
  const [, setError] = React.useState(false);

  const closePeer = (disableEvents = false) => {
    if (peerRef.current) {
      const peer = peerRef.current;
      peerRef.current = undefined;
      if (disableEvents) {
        // Shouldn't close WebSocket
        peer.removeAllListeners();
      }
      console.info('peer.destroy');
      peer.destroy();
    }
  };

  const close = () => {
    console.info('close');
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = undefined;
      ws.close(); // This will also close the peer
    }
    setInterpreterState('idle');
    setInterpretlanguage(null);
  };

  const connectPeer = (
    ws: ReconnectingWebSocket, interpreterId: string | null,
  ) => {
    closePeer(true);

    if (interpreterId) {
      const peer = new Peer({
        config: { iceServers: [] },
        initiator: true,
        trickle: false,
      });
      peerRef.current = peer;

      peer.on('signal', (signal) => {
        console.info('Peer signal');
        ws.send(JSON.stringify({ type: 'signal', interpreterId, signal: JSON.stringify(signal) }));
      });
      peer.on('close', () => {
        console.info('Peer close');
        if (ws === wsRef.current) {
          peerRef.current = undefined;
          if (wsRef.current) {
            wsRef.current.reconnect();
          }
        }
      });

      peer.on('stream', (stream) => {
        console.info('Peer stream');
        // got remote video stream, now let's show it in a video tag
        if (!audioRef.current) {
          console.warn('audioRef is unset');
          return;
        }
        if ('srcObject' in audioRef.current) {
          audioRef.current.srcObject = stream;
        } else {
          // For older browsers
          (audioRef.current as HTMLAudioElement).src = window.URL
            .createObjectURL(stream as unknown as MediaSource);
        }
        audioRef.current.play();
        const prevAudio = audioRef.current;
        setTimeout(() => {
          if (
            peerRef.current === peer
            && audioRef.current === prevAudio
            && audioRef.current.paused
          ) {
            // Some browsers (iOS) only support 'play()' from an onClick handler.
            setInterpreterState('waitingForUser');
          }
        }, 1000);
      });
    }
  };

  const startListening = async (languageId: string) => {
    // Close existing connection (if any)
    close();

    // Waits until the user gives permission for microphone access.
    setInterpreterState('pending');
    setInterpretlanguage(languageId);

    // TODO: Proper URL formatting
    const ws = new ReconnectingWebSocket(`${getWebSocketURL()}/listen/${languageId}`, undefined, websocketOptions);
    wsRef.current = ws;

    ws.onerror = () => {
      console.info('WebSocket error');
      setError(true);
    };

    ws.onopen = () => {
      console.info('WebSocket open');
      setInterpreterState('connecting');
      setError(false);
    };

    ws.onmessage = (event) => {
      console.info('WebSocket message');
      const message = JSON.parse(event.data);
      if (message.type === 'newInterpreter') {
        interpreterIdRef.current = message.interpreterId;
        connectPeer(ws, message.interpreterId);
      } else if (message.type === 'signal') {
        if (peerRef.current && message.interpreterId === interpreterIdRef.current) {
          peerRef.current.signal(message.signal);
        }
      }
    };

    ws.onclose = () => {
      console.info('WebSocket close');
      interpreterIdRef.current = undefined;
      setInterpreterState('pending');
      closePeer();
    };
  };

  React.useEffect(() => close, []); // Close the connection when unmounting

  return (
    <div className={small ? 'd-flex flex-row' : 'd-grid gap-3'}>
      <KeepAwake active={!!interpretLanguage} />
      <audio ref={audioRef} onPlay={() => setInterpreterState('live')} />
      {(serverState?.languages ?? []).map((language) => {
        const isActive = language.id === interpretLanguage;
        const isWaitingForUser = interpreterState === 'waitingForUser';
        let spinner: React.ReactNode = null;
        if (isActive) {
          if (['pending', 'connecting'].includes(interpreterState)) {
            spinner = <Dots size={20} />;
          } else if (interpreterState === 'live') {
            spinner = <Levels size={33} />;
          }
        }
        let playIcon = <Icon.PlayFill size={50} />;
        if (isActive) {
          if (isWaitingForUser) {
            playIcon = <Icon.HandIndexThumb size={50} />;
          } else {
            playIcon = <Icon.PauseFill size={50} />;
          }
        }
        return (
          <Button
            key={language.id}
            className={`d-flex align-items-center ${small ? 'me-2' : ''} ${isWaitingForUser ? 'smaller-font' : ''}`}
            variant={isActive ? colorFromStatus(interpreterState) : 'primary'}
            size={small ? undefined : 'lg'}
            onClick={() => {
              if (isActive) {
                if (isWaitingForUser) {
                  if (audioRef.current) {
                    audioRef.current.play();
                  }
                } else {
                  close();
                }
              } else {
                startListening(language.id);
              }
            }}
          >
            {small ? null : playIcon}
            {isWaitingForUser ? 'Click to play' : language.name}
            {small ? null : spinner}
          </Button>
        );
      })}
    </div>
  );
};
ListenerView.defaultProps = {
  small: false,
};

export default ListenerView;
