
/**
 * Runs local smoke tests against the API, including post and comment
 * operations, with cleanup of test data.
 */
require('dotenv').config();

const dns = require('dns').promises;
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]', '::1'];
const LOCAL_DB_HOSTS = ['localhost', '127.0.0.1', '::1'];
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const BROWSER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

// 16x12 PNG, so the test needs no image file or extra package.
const TEST_IMAGE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAMAAABcOc2zAAAAA1BMVEWvgmbYOhkjAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQI12NgGD4AAADMAAG01/g9AAAAAElFTkSuQmCC', 'base64');

// 16x12 WebP: Sharp's file cache left these input files locked on Windows.
const TEST_WEBP = Buffer.from('UklGRjAAAABXRUJQVlA4ICQAAABwAQCdASoQAAwAAsBMJZACdAFAAAD+wM/XqlrlJvI7CG7JkAA=', 'base64');

// A real GIF, which is not an accepted cover format.
const TEST_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const RUN_MARKER =`[SMOKE TEST ${new Date().toISOString()}]`;
const COMMENT_TEXT = `Smoke test comment ${RUN_MARKER}`;

// For testing the cleanup path only: makes the named check fail on purpose.
const SIMULATE_FAILURE_AT = process.env.SMOKE_SIMULATE_FAILURE_AT || '';

const results = [];

