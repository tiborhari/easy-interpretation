import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';


const ConditionalTooltip = ({
  children, show, tooltip,
}: {
  children: React.ReactElement;
  show: boolean;
  tooltip: string | null | undefined;
}) => (show ? (
  <OverlayTrigger
    placement="bottom"
    overlay={(
      <Tooltip>
        {tooltip}
      </Tooltip>
    )}
  >
    {children}
  </OverlayTrigger>
) : (
  children
));

export default ConditionalTooltip;
