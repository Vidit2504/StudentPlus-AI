# StudentPulse AI — Frontend MVP

A responsive, browser-only frontend prototype for a student success dashboard. It uses plain HTML, CSS, and JavaScript and requires no package installation or API keys.

## Run locally

1. Extract the ZIP file.
2. Open `index.html` in a modern browser.
3. For a local development server (optional), open a terminal in this folder and run:
   - Python: `python -m http.server 8000`
   - Then visit `http://localhost:8000`.

## Included interactions

- Sidebar navigation between dashboard, skill insights, study plan, learning hub, career roadmap, study buddy, and profile.
- Skill self-assessment updates scores and readiness indicators.
- Check off, add, delete, and reset study-plan tasks.
- Profile editing with required-field and CGPA range validation.
- Profile, skill, and task state saved in browser `localStorage` when available.
- Export current demo state to a JSON file.
- Rule-based sample responses in Study Buddy; no external AI service is connected.
- Responsive layout and keyboard-visible focus states.

## Important limitations

- This is a frontend-only demo. There is no backend, real registration/authentication, database, multi-user access, or server-side JSON persistence.
- Sample scores, profile information, career suggestions, and study tasks are illustrative demo data, not live or validated AI recommendations.
- Study Buddy uses local keyword-based sample replies; it is not an LLM.
- `localStorage` is browser/device-specific and is not appropriate for sensitive production student records.
- Google Fonts and the external learning links need internet access. The core interface does not depend on an external API.

## Manual smoke-test checklist

- Navigate through each sidebar page and use dashboard quick actions.
- Update skill levels and confirm the readiness value and bars change.
- Complete/uncomplete tasks, add a task, delete a task, and reset the plan.
- Submit the profile with missing fields; test CGPA values below 0 and above 10, then save a valid profile.
- Export the JSON file and inspect its contents.
- Ask Study Buddy a question, try a suggested question, and clear the conversation.
- Refresh the page to check browser-local persistence.
- Test at desktop width and a narrow mobile viewport (around 375 px).

No automated browser test suite is included. Manual execution is required to verify runtime behaviour.
