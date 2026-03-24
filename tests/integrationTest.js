import test from 'node:test';
import assert from 'node:assert/strict';
import { before, after } from 'node:test';

import dotenv from 'dotenv';
import { createApp } from '../backend/src/app.js';

dotenv.config();

let server;
const baseUrl = 'http://127.0.0.1:3101';

before(async () => {
  server = createApp().listen(3101);
  await new Promise((resolve) => server.once('listening', resolve));
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('auth + notes integration flow works', async () => {
  const username = `integration_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const password = 'pass12345';
  const encryptionSalt = 'c29tZV9zYWx0X2Jhc2U2NA==';

  const registerRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, encryptionSalt }),
  });
  assert.equal(registerRes.status, 201);
  const registerBody = await registerRes.json();
  assert.equal(typeof registerBody.token, 'string');

  const duplicateRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, encryptionSalt }),
  });
  assert.equal(duplicateRes.status, 409);

  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(loginRes.status, 200);
  const loginBody = await loginRes.json();
  assert.equal(typeof loginBody.token, 'string');
  assert.equal(loginBody.encryptionSalt, encryptionSalt);

  const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'wrong_password' }),
  });
  assert.equal(badLoginRes.status, 401);

  const badLoginBody = await badLoginRes.json();
  assert.equal(badLoginBody.message, 'Invalid credentials');

  const unknownUserRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `${username}_missing`, password }),
  });
  assert.equal(unknownUserRes.status, 401);
  const unknownUserBody = await unknownUserRes.json();
  assert.equal(unknownUserBody.message, 'Invalid credentials');

  const badRegisterRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'a', password: '123', encryptionSalt: 'not-base64' }),
  });
  assert.equal(badRegisterRes.status, 400);
  const badRegisterBody = await badRegisterRes.json();
  assert.equal(badRegisterBody.error, 'Invalid request body');
  assert.ok(Array.isArray(badRegisterBody.details));

  const unauthNotesRes = await fetch(`${baseUrl}/notes`);
  assert.equal(unauthNotesRes.status, 401);

  const createNoteRes = await fetch(`${baseUrl}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginBody.token}`,
    },
    body: JSON.stringify({
      content: 'ZW5jcnlwdGVkX25vdGVfY29udGVudA==',
      iv: 'dGVzdF9pdl8xMjM0',
    }),
  });
  assert.equal(createNoteRes.status, 201);

  const badNoteRes = await fetch(`${baseUrl}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginBody.token}`,
    },
    body: JSON.stringify({ content: 'bad', iv: 'also_bad' }),
  });
  assert.equal(badNoteRes.status, 400);
  const badNoteBody = await badNoteRes.json();
  assert.equal(badNoteBody.error, 'Invalid request body');

  const getNotesRes = await fetch(`${baseUrl}/notes`, {
    headers: { Authorization: `Bearer ${loginBody.token}` },
  });
  assert.equal(getNotesRes.status, 200);

  const getNotesBody = await getNotesRes.json();
  assert.ok(Array.isArray(getNotesBody.notes));
  assert.ok(getNotesBody.notes.length >= 1);
  assert.equal(getNotesBody.notes[0].content, 'ZW5jcnlwdGVkX25vdGVfY29udGVudA==');
  assert.equal(getNotesBody.notes[0].iv, 'dGVzdF9pdl8xMjM0');
});

test('users cannot edit or delete notes owned by other users', async () => {
  const userA = `owner_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const userB = `attacker_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const password = 'pass12345';
  const encryptionSalt = 'Y3Jvc3NfdXNlcl9zYWx0X3Rlc3Q=';

  const register = async (username) => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, encryptionSalt }),
    });
    assert.equal(res.status, 201);
  };

  const login = async (username) => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    assert.equal(res.status, 200);
    return res.json();
  };

  await register(userA);
  await register(userB);

  const loginA = await login(userA);
  const loginB = await login(userB);

  const ownerCreateRes = await fetch(`${baseUrl}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginA.token}`,
    },
    body: JSON.stringify({
      content: 'b3duZXJfbm90ZV9jb250ZW50',
      iv: 'b3duZXJfaXY=',
    }),
  });
  assert.equal(ownerCreateRes.status, 201);

  const ownerNotesRes = await fetch(`${baseUrl}/notes`, {
    headers: { Authorization: `Bearer ${loginA.token}` },
  });
  assert.equal(ownerNotesRes.status, 200);
  const ownerNotesBody = await ownerNotesRes.json();
  const ownerNoteId = ownerNotesBody.notes[0].id;
  assert.ok(ownerNoteId > 0);

  const attackerReadRes = await fetch(`${baseUrl}/notes`, {
    headers: { Authorization: `Bearer ${loginB.token}` },
  });
  assert.equal(attackerReadRes.status, 200);
  const attackerReadBody = await attackerReadRes.json();
  assert.ok(attackerReadBody.notes.every((n) => n.id !== ownerNoteId));

  const attackerUpdateRes = await fetch(`${baseUrl}/notes/${ownerNoteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loginB.token}`,
    },
    body: JSON.stringify({
      content: 'YXR0YWNrZXJfdXBkYXRlZA==',
      iv: 'YXR0YWNrZXJfaXY=',
    }),
  });
  assert.equal(attackerUpdateRes.status, 404);

  const attackerDeleteRes = await fetch(`${baseUrl}/notes/${ownerNoteId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${loginB.token}`,
    },
  });
  assert.equal(attackerDeleteRes.status, 404);

  const ownerVerifyRes = await fetch(`${baseUrl}/notes`, {
    headers: { Authorization: `Bearer ${loginA.token}` },
  });
  assert.equal(ownerVerifyRes.status, 200);
  const ownerVerifyBody = await ownerVerifyRes.json();
  const ownerNote = ownerVerifyBody.notes.find((n) => n.id === ownerNoteId);
  assert.ok(ownerNote);
  assert.equal(ownerNote.content, 'b3duZXJfbm90ZV9jb250ZW50');
});
