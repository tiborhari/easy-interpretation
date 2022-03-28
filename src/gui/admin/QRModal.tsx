import FileSaver from 'file-saver';
import QRCode from 'qrcode';
import React from 'react';
import { Button, Modal } from 'react-bootstrap';


const QRModal = ({
  data, fileName, onHide, show,
}: {
  data: string;
  fileName?: string;
  onHide: () => void;
  show: boolean;
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (show && canvasRef.current && data !== undefined) {
      QRCode.toCanvas(canvasRef.current, data, { margin: 2, width: 360 });
    }
  }, [canvasRef.current, data, show]);

  const handleSave = () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob(blob => (blob ? FileSaver.saveAs(blob, fileName) : null), 'image/png');
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>QR Code</Modal.Title>
      </Modal.Header>
      <Modal.Body className="d-flex flex-column align-items-center">
        <canvas ref={canvasRef} />
        <h5>{data}</h5>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button variant="primary" onClick={handleSave}>Save to file</Button>
      </Modal.Footer>
    </Modal>
  );
};
QRModal.defaultProps = {
  fileName: 'qrcode.png',
};

export default QRModal;
