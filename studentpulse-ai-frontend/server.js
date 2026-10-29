'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const DEFAULT_DB_PATH = path.join(ROOT, 'data', 'studentpulse.sqlite');
const SESSION_COOKIE = 'studentpulse_session';
const MAX_BODY_BYTES = 64 * 1024;
const STATIC_FILES = new Set(['/index.html', '/style.css', '/script.js']);
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const initialState = {
  profile: {
    name: 'Vidit Jain',
    course: 'MCA Student',
    cgpa: 8.2,
    career: 'Full-stack developer',
    interests: 'Java, DSA, web development'
  },
  skills: [
    { name: 'Programming', key: 'Programming', score: 76, level: 'Intermediate' },
    { name: 'Data Structures & Algorithms', key: 'DSA', score: 52, level: 'Intermediate' },
    { name: 'Web Development', key: 'Web Development', score: 68, level: 'Intermediate' },
    { name: 'Database & SQL', key: 'SQL', score: 61, level: 'Intermediate' },
    { name: 'Communication', key: 'Communication', score: 83, level: 'Advanced' }
  ],
  tasks: [
    { id: 1, title: 'Revise arrays and strings', category: 'Learning', detail: '30 min · DSA fundamentals', done: true },
    { id: 2, title: 'Solve 3 beginner DSA problems', category: 'Practice', detail: '45 min · Problem solving', done: true },
    { id: 3, title: 'Review SQL joins', category: 'Learning', detail: '30 min · Database basics', done: true },
    { id: 4, title: 'Build a responsive project section', category: 'Project', detail: '60 min · Portfolio project', done: false },
    { id: 5, title: 'Practice JavaScript functions', category: 'Learning', detail: '45 min · Web development', done: false },
    { id: 6, title: 'Explain one project aloud', category: 'Interview prep', detail: '20 min · Communication', done: false },
    { id: 7, title: 'Solve 2 SQL query exercises', category: 'Practice', detail: '30 min · Database basics', done: false },
    { id: 8, title: 'Write project README notes', category: 'Project', detail: '25 min · Portfolio project', done: false }
  ],
  hours: 6.5
};

const skillKeys = new Set(['Programming', 'DSA', 'Web Development', 'SQL', 'Communication']);
const taskCategories = new Set(['Learning', 'Practice', 'Project', 'Interview prep']);
const levels = new Set(['Beginner', 'Intermediate', 'Advanced']);
const allowedCourses = new Set(['MCA Student', 'B.Sc Student', 'B.Tech Student', 'BCA Student', 'Other']);
const allowedCareers = new Set([
  'Full-stack developer',
  'Data analyst',
  'Software engineer',
  'AI/ML engineer',
  'Cybersecurity analyst'
]);