function printResult(ok, label, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

async function check(label, fn) {
  try {
    if (SIMULATE_FAILURE_AT && label.includes(SIMULATE_FAILURE_AT)) {
      throw new Error('simulated failure (SMOKE_SIMULATE_FAILURE_AT)');
    }
    const detail = await fn();
    results.push({ label, ok: true });
    printResult(true, label, detail);
    return true;
  } catch (error) {
    results.push({ label, ok: false });
    printResult(false, label, error.message);
    return false;
  }
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Stops before any request unless the target is this machine (name and every resolved address).
async function assertLocalTarget(url) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`SMOKE_BASE_URL is not a valid address: ${url}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Only http(s) addresses are allowed, got ${parsed.protocol}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('Addresses with a username or password are not allowed.');
  }

  if (!LOCAL_HOSTNAMES.includes(parsed.hostname)) {
    throw new Error(`Refusing to run against "${parsed.hostname}": the smoke test only runs against localhost or 127.0.0.1.`);
  }

  const lookupName = parsed.hostname.replace(/^\[|\]$/g, '');
  const addresses = await dns.lookup(lookupName, { all: true });
  const allLoopback = addresses.every(({ address }) => address === '::1' || address.startsWith('127.'));

  if (!addresses.length || !allLoopback) {
    throw new Error(`"${parsed.hostname}" does not resolve only to this machine (${addresses.map(a => a.address).join(', ')}).`);
  }

  return parsed;
}

// All requests stay on the target: redirects are never followed.
async function request(method, urlPath, { cookie, json, form, accept } = {}) {
  const headers = {};

  if (cookie) headers.Cookie = cookie;
  if (accept) headers.Accept = accept;

  let body;

  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  if (form) {
    body = form;
  }

  const response = await fetch(new URL(urlPath, BASE_URL), { method, headers, body, redirect: 'manual' });
  const text = await response.text();
  let data = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  return { status: response.status, headers: response.headers, text, data };
}

// fetch() can't set Host, so the www redirect check uses http directly.
function requestWithHost(target, host, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: target.hostname.replace(/^\[|\]$/g, ''),
      port: target.port || 80,
      path: urlPath,
      method: 'GET',
      headers: { Host: host },
    }, res => {
      res.resume();
      resolve({ status: res.statusCode, location: res.headers.location });
    });

    req.on('error', reject);
    req.end();
  });
}

async function login(email, password) {
  const response = await request('POST', '/login', { json: { email, password } });

  if (response.status === 429) {
    throw new Error('login is rate-limited (5 attempts per 15 minutes); wait or restart the backend');
  }

  expect(response.status === 200, `login returned ${response.status}`);

  const tokenCookie = response.headers.getSetCookie().find(c => c.startsWith('token='));
  expect(tokenCookie, 'no login cookie returned');

  return { cookie: tokenCookie.split(';')[0], user: response.data };
}

function postForm(fields, image, type = 'image/png') {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    form.set(key, String(value));
  }

  if (image) {
    form.set('file', new Blob([image], { type }), 'smoke-test-image');
  }

  return form;
}

function countFiles(directory) {
  return fs.existsSync(directory) ? fs.readdirSync(directory).length : 0;
}

async function readOnlyChecks(target) {
  console.log('\n— Read-only checks —');

  let firstPost = null;

  await check('Health endpoint reports ok and is not cached', async () => {
    const r = await request('GET', '/health');
    expect(r.status === 200 && r.data?.status === 'ok', `got ${r.status} ${r.text.slice(0, 60)}`);
    expect(r.headers.get('cache-control') === 'no-store', 'missing Cache-Control: no-store');
  });

  await check('Home page loads as HTML', async () => {
    const r = await request('GET', '/', { accept: BROWSER_ACCEPT });
    expect(r.status === 200 && r.headers.get('content-type').includes('text/html') && r.text.includes('id="root"'), `got ${r.status}`);
  });

  await check('Security headers present (CSP, nosniff, HSTS, no framing)', async () => {
    const r = await request('GET', '/', { accept: BROWSER_ACCEPT });
    const csp = r.headers.get('content-security-policy') || '';
    expect(csp.includes("default-src 'self'") && csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"), 'CSP missing or changed');
    expect(r.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options missing');
    expect(r.headers.get('strict-transport-security'), 'Strict-Transport-Security missing');
  });

  await check('Post list has the paginated shape', async () => {
    const r = await request('GET', '/post?page=1&limit=5');
    expect(r.status === 200 && Array.isArray(r.data?.posts), `got ${r.status}`);
    expect(['total', 'page', 'totalPages'].every(k => typeof r.data[k] === 'number'), 'missing total/page/totalPages');
    firstPost = r.data.posts[0] || null;
    return `${r.data.total} posts`;
  });

  await check('Direct post link opens the page; fetch gets JSON (Vary: Accept)', async () => {
    expect(firstPost, 'no posts to check');
    const page = await request('GET', `/post/${firstPost.id}`, { accept: BROWSER_ACCEPT });
    const api = await request('GET', `/post/${firstPost.id}`);
    expect(page.status === 200 && page.headers.get('content-type').includes('text/html') && !page.text.includes('"content"'), 'page load did not return the app');
    expect(/accept/i.test(page.headers.get('vary') || ''), 'missing Vary: Accept');
    expect(api.status === 200 && api.data?.id === firstPost.id, 'JSON request did not return the post');
  });

  await check('Direct category link opens the page; fetch gets the paginated shape', async () => {
    expect(firstPost, 'no posts to check');
    const page = await request('GET', `/category/${encodeURIComponent(firstPost.category)}`, { accept: BROWSER_ACCEPT });
    const api = await request('GET', `/category/${encodeURIComponent(firstPost.category)}`);
    expect(page.headers.get('content-type').includes('text/html'), 'page load did not return the app');
    expect(api.status === 200 && Array.isArray(api.data?.posts) && typeof api.data.totalPages === 'number', 'JSON shape wrong');
  });

  await check('Search: results, no-match (200, empty) and empty term (400)', async () => {
    const term = firstPost ? firstPost.title.split(/\s+/)[0] : 'a';
    const hit = await request('GET', `/search?q=${encodeURIComponent(term)}`);
    const miss = await request('GET', '/search?q=zzqqsmokenomatch');
    const empty = await request('GET', '/search?q=');
    expect(hit.status === 200 && Array.isArray(hit.data?.posts) && typeof hit.data.total === 'number', 'search shape wrong');
    expect(miss.status === 200 && miss.data.total === 0, 'no-match search should be 200 with 0 results');
    expect(empty.status === 400, `empty search should be 400, got ${empty.status}`);
  });

  await check('Unknown page returns the app (for the "Page not found" screen)', async () => {
    const r = await request('GET', '/no-such-page-smoke', { accept: BROWSER_ACCEPT });
    expect(r.status === 200 && r.headers.get('content-type').includes('text/html'), `got ${r.status}`);
  });

  await check('robots.txt is plain text and points to the sitemap', async () => {
    const r = await request('GET', '/robots.txt');
    const isAppPage = r.headers.get('content-type').includes('text/html');
    expect(!isAppPage, 'got the app page instead: client/dist is probably an old build; rebuild it (see the smoke-test notes)');
    expect(r.status === 200 && r.headers.get('content-type').includes('text/plain') && /Sitemap: https?:\/\/\S+\/sitemap\.xml/.test(r.text), `got ${r.status} ${r.headers.get('content-type')}`);
  });

  await check('sitemap.xml is XML and lists every post', async () => {
    const [r, list] = await Promise.all([request('GET', '/sitemap.xml'), request('GET', '/post?limit=1')]);
    const postLocs = (r.text.match(/<loc>[^<]*\/post\/\d+<\/loc>/g) || []).length;
    expect(r.status === 200 && r.headers.get('content-type').includes('application/xml') && r.text.startsWith('<?xml') && r.text.includes('<urlset'), 'not a sitemap');
    expect(postLocs === list.data.total, `${postLocs} post links for ${list.data.total} posts`);
  });

  await check('rss.xml is an RSS feed of the newest posts', async () => {
    const [r, list] = await Promise.all([request('GET', '/rss.xml'), request('GET', '/post?limit=1')]);
    const items = (r.text.match(/<item>/g) || []).length;
    expect(r.status === 200 && r.headers.get('content-type').includes('application/rss+xml') && r.text.includes('<rss version="2.0"'), 'not an RSS feed');
    expect(items === Math.min(20, list.data.total), `${items} items for ${list.data.total} posts`);
  });

  await check('Admin data refuses visitors (401) but the admin pages still open', async () => {
    for (const adminPath of ['/admin/comments', '/admin/activity', '/admin/users']) {
      const data = await request('GET', adminPath);
      const page = await request('GET', adminPath, { accept: BROWSER_ACCEPT });
      expect(data.status === 401, `${adminPath} data returned ${data.status}`);
      expect(page.status === 200 && page.headers.get('content-type').includes('text/html'), `${adminPath} page returned ${page.status}`);
    }
  });

  await check('www. address redirects to the bare domain (301, same path)', async () => {
    const host = `www.${target.host}`;
    const r = await requestWithHost(target, host, '/post/1?x=1');
    expect(r.status === 301 && r.location === `${target.protocol}//${target.host}/post/1?x=1`, `got ${r.status} → ${r.location}`);
  });

  await check('Registration rejects a weak password (no account created)', async () => {
    const r = await request('POST', '/register', { json: { username: 'smoke-weak-pass', email: 'smoke-weak-pass@example.invalid', password: 'weak' } });
    expect(r.status === 400 && /Password must be/.test(r.data?.error || ''), `got ${r.status} ${r.text.slice(0, 80)}`);
  });

  await check('Registration explains an invalid username or email (no account created)', async () => {
    const shortName = await request('POST', '/register', { json: { username: 'abc', email: 'smoke-short@example.invalid', password: 'Valid-pass-1!' } });
    const badEmail = await request('POST', '/register', { json: { username: 'smoke-bad-email', email: 'smoke@localhost', password: 'Valid-pass-1!' } });
    expect(shortName.status === 400 && /between 4 and 255/.test(shortName.data?.error || ''), `username: ${shortName.status} ${shortName.text.slice(0, 80)}`);
    expect(badEmail.status === 400 && /valid email/.test(badEmail.data?.error || ''), `email: ${badEmail.status} ${badEmail.text.slice(0, 80)}`);
  });

  await check('Login with a wrong password is refused', async () => {
    const r = await request('POST', '/login', { json: { email: 'smoke-nobody@example.invalid', password: 'Wrong-password-1' } });
    expect(r.status === 400 || r.status === 429, `got ${r.status}`);
    return r.status === 429 ? 'rate-limited (still refused)' : 'refused';
  });

  await check('Forgot password gives one answer; bad reset requests are refused', async () => {
    const unknown = await request('POST', '/forgot-password', { json: { email: 'smoke-nobody@example.invalid' } });
    const missing = await request('POST', '/forgot-password', { json: {} });
    const nonString = await request('POST', '/forgot-password', { json: { email: 123 } });
    const fakeToken = await request('POST', '/reset-password', { json: { token: 'not-a-real-token', newPassword: 'Valid-pass-1!' } });
    const weak = await request('POST', '/reset-password', { json: { token: 'not-a-real-token', newPassword: 'weak' } });
    const nonStringToken = await request('POST', '/reset-password', { json: { token: 123, newPassword: 'Valid-pass-1!' } });
    expect(unknown.status === 200 && /If that email is registered/.test(unknown.data?.message || ''), `unknown email: ${unknown.status}`);
    expect([missing, nonString, nonStringToken, weak].every(r => r.status === 400), 'a bad request was not refused');
    expect(fakeToken.status === 400 && /invalid or has expired/.test(fakeToken.data?.error || ''), `fake token: ${fakeToken.status}`);
  });

  await check('Unexpected input types are refused and the server keeps running', async () => {
    const attempts = [
      ['GET', '/search?q=a&q=b'],
      ['GET', '/search?q[x]=1'],
      ['GET', '/post?category=a&category=b'],
      ['GET', '/post?category[x]=1'],
      ['POST', '/login', { email: 123, password: 'x' }],
      ['POST', '/login', { email: 'smoke-nobody@example.invalid', password: ['x'] }],
      ['POST', '/register', { username: 'smoke-types', email: 123, password: 'Valid-pass-1!' }],
      ['POST', '/register', { username: 123, email: 'smoke-types@example.invalid', password: 'Valid-pass-1!' }],
    ];

    for (const [method, urlPath, json] of attempts) {
      const r = await request(method, urlPath, { json });
      expect(r.status === 400 || r.status === 429, `${method} ${urlPath}: got ${r.status}`);
      expect(typeof r.data?.error === 'string', `${method} ${urlPath}: no { error } response`);
    }

    const health = await request('GET', '/health');
    expect(health.status === 200, 'server is not healthy after the refused requests');
    return `${attempts.length} refused`;
  });
}

