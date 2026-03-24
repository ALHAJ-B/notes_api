import test from 'node:test';
import assert from 'node:assert/strict';

// Provide browser-like globals used by SecureVault in Node tests.
if (!globalThis.atob) {
  globalThis.atob = (value) => Buffer.from(value, 'base64').toString('binary');
}
if (!globalThis.btoa) {
  globalThis.btoa = (value) => Buffer.from(value, 'binary').toString('base64');
}

const { default: SecureVault, generateSalt, arrayBufferToBase64 } = await import(
  '../frontend/src/crypto/SecureVault.js'
);

test('deriveKey + encryptNote + decryptNote roundtrip', async () => {
  const password = 'master_password_123';
  const salt = generateSalt();

  const key = await SecureVault.deriveKey(password, salt);
  const plaintext = 'My top secret note';

  const encrypted = await SecureVault.encryptNote(plaintext, key);
  assert.equal(typeof encrypted.content, 'string');
  assert.equal(typeof encrypted.iv, 'string');

  const decrypted = await SecureVault.decryptNote(encrypted, key);
  assert.equal(decrypted, plaintext);
});

test('derived keys are deterministic for same password+salt', async () => {
  const password = 'same-password';
  const salt = generateSalt();

  const keyA = await SecureVault.deriveKey(password, salt);
  const keyB = await SecureVault.deriveKey(password, salt);

  const plain = 'deterministic check';
  const encrypted = await SecureVault.encryptNote(plain, keyA);
  const decrypted = await SecureVault.decryptNote(encrypted, keyB);

  assert.equal(decrypted, plain);
});

test('arrayBufferToBase64 exports expected format', () => {
  const sample = new Uint8Array([1, 2, 3, 4]);
  const encoded = arrayBufferToBase64(sample);
  assert.equal(typeof encoded, 'string');
  assert.ok(encoded.length > 0);
});
