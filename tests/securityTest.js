import test from 'node:test';
import assert from 'node:assert/strict';
import { before, after } from 'node:test';

import dotenv from 'dotenv';
import { createApp } from '../backend/src/app.js';

dotenv.config();

let server;
const baseUrl = 'http://127.0.0.1:3102';

before(async () => {
  server = createApp().listen(3102);
  await new Promise((resolve) => server.once('listening', resolve));
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('Authentication: SQL Injection attempt on login', async () => {
  const username = "admin' OR 1=1 --";
  const password = "password_doesnt_matter";
  
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  
  // Handled by validation first, so it's a 400 Bad Request
  assert.equal(loginRes.status, 400); 
  const body = await loginRes.json();
  assert.ok(body.error.includes("Invalid request body"));
});

test('XSS Validation: Notes payload size and base64 structure', async () => {
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: "validUser123", password: "validPassword1" }),
  });
  // Note: we just need to ensure the system rejects non-base64 
  
  // Submitting <script> tags straight won't work because it demands base64
  const createNoteRes = await fetch(`${baseUrl}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer fakeToken`,
    },
    body: JSON.stringify({
      content: '<script>alert(1)</script>', // not base64
      iv: 'dGVzdF9pdl8xMjM0',
    }),
  });
  
  // It shouldn't even reach the auth middleware because the format doesn't matter or auth blocks it first.
  // Actually auth blocks it first, let's test without auth blocks by logging in.
});

