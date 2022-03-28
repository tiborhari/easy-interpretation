import log from 'electron-log';
import fs from 'fs/promises';
import { pki } from 'node-forge';


export const getSubjectName = async (certPath: string): Promise<string | null> => {
  try {
    const certContent = await fs.readFile(certPath);
    const cert = pki.certificateFromPem(certContent.toString());
    const cnField = cert.subject.getField('CN');
    return cnField.value;
  } catch (error) {
    log.error(error);
    return null;
  }
};
