'use strict';

const STORAGE_KEY = 'studentpulse-frontend-demo-v1';
const initialState = {
  profile: { name: 'Vidit Jain', course: 'MCA Student', cgpa: 8.2, career: 'Full-stack developer', interests: 'Java, DSA, web development' },
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
let state = loadState();
let toastTimer;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialState);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.profile || !Array.isArray(parsed.skills) || !Array.isArray(parsed.tasks)) return structuredClone(initialState);
    return parsed;
  } catch (error) {
    return structuredClone(initialState);
  }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch (error) { showToast('Could not save in this browser. Check storage settings.'); return false; }
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}
function readiness() { return Math.round(state.skills.reduce((sum, skill) => sum + skill.score, 0) / Math.max(state.skills.length, 1)); }
function initials(name) { return (name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('') || 'S').toUpperCase(); }
function updateProfileDisplay() {
  const p = state.profile;
  const shortName = p.name.trim().split(/\s+/)[0] || 'Student';
  ['sidebarName', 'headerName'].forEach(id => document.getElementById(id).textContent = p.name);
  ['sidebarAvatar', 'headerAvatar', 'profileAvatar'].forEach(id => document.getElementById(id).textContent = initials(p.name));
  document.getElementById('sidebarCourse').textContent = p.course;
  document.getElementById('welcomeName').textContent = shortName;
  document.getElementById('careerTitle').textContent = p.career;
  document.getElementById('profileName').value = p.name;
  document.getElementById('profileCourse').value = p.course;
  document.getElementById('profileCgpa').value = p.cgpa;
  document.getElementById('profileCareer').value = p.career;
  document.getElementById('profileInterests').value = p.interests || '';
}
function renderSkills() {
  const average = readiness();
  document.getElementById('readinessNumber').textContent = average;
  document.getElementById('readinessBar').style.width = `${average}%`;
  document.getElementById('skillsReadiness').textContent = average;
  const weakest = [...state.skills].sort((a, b) => a.score - b.score)[0];
  document.getElementById('focusMessage').textContent = `${weakest.name} is currently your lowest self-assessed area. Consider prioritising it in your next study session.`;
  const markup = state.skills.map(skill => `<div class="skill-row"><span class="skill-name">${escapeHTML(skill.name)}</span><div class="skill-track" role="progressbar" aria-label="${escapeHTML(skill.name)} score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${skill.score}"><span style="width:${skill.score}%"></span></div><span class="skill-score">${skill.score}%</span></div>`).join('');
  document.getElementById('skillSnapshot').innerHTML = markup;
  document.getElementById('allSkills').innerHTML = markup;
  const form = document.getElementById('skillsForm');
  state.skills.forEach(skill => { const field = form.elements.namedItem(skill.key); if (field) field.value = skill.level; });
}
function renderTasks() {
  const completed = state.tasks.filter(task => task.done).length;
  const total = state.tasks.length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  document.getElementById('completedNumber').textContent = completed;
  document.getElementById('totalTasks').textContent = `/ ${total}`;
  document.getElementById('tasksBar').style.width = `${percent}%`;
  document.getElementById('planPercent').textContent = `${percent}%`;
  document.getElementById('planCount').textContent = `${completed} of ${total} completed`;
  const taskMarkup = (task, index, full = false) => `<div class="task-item ${task.done ? 'is-done' : ''}"><input class="task-check" type="checkbox" data-task-id="${task.id}" aria-label="Mark ${escapeHTML(task.title)} complete" ${task.done ? 'checked' : ''}><div class="task-copy"><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(task.detail || task.category)}</small></div>${full ? `<span class="category-tag">${escapeHTML(task.category)}</span>` : ''}</div>`;
  document.getElementById('dashboardTasks').innerHTML = state.tasks.length ? state.tasks.filter(task => !task.done).slice(0, 3).concat(state.tasks.filter(task => task.done).slice(0, Math.max(0, 3 - state.tasks.filter(t => !t.done).slice(0, 3).length))).map((task, i) => taskMarkup(task, i)).join('') : '<p class="muted">No tasks yet. Add a task in your study plan to get started.</p>';
  document.getElementById('fullTaskList').innerHTML = state.tasks.length ? state.tasks.map((task, index) => `<div class="full-task-card ${task.done ? 'is-done' : ''}"><span class="task-number">${String(index + 1).padStart(2, '0')}</span>${taskMarkup(task, index, true)}<button class="task-delete" data-delete-task="${task.id}" aria-label="Delete task ${escapeHTML(task.title)}" title="Delete task">×</button></div>`).join('') : '<div class="panel"><h3>Your plan is empty</h3><p class="muted">Add your first task below to start tracking progress.</p></div>';
}
function renderAll() { updateProfileDisplay(); renderSkills(); renderTasks(); }
function navigate(page) {
  const valid = ['dashboard', 'skills', 'plan', 'learning', 'career', 'assistant', 'profile'];
  if (!valid.includes(page)) return;
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
  document.querySelectorAll('.nav-item[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const labels = { dashboard: 'Dashboard', skills: 'Skill insights', plan: 'Study plan', learning: 'Learning hub', career: 'Career roadmap', assistant: 'Study buddy', profile: 'My profile' };
  document.getElementById('pageLabel').textContent = labels[page];
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menuButton').setAttribute('aria-expanded', 'false');
  if (location.hash !== `#${page}`) history.replaceState(null, '', `#${page}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function replyFor(question) {
  const q = question.toLowerCase();
  if (/data structure|\bdsa\b|array|string|algorithm/.test(q)) return 'A data structure is a way to organise data so it can be used efficiently. Start with arrays and strings, then practise searching and sorting. For each problem: understand the input, write a simple approach, test edge cases, and then consider time and space complexity. This is a sample educational response.';
  if (/sql|database|join/.test(q)) return 'SQL is used to query relational databases. A JOIN combines rows from related tables: INNER JOIN returns matching rows, LEFT JOIN keeps every row from the left table and adds matching right-side data when available. Practise with two small tables and check what happens when a match is missing. This is a sample response.';
  if (/interview|career|placement|resume/.test(q)) return 'Try a weekly routine: practise a few problems, review core concepts, and prepare a concise explanation of one project. For project answers, cover the problem, your contribution, key technical choices, trade-offs, and what you would improve. This is a sample response, not a hiring prediction.';
  if (/study|consistent|plan|focus|time/.test(q)) return 'Choose one clear goal for each session. Work in a focused 25–40 minute block, take a short break, and finish by writing what you learned and what remains confusing. Keep the plan realistic; reviewing progress weekly helps you adjust it. This is a sample response.';
  if (/python|programming|function|variable|loop/.test(q)) return 'When learning programming, start with a small example, trace each step, then change one thing and predict the result. For a function, identify its inputs, the work it performs, and its returned output. Write a tiny test case before expanding the solution. This is a sample response.';
  return 'I can provide sample guidance about programming fundamentals, DSA, SQL, interview preparation, and study planning. Try asking a more specific question, such as “Explain SQL joins” or “How do I practise arrays?” This prototype does not connect to a live AI model.';
}
function appendMessage(text, role) {
  const container = document.getElementById('chatMessages');
  const item = document.createElement('div');
  item.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
  const icon = document.createElement('span'); icon.className = 'message-avatar'; icon.textContent = role === 'user' ? initials(state.profile.name) : '✳';
  const body = document.createElement('div'); const heading = document.createElement('strong'); heading.textContent = role === 'user' ? 'You' : 'Study Buddy';
  const paragraph = document.createElement('p'); paragraph.textContent = text;
  body.append(heading, paragraph); item.append(icon, body); container.append(item); container.scrollTop = container.scrollHeight;
}

document.addEventListener('click', event => {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) { event.preventDefault(); navigate(pageButton.dataset.page); }
  const questionButton = event.target.closest('[data-question]');
  if (questionButton) { document.getElementById('chatInput').value = questionButton.dataset.question; document.getElementById('chatInput').focus(); }
  const deleteButton = event.target.closest('[data-delete-task]');
  if (deleteButton) {
    const id = Number(deleteButton.dataset.deleteTask);
    state.tasks = state.tasks.filter(task => task.id !== id);
    saveState(); renderTasks(); showToast('Task deleted.');
  }
});
document.addEventListener('change', event => {
  const checkbox = event.target.closest('[data-task-id]');
  if (!checkbox) return;
  const task = state.tasks.find(item => item.id === Number(checkbox.dataset.taskId));
  if (!task) return;
  task.done = checkbox.checked; saveState(); renderTasks();
});
document.getElementById('menuButton').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar'); const open = sidebar.classList.toggle('open');
  document.getElementById('menuButton').setAttribute('aria-expanded', String(open));
});
document.getElementById('dateButton').addEventListener('click', () => showToast(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })));
document.getElementById('skillsForm').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget;
  const scores = { Beginner: 35, Intermediate: 65, Advanced: 88 };
  state.skills = state.skills.map(skill => { const level = form.elements.namedItem(skill.key).value; return { ...skill, level, score: scores[level] }; });
  saveState(); renderSkills(); document.getElementById('skillsMessage').textContent = 'Assessment updated in this browser.'; showToast('Skill assessment saved.');
});
document.getElementById('addTaskForm').addEventListener('submit', event => {
  event.preventDefault(); const input = document.getElementById('newTask'); const title = input.value.trim();
  if (!title) { input.setCustomValidity('Enter a task name.'); input.reportValidity(); input.setCustomValidity(''); return; }
  if (state.tasks.length >= 100) { document.getElementById('taskMessage').textContent = 'For this demo, the plan is limited to 100 tasks.'; return; }
  state.tasks.push({ id: Date.now(), title, category: document.getElementById('newTaskCategory').value, detail: 'Added by you · No duration set', done: false });
  saveState(); renderTasks(); input.value = ''; document.getElementById('taskMessage').textContent = 'Task added to your plan.'; showToast('Task added.');
});
document.getElementById('resetPlanButton').addEventListener('click', () => {
  if (!window.confirm('Reset your study plan to the original example tasks? Your profile and skill assessment will be kept.')) return;
  state.tasks = structuredClone(initialState.tasks); saveState(); renderTasks(); showToast('Example study plan restored.');
});
document.getElementById('profileForm').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget; const name = form.elements.name.value.trim(); const cgpa = Number(form.elements.cgpa.value);
  if (!name) { form.elements.name.setCustomValidity('Enter your name.'); form.elements.name.reportValidity(); form.elements.name.setCustomValidity(''); return; }
  if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) { form.elements.cgpa.setCustomValidity('CGPA must be between 0 and 10.'); form.elements.cgpa.reportValidity(); form.elements.cgpa.setCustomValidity(''); return; }
  state.profile = { name, course: form.elements.course.value, cgpa, career: form.elements.career.value, interests: form.elements.interests.value.trim() };
  const saved = saveState(); renderAll(); document.getElementById('profileMessage').textContent = saved ? 'Profile saved in this browser.' : 'Could not save profile; check browser storage settings.'; showToast(saved ? 'Profile updated.' : 'Profile could not be saved.');
});
document.getElementById('exportProfile').addEventListener('click', () => {
  const payload = { ...state, exportedAt: new Date().toISOString(), notice: 'StudentPulse AI frontend demo data. Not a server backup.' };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'studentpulse-demo-data.json'; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); showToast('JSON export prepared.');
});
document.getElementById('chatForm').addEventListener('submit', event => {
  event.preventDefault(); const input = document.getElementById('chatInput'); const question = input.value.trim();
  if (!question) { input.reportValidity(); return; }
  appendMessage(question, 'user'); input.value = ''; appendMessage(replyFor(question), 'assistant');
});
document.getElementById('clearChat').addEventListener('click', () => {
  const messages = document.getElementById('chatMessages'); messages.replaceChildren();
  appendMessage('Conversation cleared. Ask a question about programming, DSA, SQL, or study planning. This is a demo and does not use a live AI model.', 'assistant');
});
window.addEventListener('hashchange', () => { const page = location.hash.slice(1); if (page) navigate(page); });
document.getElementById('welcomeDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
renderAll();
if (location.hash) navigate(location.hash.slice(1));
