'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { createAppServer } = require('../server');

let app;
let baseUrl;
let cookie;

before(async () => {
  app = createAppServer({ dbPath: ':memory:', staticRoot: path.join(__dirname, '..') });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${app.server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => app.server.close(error => error ? reject(error) : resolve()));
  app.close();
});

test('serves the dashboard and creates a persistent anonymous profile', async () => {
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);

  const response = await fetch(`${baseUrl}/api/state`);
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  cookie = setCookie.split(';')[0];

  const state = await response.json();
  assert.equal(state.profile.name, 'Vidit Jain');
  assert.equal(state.tasks.length, 8);

  state.profile.name = 'Saved Student';
  const saved = await fetch(`${baseUrl}/api/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(state)
  });
  assert.equal(saved.status, 200);

  const loaded = await fetch(`${baseUrl}/api/state`, { headers: { Cookie: cookie } });
  assert.equal((await loaded.json()).profile.name, 'Saved Student');
});

test('only serves public dashboard files, not backend or database files', async () => {
  const [script, serverSource, testSource, databaseDirectory] = await Promise.all([
    fetch(`${baseUrl}/script.js`),
    fetch(`${baseUrl}/server.js`),
    fetch(`${baseUrl}/test/server.test.js`),
    fetch(`${baseUrl}/data/`)
  ]);
  assert.equal(script.status, 200);
  assert.equal(serverSource.status, 404);
  assert.equal(testSource.status, 404);
  assert.equal(databaseDirectory.status, 404);
});

test('rejects invalid profile data without overwriting saved state', async () => {
  const invalidState = await (await fetch(`${baseUrl}/api/state`, { headers: { Cookie: cookie } })).json();
  invalidState.profile.cgpa = 12;

  const response = await fetch(`${baseUrl}/api/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(invalidState)
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /CGPA/);

  const saved = await (await fetch(`${baseUrl}/api/state`, { headers: { Cookie: cookie } })).json();
  assert.equal(saved.profile.cgpa, 8.2);
});

test('accepts a new study task with each selectable category and persists it', async () => {
  const state = await (await fetch(`${baseUrl}/api/state`, { headers: { Cookie: cookie } })).json();
  state.tasks.push({
    id: Date.now(),
    title: 'Build a portfolio project',
    category: 'Project',
    detail: 'Added by you · No duration set',
    done: false
  });

  const response = await fetch(`${baseUrl}/api/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(state)
  });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.tasks.at(-1).title, 'Build a portfolio project');
  assert.equal(saved.tasks.at(-1).category, 'Project');
});

test('rejects malformed, oversized, and unsupported API requests', async () => {
  const malformed = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: '{'
  });
  assert.equal(malformed.status, 400);

  const oversized = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ question: 'x'.repeat(70 * 1024) })
  });
  assert.equal(oversized.status, 413);

  const unsupported = await fetch(`${baseUrl}/api/chat`, { headers: { Cookie: cookie } });
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get('allow'), 'POST');
});

test('returns rule-based study buddy replies and validates questions', async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ question: 'Explain SQL joins' })
  });
  assert.equal(response.status, 200);
  assert.match((await response.json()).reply, /INNER JOIN/);

  const invalid = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ question: '' })
  });
  assert.equal(invalid.status, 400);
});

test('isolates state between browser sessions', async () => {
  const response = await fetch(`${baseUrl}/api/state`);
  const anotherCookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await response.json()).profile.name, 'Vidit Jain');
  assert.notEqual(anotherCookie, cookie);
});
