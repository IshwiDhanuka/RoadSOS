import crypto from 'node:crypto';
import * as cryptoService from '../../services/cryptoService';
import * as envConfig from '../../config/env';

jest.mock('../../config/env');
jest.mock('node:crypto', () => {
  const originalModule = jest.requireActual('node:crypto');
  return {
    ...originalModule,
    createVerify: jest.fn(),
    privateDecrypt: jest.fn(),
    createDecipheriv: jest.fn()
  };
});

describe('cryptoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildSignedPayload', () => {
    it('should format the payload correctly', () => {
      const packet = {
        eventId: 'evt-123',
        timestamp: 1620000000000,
        nonce: 'abc123nonce',
        locationEnc: {
          ciphertext: 'cipher',
          iv: 'iv123',
          authTag: 'auth123',
          wrappedKey: 'wrap123'
        },
        userId: 'user1',
        signature: 'sig123'
      };
      
      const result = cryptoService.buildSignedPayload(packet);
      // locationEnc is passed as object string representation "[object Object]" in the original implementation
      // wait, `packet.locationEnc` is an object.
      // Let's check original implementation: `packet.locationEnc` is stringified.
      expect(result).toBe('evt-123|1620000000000|abc123nonce|{"ciphertext":"cipher","iv":"iv123","authTag":"auth123","wrappedKey":"wrap123"}');
    });
  });

  describe('rsaUnwrapAesKey', () => {
    it('should unwrap the AES key using the private key', () => {
      (envConfig.getEnv as jest.Mock).mockReturnValue({
        RSA_PRIVATE_KEY_B64: Buffer.from('mock-private-key').toString('base64')
      });
      
      const mockAesKey = Buffer.alloc(32, 'a');
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(mockAesKey);
      
      const result = cryptoService.rsaUnwrapAesKey(Buffer.from('wrapped').toString('base64'));
      expect(result).toEqual(mockAesKey);
      expect(crypto.privateDecrypt).toHaveBeenCalled();
    });

    it('should throw if unwrapped key is not 32 bytes', () => {
      (envConfig.getEnv as jest.Mock).mockReturnValue({
        RSA_PRIVATE_KEY_B64: Buffer.from('mock-private-key').toString('base64')
      });
      
      const mockAesKey = Buffer.alloc(16, 'a'); // Invalid length
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(mockAesKey);
      
      expect(() => {
        cryptoService.rsaUnwrapAesKey(Buffer.from('wrapped').toString('base64'));
      }).toThrow('Unwrapped AES key has invalid length');
    });
  });

  describe('decryptLocation', () => {
    it('should decrypt the location payload correctly', () => {
      (envConfig.getEnv as jest.Mock).mockReturnValue({
        RSA_PRIVATE_KEY_B64: Buffer.from('mock-private-key').toString('base64')
      });
      
      const mockAesKey = Buffer.alloc(32, 'a');
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(mockAesKey);

      const mockDecipher = {
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue(Buffer.from('{"lat": 37.7749, "lng": -122.4194}')),
        final: jest.fn().mockReturnValue(Buffer.from(''))
      };
      
      (crypto.createDecipheriv as jest.Mock).mockReturnValue(mockDecipher);

      const encLoc = {
        ciphertext: 'cipher',
        iv: 'iv',
        authTag: 'auth',
        wrappedKey: 'wrap'
      };

      const result = cryptoService.decryptLocation(encLoc);
      expect(result).toEqual({ lat: 37.7749, lng: -122.4194 });
      expect(mockDecipher.setAuthTag).toHaveBeenCalled();
    });

    it('should throw if payload has invalid shape', () => {
      (envConfig.getEnv as jest.Mock).mockReturnValue({
        RSA_PRIVATE_KEY_B64: Buffer.from('mock-private-key').toString('base64')
      });
      
      const mockAesKey = Buffer.alloc(32, 'a');
      (crypto.privateDecrypt as jest.Mock).mockReturnValue(mockAesKey);

      const mockDecipher = {
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue(Buffer.from('{"invalid": "data"}')),
        final: jest.fn().mockReturnValue(Buffer.from(''))
      };
      
      (crypto.createDecipheriv as jest.Mock).mockReturnValue(mockDecipher);

      const encLoc = {
        ciphertext: 'cipher',
        iv: 'iv',
        authTag: 'auth',
        wrappedKey: 'wrap'
      };

      expect(() => {
        cryptoService.decryptLocation(encLoc);
      }).toThrow('Decrypted location payload has invalid shape');
    });
  });

  describe('verifyEcdsaSignature', () => {
    it('should return true for valid signature', () => {
      const mockVerifier = {
        update: jest.fn(),
        end: jest.fn(),
        verify: jest.fn().mockReturnValue(true)
      };
      (crypto.createVerify as jest.Mock).mockReturnValue(mockVerifier);

      const result = cryptoService.verifyEcdsaSignature('public-key', 'data', 'signature');
      expect(result).toBe(true);
      expect(mockVerifier.verify).toHaveBeenCalledWith(
        { key: 'public-key', dsaEncoding: 'der' },
        'signature',
        'base64'
      );
    });
  });
});
