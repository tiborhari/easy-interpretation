import randomBytes from 'randombytes';


export const isDev = (typeof process === 'undefined' ? false : process.env.ELECTRON_ENV === 'development');

export const errorToString = (error: unknown) => {
  if (typeof error === 'string') {
    return error;
  } if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
};

export const generateSecretKey = () => randomBytes(32).toString('base64');