// Confirms the server answers from the same local database this script can read.
async function verifyLocalDatabase(adminCookie, models) {
  const { Post, Comment, AuditLog, sequelize } = models;
  const dbHost = process.env.DB_HOST;
  const dbName = process.env.DB_NAME;
  const expectedName = process.env.SMOKE_EXPECTED_DB_NAME;

  expect(process.env.NODE_ENV !== 'production', 'NODE_ENV is production');
  expect(LOCAL_DB_HOSTS.includes(dbHost), `DB_HOST "${dbHost}" is not local`);
  expect(expectedName, 'SMOKE_EXPECTED_DB_NAME is not set');
  expect(dbName === expectedName, `DB_NAME "${dbName}" is not the expected "${expectedName}"`);

  const [[{ currentDb }]] = await sequelize.query('SELECT DATABASE() AS currentDb', { logging: false });
  expect(currentDb === expectedName, `this script is connected to "${currentDb}", not "${expectedName}"`);

  const dbPosts = await Post.findAll({ attributes: ['id', 'title', 'updatedAt'], order: [['createdAt', 'DESC']], limit: 5, raw: true });
  const dbPostCount = await Post.count();
  expect(dbPostCount > 0, 'the database has no posts, so the server cannot be matched to it');

  const apiPosts = await request('GET', '/post?page=1&limit=5');
  const sameList = apiPosts.data.total === dbPostCount
    && apiPosts.data.posts.length === dbPosts.length
    && apiPosts.data.posts.every((p, i) => p.id === dbPosts[i].id && p.title === dbPosts[i].title && new Date(p.updatedAt).getTime() === new Date(dbPosts[i].updatedAt).getTime());
  expect(sameList, 'the server\'s posts do not match the expected database');

  const [apiComments, apiActivity] = await Promise.all([
    request('GET', '/admin/comments?limit=1', { cookie: adminCookie }),
    request('GET', '/admin/activity?limit=1', { cookie: adminCookie }),
  ]);
  expect(apiComments.data?.total === await Comment.count(), 'the server\'s comment total does not match the expected database');
  expect(apiActivity.data?.total === await AuditLog.count(), 'the server\'s activity total does not match the expected database');

  return `server and script both use "${expectedName}" on ${dbHost}`;
}

