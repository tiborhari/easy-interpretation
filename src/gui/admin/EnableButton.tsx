import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';


const EnableButton = ({
  className, disabled, value, onChange,
}: {
  className?: string;
  disabled?: boolean;
  value: boolean;
  onChange: (newValue: boolean) => void;
}) => (
  <ButtonGroup className={className}>
    <Button
      disabled={disabled}
      size="sm"
      variant={value ? 'success' : 'outline-success'}
      onClick={() => onChange(true)}
    >
      Enable
    </Button>
    <Button
      size="sm"
      variant={value ? 'outline-danger' : 'danger'}
      onClick={() => onChange(false)}
    >
      Disable
    </Button>
  </ButtonGroup>
);
EnableButton.defaultProps = {
  className: undefined,
  disabled: false,
};

export default EnableButton;