function createDatabase(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new DatabaseSync(dbPath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS student_state (
      session_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  return database;
}

function invalidRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function normalizeState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalidRequest('Request body must be a state object.');
  }
  const { profile, skills, tasks, hours } = value;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw invalidRequest('Profile is required.');
  }

  const name = typeof profile.name === 'string' ? profile.name.trim() : '';
  const course = profile.course;
  const career = profile.career;
  const interests = typeof profile.interests === 'string' ? profile.interests.trim() : '';
  const cgpa = profile.cgpa;
  if (!name || name.length > 80) throw invalidRequest('Name must be between 1 and 80 characters.');
  if (!allowedCourses.has(course)) throw invalidRequest('Choose a valid course.');
  if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) throw invalidRequest('CGPA must be between 0 and 10.');
  if (!allowedCareers.has(career)) throw invalidRequest('Choose a valid career goal.');
  if (interests.length > 500) throw invalidRequest('Learning interests cannot exceed 500 characters.');

  if (!Array.isArray(skills) || skills.length !== skillKeys.size) {
    throw invalidRequest('All five skill assessments are required.');
  }
  const normalizedSkills = skills.map(skill => {
    if (!skill || typeof skill !== 'object' || !skillKeys.has(skill.key) || !levels.has(skill.level)) {
      throw invalidRequest('A skill assessment is invalid.');
    }
    if (!Number.isInteger(skill.score) || skill.score < 0 || skill.score > 100) {
      throw invalidRequest('Skill scores must be between 0 and 100.');
    }
    return {
      name: String(skill.name || '').slice(0, 100),
      key: skill.key,
      score: skill.score,
      level: skill.level
    };
  });
  if (new Set(normalizedSkills.map(skill => skill.key)).size !== skillKeys.size) {
    throw invalidRequest('Skill assessments must not contain duplicates.');
  }

  if (!Array.isArray(tasks) || tasks.length > 100) throw invalidRequest('A study plan can contain at most 100 tasks.');
  const taskIds = new Set();
  const normalizedTasks = tasks.map(task => {
    if (!task || typeof task !== 'object' || !Number.isSafeInteger(task.id) || task.id < 1 || taskIds.has(task.id)) {
      throw invalidRequest('Every task must have a unique positive integer ID.');
    }
    if (typeof task.title !== 'string' || !task.title.trim() || task.title.trim().length > 100) {
      throw invalidRequest('Task titles must be between 1 and 100 characters.');
    }
    if (!taskCategories.has(task.category)) throw invalidRequest('Choose a valid task category.');
    if (typeof task.detail !== 'string' || task.detail.length > 200 || typeof task.done !== 'boolean') {
      throw invalidRequest('Task details or completion state are invalid.');
    }
    taskIds.add(task.id);
    return { id: task.id, title: task.title.trim(), category: task.category, detail: task.detail, done: task.done };
  });

  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0 || hours > 168) {
    throw invalidRequest('Study hours must be between 0 and 168.');
  }

  return {
    profile: { name, course, cgpa, career, interests },
    skills: normalizedSkills,
    tasks: normalizedTasks,
    hours
  };
}

function studyBuddyReply(question) {
  const q = question.toLowerCase();
  if (/data structure|\bdsa\b|array|string|algorithm/.test(q)) {
    return 'A data structure is a way to organise data so it can be used efficiently. Start with arrays and strings, then practise searching and sorting. For each problem: understand the input, write a simple approach, test edge cases, and then consider time and space complexity. This is a sample educational response.';
  }
  if (/sql|database|join/.test(q)) {
    return 'SQL is used to query relational databases. A JOIN combines rows from related tables: INNER JOIN returns matching rows, LEFT JOIN keeps every row from the left table and adds matching right-side data when available. Practise with two small tables and check what happens when a match is missing. This is a sample response.';
  }
  if (/interview|career|placement|resume/.test(q)) {
    return 'Try a weekly routine: practise a few problems, review core concepts, and prepare a concise explanation of one project. For project answers, cover the problem, your contribution, key technical choices, trade-offs, and what you would improve. This is a sample response, not a hiring prediction.';
  }
  if (/study|consistent|plan|focus|time/.test(q)) {
    return 'Choose one clear goal for each session. Work in a focused 25–40 minute block, take a short break, and finish by writing what you learned and what remains confusing. Keep the plan realistic; reviewing progress weekly helps you adjust it. This is a sample response.';
  }
  if (/python|programming|function|variable|loop/.test(q)) {
    return 'When learning programming, start with a small example, trace each step, then change one thing and predict the result. For a function, identify its inputs, the work it performs, and its returned output. Write a tiny test case before expanding the solution. This is a sample response.';
  }
  return 'I can provide sample guidance about programming fundamentals, DSA, SQL, interview preparation, and study planning. Try asking a more specific question, such as “Explain SQL joins” or “How do I practise arrays?” This prototype does not connect to a live AI model.';
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let rejected = false;
    request.setEncoding('utf8');
    request.on('data', chunk => {
      if (rejected) return;
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        rejected = true;
        reject(Object.assign(new Error('Request body is too large.'), { statusCode: 413 }));
        request.resume();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (rejected) return;
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }));
      }
    });
    request.on('error', error => {
      if (!rejected) reject(error);
    });
  });
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function getSessionId(request, response, secureCookies) {
  const cookies = request.headers.cookie || '';
  const existing = cookies.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${SESSION_COOKIE}=`));
  const sessionId = existing && existing.slice(SESSION_COOKIE.length + 1);
  if (sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) return sessionId;

  const newSessionId = randomUUID();
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${newSessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${secureCookies ? '; Secure' : ''}`);
  return newSessionId;
}