async function writeChecks(models) {
  console.log('\n— Write checks (local database) —');

  const { Post, Comment, User } = models;
  const required = ['SMOKE_ADMIN_EMAIL', 'SMOKE_ADMIN_PASSWORD', 'SMOKE_USER_EMAIL', 'SMOKE_USER_PASSWORD', 'SMOKE_EXPECTED_DB_NAME'];
  const missing = required.filter(name => !process.env[name]);

  if (missing.length) {
    await check('Write-check settings present in .env', () => { throw new Error(`missing ${missing.join(', ')}; write checks skipped`); });
    return;
  }

  const state = { admin: null, user: null, postId: null, coverPath: null, userCommentId: null, adminCommentId: null };
  const baseline = {};

  // Each write step depends on the previous one: stop at the first failure, then clean up.
  const steps = [
    ['Admin logs in (role admin)', async () => {
      state.admin = await login(process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD);
      const profile = await request('GET', '/profile', { cookie: state.admin.cookie });
      expect(profile.data?.role === 'admin', `account role is "${profile.data?.role}"`);
      return `@${profile.data.username}`;
    }],
    ['Normal user logs in (role user)', async () => {
      state.user = await login(process.env.SMOKE_USER_EMAIL, process.env.SMOKE_USER_PASSWORD);
      const profile = await request('GET', '/profile', { cookie: state.user.cookie });
      expect(profile.data?.role === 'user', `account role is "${profile.data?.role}"`);
      return `@${profile.data.username}`;
    }],
    ['Server is using the expected local database (required before any write)', async () => verifyLocalDatabase(state.admin.cookie, models)],
    ['Record starting counts', async () => {
      baseline.posts = await Post.count();
      baseline.comments = await Comment.count();
      baseline.users = await User.count();
      baseline.uploads = countFiles(UPLOADS_DIR);
      baseline.temp = countFiles(TEMP_DIR);
      return `${baseline.posts} posts, ${baseline.comments} comments, ${baseline.users} users, ${baseline.uploads} upload files, ${baseline.temp} temp files`;
    }],
    ['Permissions: guest and normal user cannot create posts or read admin data', async () => {
      const guestPost = await request('POST', '/post', { form: postForm({ title: 'x', summary: 'x', content: 'x', category: 'grief' }, TEST_IMAGE) });
      const userPost = await request('POST', '/post', { cookie: state.user.cookie, form: postForm({ title: 'x', summary: 'x', content: 'x', category: 'grief' }, TEST_IMAGE) });
      const userComments = await request('GET', '/admin/comments', { cookie: state.user.cookie });
      const userActivity = await request('GET', '/admin/activity', { cookie: state.user.cookie });
      expect(guestPost.status === 401, `guest create post: ${guestPost.status}`);
      expect(userPost.status === 403, `user create post: ${userPost.status}`);
      expect(userComments.status === 403 && userActivity.status === 403, `user admin data: ${userComments.status}/${userActivity.status}`);
      expect(await Post.count() === baseline.posts, 'a refused request still created a post');
    }],
    // Refusals only: a successful change is never tried here, so a run can't lock an account.
    ['Password change refusals (no change made)', async () => {
      const userRecord = await User.findOne({ where: { email: process.env.SMOKE_USER_EMAIL.trim().toLowerCase() }, raw: true });
      const guest = await request('PUT', '/account/password', { json: { currentPassword: 'x', newPassword: 'Valid-pass-1' } });
      const attempts = [
        ['missing new password', { currentPassword: process.env.SMOKE_USER_PASSWORD }, /required/],
        ['weak new password', { currentPassword: process.env.SMOKE_USER_PASSWORD, newPassword: 'weakpass' }, /at least 8 characters/],
        ['same as current', { currentPassword: process.env.SMOKE_USER_PASSWORD, newPassword: process.env.SMOKE_USER_PASSWORD }, /different/],
        ['wrong current password', { currentPassword: 'Wrong-current-1', newPassword: 'Smoke-new-pass-1!' }, /incorrect/],
      ];
      expect(guest.status === 401, `logged out: ${guest.status}`);
      const outcomes = [];
      for (const [name, body, message] of attempts) {
        const r = await request('PUT', '/account/password', { cookie: state.user.cookie, json: body });
        expect((r.status === 400 && message.test(r.data?.error || '')) || r.status === 429, `${name}: ${r.status} ${r.data?.error}`);
        outcomes.push(r.status === 429 ? `${name} (rate-limited)` : name);
      }
      const after = await User.findByPk(userRecord.id, { raw: true });
      expect(after.password === userRecord.password && after.tokenVersion === userRecord.tokenVersion, 'the password or session version changed');
      const profile = await request('GET', '/profile', { cookie: state.user.cookie });
      expect(profile.status === 200, 'the user was logged out by a refused change');
      return `refused: ${outcomes.join(', ')}`;
    }],
    // Refusals only: real deletions are never tried here, so a run can't remove a real account.
    ['Account and user management refusals (nothing changed)', async () => {
      const admin = state.admin.user;
      const user = state.user.user;
      const guestDelete = await request('DELETE', '/account', { json: { password: 'x' } });
      const guestList = await request('GET', '/admin/users');
      const userList = await request('GET', '/admin/users', { cookie: state.user.cookie });
      const userPromote = await request('PATCH', `/admin/users/${user.id}/role`, { cookie: state.user.cookie, json: { role: 'admin' } });
      const userRemove = await request('DELETE', `/admin/users/${admin.id}`, { cookie: state.user.cookie });
      const wrongPassword = await request('DELETE', '/account', { cookie: state.user.cookie, json: { password: 'Wrong-current-1' } });
      const adminSelfDelete = await request('DELETE', '/account', { cookie: state.admin.cookie, json: { password: process.env.SMOKE_ADMIN_PASSWORD } });
      const adminRemovesAdmin = await request('DELETE', `/admin/users/${admin.id}`, { cookie: state.admin.cookie });
      const badRole = await request('PATCH', `/admin/users/${user.id}/role`, { cookie: state.admin.cookie, json: { role: 'owner' } });
      const ownRole = await request('PATCH', `/admin/users/${admin.id}/role`, { cookie: state.admin.cookie, json: { role: 'user' } });
      const statuses = [guestDelete, guestList, userList, userPromote, userRemove, wrongPassword, adminSelfDelete, adminRemovesAdmin, badRole, ownRole].map(r => r.status);
      expect(JSON.stringify(statuses) === JSON.stringify([401, 401, 403, 403, 403, 400, 403, 403, 400, 403]), `got ${statuses.join('/')}`);
      expect(await User.count() === baseline.users, 'a refused request removed an account');
      expect((await User.findByPk(user.id, { raw: true })).role === 'user', 'a refused request changed a role');
      expect((await User.findByPk(admin.id, { raw: true })).role === 'admin', 'a refused request changed the admin\'s role');
    }],
    ['Admin user list has no password data and the page opens', async () => {
      const r = await request('GET', '/admin/users?limit=100', { cookie: state.admin.cookie });
      const page = await request('GET', '/admin/users', { accept: BROWSER_ACCEPT });
      expect(r.status === 200 && r.data.total === baseline.users, `got ${r.status}, total ${r.data?.total}`);
      expect(r.headers.get('cache-control') === 'no-store', 'missing Cache-Control: no-store');
      expect(!/password|tokenVersion|\$2[aby]\$/.test(r.text), 'password data in the response');
      expect(page.status === 200 && page.headers.get('content-type').includes('text/html'), 'page load did not return the app');
    }],
    ['Admin creates a test post with a cover image', async () => {
      const r = await request('POST', '/post', {
        cookie: state.admin.cookie,
        form: postForm({ title: `${RUN_MARKER} post`, summary: 'Temporary smoke-test post', content: '<p>Temporary smoke-test post.</p>', category: 'reflections' }, TEST_IMAGE),
      });
      expect(r.status === 201 && r.data?.id, `got ${r.status} ${r.text.slice(0, 80)}`);
      state.postId = r.data.id;
      state.coverPath = path.join(__dirname, '..', r.data.cover);
      expect(fs.existsSync(state.coverPath), 'cover image file was not saved');
      return `post #${state.postId}`;
    }],
    ['Invalid images are refused with a clear 400; the cover is unchanged', async () => {
      const fields = { title: 'x', summary: 'x', content: '<p>x</p>', category: 'reflections' };
      const invalid = [
        ['GIF sent as JPEG', TEST_GIF, 'image/jpeg'],
        ['text sent as PNG', Buffer.from('not an image'), 'image/png'],
        ['truncated PNG', TEST_IMAGE.subarray(0, 40), 'image/png'],
      ];

      for (const [name, image, type] of invalid) {
        const created = await request('POST', '/post', { cookie: state.admin.cookie, form: postForm(fields, image, type) });
        const edited = await request('PUT', '/post', { cookie: state.admin.cookie, form: postForm({ ...fields, id: state.postId }, image, type) });

        for (const r of [created, edited]) {
          expect(r.status === 400 && /Unsupported image format/.test(r.data?.error || ''), `${name}: ${r.status} ${r.text.slice(0, 80)}`);
        }
      }

      const post = await request('GET', `/post/${state.postId}`);
      expect(path.join(__dirname, '..', post.data.cover) === state.coverPath && fs.existsSync(state.coverPath), 'cover changed or disappeared');
      expect(post.data.title.startsWith(RUN_MARKER), 'a refused request changed the post');
      expect(await Post.count() === baseline.posts + 1, 'a refused request created a post');
    }],
    ['The new post is public and listed in the sitemap and RSS', async () => {
      const r = await request('GET', `/post/${state.postId}`);
      const [sitemap, rss] = await Promise.all([request('GET', '/sitemap.xml'), request('GET', '/rss.xml')]);
      expect(r.status === 200 && r.data.title === `${RUN_MARKER} post`, `post page data: ${r.status}`);
      expect(sitemap.text.includes(`/post/${state.postId}</loc>`), 'missing from sitemap');
      expect(rss.text.includes(`/post/${state.postId}</link>`), 'missing from RSS');
    }],
    ['Admin edits the post without changing the image', async () => {
      const form = postForm({ id: state.postId, title: `${RUN_MARKER} post (edited)`, summary: 'Temporary smoke-test post', content: '<p>Edited.</p>', category: 'reflections' }, false);
      const r = await request('PUT', '/post', { cookie: state.admin.cookie, form });
      expect(r.status === 200 && r.data.title.endsWith('(edited)'), `got ${r.status}`);
      expect(path.join(__dirname, '..', r.data.cover) === state.coverPath && fs.existsSync(state.coverPath), 'cover changed or disappeared');
    }],
    ['Admin replaces the cover with a WebP image; the old image and temp file are removed', async () => {
      const form = postForm({ id: state.postId, title: `${RUN_MARKER} post (edited)`, summary: 'Temporary smoke-test post', content: '<p>Edited.</p>', category: 'reflections' }, TEST_WEBP, 'image/webp');
      const r = await request('PUT', '/post', { cookie: state.admin.cookie, form });
      expect(r.status === 200 && r.data.cover.endsWith('.webp'), `got ${r.status} ${r.text.slice(0, 80)}`);
      const newCoverPath = path.join(__dirname, '..', r.data.cover);
      expect(fs.existsSync(newCoverPath), 'the new cover was not saved');
      expect(!fs.existsSync(state.coverPath), 'the old cover is still on disk');
      state.coverPath = newCoverPath;
      expect(countFiles(TEMP_DIR) === baseline.temp, 'the raw upload was left in temp/');
    }],
    ['Normal user comments; "&" and "<" are stored safely', async () => {
      const r = await request('POST', '/comment', { cookie: state.user.cookie, json: { postId: state.postId, content: `${COMMENT_TEXT} & 5 < 6` } });
      expect(r.status === 201, `got ${r.status} ${r.text.slice(0, 80)}`);
      state.userCommentId = r.data.id;
      expect(r.data.content === `${COMMENT_TEXT} &amp; 5 &lt; 6`, `stored as ${JSON.stringify(r.data.content)}`);
    }],
    ['Non-string comment content is refused and the server keeps running', async () => {
      const create = await request('POST', '/comment', { cookie: state.user.cookie, json: { postId: state.postId, content: 123 } });
      const edit = await request('PUT', `/comment/${state.userCommentId}`, { cookie: state.user.cookie, json: { content: 123 } });
      expect(create.status === 400 && edit.status === 400, `got ${create.status}/${edit.status}`);
      expect((await request('GET', '/health')).status === 200, 'server is not healthy');
    }],
    ['Comments of only markup are refused; the saved comment is unchanged', async () => {
      const before = await Comment.count();

      for (const content of ['<b></b>', '<script>alert(1)</script>']) {
        const create = await request('POST', '/comment', { cookie: state.user.cookie, json: { postId: state.postId, content } });
        const edit = await request('PUT', `/comment/${state.userCommentId}`, { cookie: state.user.cookie, json: { content } });
        expect(create.status === 400 && edit.status === 400 && /empty/.test(edit.data?.error || ''), `${content}: ${create.status}/${edit.status}`);
      }

      const saved = await Comment.findByPk(state.userCommentId, { raw: true });
      expect(await Comment.count() === before, 'a blank comment was saved');
      expect(saved.content.includes('&amp; 5 &lt; 6'), 'the existing comment was changed');
    }],
    ['Comments over 5,000 characters are refused; exactly 5,000 "&" characters saves in full', async () => {
      const tooLong = 'x'.repeat(5001);
      const create = await request('POST', '/comment', { cookie: state.user.cookie, json: { postId: state.postId, content: tooLong } });
      const edit = await request('PUT', `/comment/${state.userCommentId}`, { cookie: state.user.cookie, json: { content: tooLong } });
      expect(create.status === 400 && edit.status === 400 && /5000 characters/.test(edit.data?.error || ''), `over the limit: ${create.status}/${edit.status}`);

      const atLimit = await request('PUT', `/comment/${state.userCommentId}`, { cookie: state.user.cookie, json: { content: '&'.repeat(5000) } });
      expect(atLimit.status === 200, `at the limit: ${atLimit.status}`);
      expect(atLimit.data.content === '&amp;'.repeat(5000), 'the comment was not stored in full');
    }],
    ['Normal user edits their own comment', async () => {
      const r = await request('PUT', `/comment/${state.userCommentId}`, { cookie: state.user.cookie, json: { content: `${COMMENT_TEXT} (edited by owner)` } });
      expect(r.status === 200, `got ${r.status}`);
    }],
    ['Admin adds their own comment', async () => {
      const r = await request('POST', '/comment', { cookie: state.admin.cookie, json: { postId: state.postId, content: `${COMMENT_TEXT} (admin's own)` } });
      expect(r.status === 201, `got ${r.status}`);
      state.adminCommentId = r.data.id;
    }],
    ['Permissions: user cannot edit/delete the post or another person\'s comment; guest cannot comment', async () => {
      const userEditPost = await request('PUT', '/post', { cookie: state.user.cookie, form: postForm({ id: state.postId, title: 'hijack', summary: 'x', content: 'x', category: 'grief' }, false) });
      const userDeletePost = await request('DELETE', `/post/${state.postId}`, { cookie: state.user.cookie });
      const userEditOther = await request('PUT', `/comment/${state.adminCommentId}`, { cookie: state.user.cookie, json: { content: 'hijack' } });
      const userDeleteOther = await request('DELETE', `/comment/${state.adminCommentId}`, { cookie: state.user.cookie });
      const guestComment = await request('POST', '/comment', { json: { postId: state.postId, content: 'guest' } });
      const statuses = [userEditPost.status, userDeletePost.status, userEditOther.status, userDeleteOther.status, guestComment.status];
      expect(JSON.stringify(statuses) === JSON.stringify([403, 403, 403, 403, 401]), `got ${statuses.join('/')}`);
      const post = await request('GET', `/post/${state.postId}`);
      expect(post.data.title.endsWith('(edited)'), 'post was changed by a refused request');
    }],
    ['Admin deletes the user\'s comment and their own comment', async () => {
      const other = await request('DELETE', `/comment/${state.userCommentId}`, { cookie: state.admin.cookie });
      const own = await request('DELETE', `/comment/${state.adminCommentId}`, { cookie: state.admin.cookie });
      expect(other.status === 200 && own.status === 200, `got ${other.status}/${own.status}`);
      const remaining = await request('GET', `/comments/${state.postId}`);
      expect(remaining.data.length === 0, `${remaining.data.length} comments left`);
    }],
    ['Admin deletes the post; cover image removed; post gone', async () => {
      const r = await request('DELETE', `/post/${state.postId}`, { cookie: state.admin.cookie });
      expect(r.status === 200, `got ${r.status}`);
      const gone = await request('GET', `/post/${state.postId}`);
      expect(gone.status === 404, `post still returns ${gone.status}`);
      expect(!fs.existsSync(state.coverPath), 'cover image file still on disk');
      state.postId = null;
    }],
    ['Activity log recorded exactly the admin actions, with no comment text', async () => {
      const r = await request('GET', '/admin/activity?limit=100', { cookie: state.admin.cookie });
      const entries = r.data.entries.filter(e => (e.targetLabel || '').includes(RUN_MARKER));
      const actions = entries.map(e => e.action).reverse();
      expect(JSON.stringify(actions) === JSON.stringify(['post.create', 'post.update', 'post.update', 'comment.delete', 'post.delete']), `got ${actions.join(', ')}`);
      expect(entries.every(e => e.actorUsername === state.admin.user.username), 'wrong admin recorded');
      expect(!JSON.stringify(r.data).includes('Smoke test comment'), 'comment text found in the activity log');
      return `${entries.length} entries`;
    }],
  ];

  try {
    for (const [label, fn] of steps) {
      const ok = await check(label, fn);
      if (!ok) {
        console.log('      Stopping write checks after this failure.');
        break;
      }
    }
  } finally {
    await cleanUp(state, baseline, models);
  }
}

