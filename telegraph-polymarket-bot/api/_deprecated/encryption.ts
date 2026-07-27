import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY || '';

export const encrypt = (text: string) => {
  if (!MASTER_KEY) throw new Error('MASTER_ENCRYPTION_KEY not set');
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(MASTER_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

export const decrypt = (encryptedText: string, ivHex: string, tagHex: string) => {
  if (!MASTER_KEY) throw new Error('MASTER_ENCRYPTION_KEY not set');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(MASTER_KEY, 'hex'), 
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