function createAppServer(options = {}) {
  const staticRoot = path.resolve(options.staticRoot || ROOT);
  const dbPath = options.dbPath || process.env.STUDENTPULSE_DB_PATH || DEFAULT_DB_PATH;
  const secureCookies = options.secureCookies ?? process.env.COOKIE_SECURE === 'true';
  const database = createDatabase(dbPath);
  const selectState = database.prepare('SELECT state_json FROM student_state WHERE session_id = ?');
  const insertState = database.prepare('INSERT INTO student_state (session_id, state_json, updated_at) VALUES (?, ?, ?)');
  const upsertState = database.prepare(`
    INSERT INTO student_state (session_id, state_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
  `);

  function loadOrCreateState(sessionId) {
    const row = selectState.get(sessionId);
    if (row) return JSON.parse(row.state_json);
    const state = structuredClone(initialState);
    insertState.run(sessionId, JSON.stringify(state), new Date().toISOString());
    return state;
  }

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    if (requestUrl.pathname.startsWith('/api/')) {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { Allow: 'GET, PUT, POST, OPTIONS' }).end();
        return;
      }
      const sessionId = getSessionId(request, response, secureCookies);
      try {
        if (requestUrl.pathname === '/api/state' && request.method !== 'GET' && request.method !== 'PUT') {
          sendJson(response, 405, { error: 'Method not allowed.' }, { Allow: 'GET, PUT' });
          return;
        }
        if (requestUrl.pathname === '/api/chat' && request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
          return;
        }
        if (request.method === 'GET' && requestUrl.pathname === '/api/state') {
          sendJson(response, 200, loadOrCreateState(sessionId));
          return;
        }
        if (request.method === 'PUT' && requestUrl.pathname === '/api/state') {
          const state = normalizeState(await readJsonBody(request));
          upsertState.run(sessionId, JSON.stringify(state), new Date().toISOString());
          sendJson(response, 200, state);
          return;
        }
        if (request.method === 'POST' && requestUrl.pathname === '/api/chat') {
          const body = await readJsonBody(request);
          if (!body || typeof body.question !== 'string' || !body.question.trim() || body.question.trim().length > 500) {
            sendJson(response, 400, { error: 'Question must be between 1 and 500 characters.' });
            return;
          }
          sendJson(response, 200, { reply: studyBuddyReply(body.question.trim()) });
          return;
        }
        sendJson(response, 404, { error: 'API route not found.' });
      } catch (error) {
        const statusCode = error.statusCode || 500;
        sendJson(response, statusCode, { error: statusCode === 500 ? 'The server could not complete the request.' : error.message });
        if (statusCode === 500) console.error(error);
      }
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const decodedPath = decodeURIComponent(requestUrl.pathname);
      const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
      if (!STATIC_FILES.has(requestedPath)) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
      }
      const filePath = path.join(staticRoot, requestedPath.slice(1));
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) throw new Error('Not a file');
      const content = fs.readFileSync(filePath);
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Content-Length': content.length,
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      response.writeHead(error instanceof URIError ? 400 : 404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });

  return {
    server,
    close() {
      database.close();
    }
  };
}

if (require.main === module) {
  const { server } = createAppServer();
  const portValue = process.env.PORT;
  const port = portValue === undefined || portValue.trim() === '' ? 3000 : Number(portValue);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535.');
  }
  const host = process.env.HOST || '127.0.0.1';
  server.listen(port, host, () => {
    const displayHost = host.includes(':') ? `[${host}]` : host;
    console.log(`StudentPulse is running at http://${displayHost}:${port}`);
  });
}

module.exports = { createAppServer, normalizeState, studyBuddyReply };