// Always runs: removes anything this run created, through the normal routes, then verifies.
async function cleanUp(state, baseline, models) {
  console.log('\n— Cleanup —');

  const { Post, Comment, User } = models;

  if (state.postId) {
    await check('Clean up: delete the test post left by a failed step', async () => {
      expect(state.admin, 'no admin session to delete it with');
      const r = await request('DELETE', `/post/${state.postId}`, { cookie: state.admin.cookie });
      expect(r.status === 200 || r.status === 404, `delete returned ${r.status}; remove post #${state.postId} via Manage Posts`);
      state.postId = null;
    });
  }

  if (baseline.posts === undefined) {
    console.log('      Nothing was written, so there is nothing to verify.');
    return;
  }

  await check('Clean up verified: posts, comments, users, upload and temp files back to the starting counts', async () => {
    const now = { posts: await Post.count(), comments: await Comment.count(), users: await User.count(), uploads: countFiles(UPLOADS_DIR), temp: countFiles(TEMP_DIR) };
    const leftovers = await Post.count({ where: { title: { [require('sequelize').Op.like]: `${RUN_MARKER}%` } } });
    expect(leftovers === 0, `${leftovers} test post(s) still in the database`);
    expect(JSON.stringify(now) === JSON.stringify({ posts: baseline.posts, comments: baseline.comments, users: baseline.users, uploads: baseline.uploads, temp: baseline.temp }),
      `start ${JSON.stringify(baseline)} vs now ${JSON.stringify(now)}`);
    return 'nothing left behind (Activity entries for the test are kept, by design)';
  });
}

async function main() {
  console.log(`Smoke test against ${BASE_URL}`);

  let target;

  try {
    target = await assertLocalTarget(BASE_URL);
  } catch (error) {
    console.error(`REFUSED  ${error.message}`);
    process.exit(2);
  }

  const models = require('../api/models/Associations');

  // Keep the report readable: the script's own database reads don't need query logging.
  models.sequelize.options.logging = false;

  try {
    await readOnlyChecks(target);
    await writeChecks(models);
  } finally {
    await models.sequelize.close();
  }

  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch(error => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
