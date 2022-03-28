import React from 'react';
import { Button } from 'react-bootstrap';
import * as Icon from 'react-bootstrap-icons';
import { connect, ConnectedProps } from 'react-redux';

import { Protocol, ServerSettings, State } from '../../state/types';
import ConditionalTooltip from '../ConditionalTooltip';
import QRModal from './QRModal';


const connector = connect((state: State) => ({
  domain: state.liveState.domain,
  ipAddress: state.liveState.localIpAddress ?? 'CANNOT_DETERMINE_IP',
  serverSettings: state.settings.server,
}));


const LinkToBrowser = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <Button
    className="btn-inline-link"
    variant="link"
    onClick={(event) => {
      event.preventDefault();
      window.api.openLinkInBrowser(url);
    }}
  >
    {children}
  </Button>
);


const createUrl = ({ domain, port, protocol }: {
  domain: string;
  port: number;
  protocol: Protocol;
}) => (
  ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443))
    ? domain
    : `${protocol}://${domain}:${port}`
);

const ConditionalEnableHint = ({ protocol, serverSettings }: {
  protocol: Protocol;
  serverSettings: ServerSettings;
}) => (
  serverSettings[protocol].enable
    ? null
    : <span>{` (enable ${protocol.toUpperCase()} to use)`}</span>
);

const ClientLink = ({
  addQRCode, domain, port, protocol, serverSettings,
}: Parameters<typeof createUrl>[0] & { addQRCode?: boolean; serverSettings: ServerSettings }) => {
  const [showModal, setShowModal] = React.useState(false);
  const url = createUrl({ domain, port, protocol });

  return (
    <>
      {addQRCode ? (
        <QRModal data={url} show={showModal} onHide={() => setShowModal(false)} />
      ) : null}
      <LinkToBrowser url={url}>{url}</LinkToBrowser>
      <ConditionalEnableHint protocol={protocol} serverSettings={serverSettings} />
      {addQRCode ? (
        <ConditionalTooltip show tooltip="Show QR code">
          <Button className="btn-inline-link qrcode-link" size="sm" variant="link" onClick={() => setShowModal(true)}>
            <Icon.QrCode />
          </Button>
        </ConditionalTooltip>
      ) : null}
    </>
  );
};
ClientLink.defaultProps = {
  addQRCode: false,
};

const HowToUse = ({ domain, ipAddress, serverSettings }: ConnectedProps<typeof connector>) => {
  const hasHttps = !!domain;
  return (
    <div>
      <h1>How to listen</h1>
      <ol>
        {hasHttps ? (
          <li>
            Open one of the following links in a smartphone browser:
            <br />
            <ClientLink addQRCode domain={ipAddress} port={serverSettings.http.port} protocol="http" serverSettings={serverSettings} />
            <br />
            <ClientLink addQRCode domain={domain} port={serverSettings.https.port} protocol="https" serverSettings={serverSettings} />
          </li>
        ) : (
          <li>
            Open the following link in a smartphone browser:
            <br />
            <ClientLink addQRCode domain={ipAddress} port={serverSettings.http.port} protocol="http" serverSettings={serverSettings} />
          </li>
        )}
        <li>Click on the language, that you would like to listen.</li>
        <li>
          Sometimes on iOS devices,
          {' you\'ll '}
          need to click on the button again, when it tells you to.
        </li>
      </ol>
      <h1>How to Interpret</h1>
      <ol>
        {hasHttps ? (
          <li>
            Open the following link on this computer:
            <br />
            <ClientLink domain="localhost" port={serverSettings.http.port} protocol="http" serverSettings={serverSettings} />
            <br />
            Or open the following link in a smartphone browser:
            <br />
            <ClientLink addQRCode domain={domain} port={serverSettings.https.port} protocol="https" serverSettings={serverSettings} />
          </li>
        ) : (
          <li>
            Open the following link on this computer:
            <br />
            <ClientLink domain="localhost" port={serverSettings.http.port} protocol="http" serverSettings={serverSettings} />
          </li>
        )}
        <li>Click &ldquo;Log in&rdquo; on the top right corner.</li>
        <li>Log in with the password from the &ldquo;Settings&rdquo; tab.</li>
        <li>Click on the language, that you would like to interpret.</li>
        <li>Enable access to the microphone, if asked.</li>
        <li>
          Optionally, if you would like to listen a different language while interpreting,
          click on the small button of that language.
        </li>
      </ol>
      {hasHttps ? null : (
        <p>
          <strong>Note: </strong>
          {'If you would like to interpret from a smartphone, please set up HTTPS following '}
          <LinkToBrowser url="https://github.com/tiborhari/easy-interpretation">our guide</LinkToBrowser>
          .
        </p>
      )}
    </div>
  );
};

export default connector(HowToUse);
