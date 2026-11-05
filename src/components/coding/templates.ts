export interface CodingTemplate {
  id: string;
  title: string;
  category: 'html' | 'html-css' | 'html-css-js';
  tagLabel: string;
  description: string;
  files: {
    'index.html': string;
    'styles.css': string;
    'script.js': string;
  };
}

export const CODING_TEMPLATES: CodingTemplate[] = [
  {
    id: 'pure-html',
    title: 'Pure HTML Template',
    category: 'html',
    tagLabel: 'HTML Only (No CSS, No JS)',
    description: '100% pure semantic HTML5 structure. Perfect for learning headers, paragraphs, lists, sections, and markup hierarchy without any styling or scripts.',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pure HTML Student Page</title>
</head>
<body>
  <header>
    <h1>Welcome to Ultimate Scholars Academy</h1>
    <p>A pure HTML document created in the Student Coding Lab.</p>
  </header>

  <hr>

  <main>
    <section>
      <h2>About This Lesson</h2>
      <p>HTML (HyperText Markup Language) is the backbone of all websites. It organizes content into meaningful semantic tags.</p>
    </section>

    <section>
      <h2>Core Web Topics</h2>
      <ul>
        <li><strong>HTML:</strong> Content & Structure</li>
        <li><strong>CSS:</strong> Presentation & Styling</li>
        <li><strong>JavaScript:</strong> Behavior & Interactivity</li>
      </ul>
    </section>

    <section>
      <h2>Student Practice Exercise</h2>
      <p>Try adding a new paragraph below, or create an ordered list of your favorite school subjects:</p>
      <ol>
        <li>Computer Science & Web Tech</li>
        <li>Mathematics</li>
        <li>Creative Arts</li>
      </ol>
    </section>
  </main>

  <hr>

  <footer>
    <p>&copy; 2026 Ultimate Scholars Academy • Class of 2026</p>
  </footer>
</body>
</html>`,
      'styles.css': '',
      'script.js': ''
    }
  },
  {
    id: 'html-css',
    title: 'HTML & CSS Template',
    category: 'html-css',
    tagLabel: 'HTML + CSS (Separated, No JS)',
    description: 'Clean semantic HTML coupled with a dedicated modern stylesheet. Features responsive layout, custom card, gradient background, typography, and hover effects.',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scholars Profile Card</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="card-container">
    <div class="card">
      <div class="badge">Student Developer</div>
      <h1 class="name">Ultimate Scholar</h1>
      <p class="role">Frontend Engineering Student</p>
      
      <p class="bio">
        Mastering CSS Grid, Flexbox, transitions, and modern responsive layouts. Designing beautiful interfaces from scratch.
      </p>

      <div class="metrics">
        <div class="metric">
          <span class="value">100%</span>
          <span class="label">Attendance</span>
        </div>
        <div class="metric">
          <span class="value">A+</span>
          <span class="label">Dedication</span>
        </div>
        <div class="metric">
          <span class="value">2026</span>
          <span class="label">Grad Class</span>
        </div>
      </div>

      <button class="action-btn">View Student Showcase</button>
    </div>
  </div>
</body>
</html>`,
      'styles.css': `/* Reset & Base Setup */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: linear-gradient(135deg, #0F2557 0%, #1e3a8a 50%, #0c1836 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #1e293b;
}

.card-container {
  width: 100%;
  max-width: 420px;
}

.card {
  background: #ffffff;
  border-radius: 20px;
  padding: 36px 30px;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  border: 2px solid #D4A017;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 30px 60px -12px rgba(212, 160, 23, 0.3);
}

.badge {
  display: inline-block;
  background: #FEF3C7;
  color: #92400E;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding: 6px 16px;
  border-radius: 9999px;
  margin-bottom: 16px;
  border: 1px solid #FDE68A;
}

.name {
  color: #0F2557;
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 4px;
}

.role {
  color: #D4A017;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}

.bio {
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 26px;
}

.metrics {
  display: flex;
  justify-content: space-around;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 8px;
  margin-bottom: 26px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric .value {
  font-size: 20px;
  font-weight: 800;
  color: #0F2557;
}

.metric .label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}

.action-btn {
  background: #D4A017;
  color: #0F2557;
  border: none;
  width: 100%;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(212, 160, 23, 0.4);
}

.action-btn:hover {
  background: #b0820e;
  color: #ffffff;
  transform: translateY(-2px);
}
`,
      'script.js': ''
    }
  },
  {
    id: 'html-css-js',
    title: 'HTML, CSS & JavaScript App',
    category: 'html-css-js',
    tagLabel: 'HTML + CSS + JS (Full Stack App)',
    description: 'A complete interactive web app. Combines structured HTML, styled CSS dark theme, and JavaScript event listeners with DOM state changes and console feedback.',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interactive Counter & Logger</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app-card">
    <div class="header">
      <span class="app-pill">Interactive Lab</span>
      <h1>Score Counter</h1>
      <p>Click buttons to update the score and observe the console logs.</p>
    </div>

    <div class="display-box">
      <div id="counter-val" class="number">0</div>
      <div id="status-pill" class="status neutral">Initial: Zero</div>
    </div>

    <div class="button-row">
      <button id="minus-btn" class="btn btn-red">- Decrement</button>
      <button id="reset-btn" class="btn btn-gray">Reset</button>
      <button id="plus-btn" class="btn btn-gold">+ Increment</button>
    </div>

    <div class="stats-summary">
      <p id="total-clicks">Total clicks made: 0</p>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>`,
      'styles.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #050E22;
  color: #ffffff;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.app-card {
  background: #0F2557;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 36px 30px;
  width: 100%;
  max-width: 440px;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
}

.header .app-pill {
  display: inline-block;
  background: rgba(212, 160, 23, 0.15);
  color: #D4A017;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 4px 12px;
  border-radius: 9999px;
  margin-bottom: 12px;
}

.header h1 {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 6px;
}

.header p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 24px;
}

.display-box {
  background: #050E22;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.number {
  font-size: 64px;
  font-weight: 800;
  font-family: monospace;
  color: #D4A017;
  line-height: 1;
  margin-bottom: 10px;
  transition: color 0.2s;
}

.status {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
}

.status.neutral {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.status.positive {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.status.negative {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.button-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  flex: 1;
  padding: 12px 14px;
  border-radius: 12px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:active {
  transform: scale(0.96);
}

.btn-gold {
  background: #D4A017;
  color: #0F2557;
}

.btn-gold:hover {
  background: #e2ae22;
}

.btn-red {
  background: #ef4444;
  color: #ffffff;
}

.btn-red:hover {
  background: #dc2626;
}

.btn-gray {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.btn-gray:hover {
  background: rgba(255, 255, 255, 0.2);
}

.stats-summary {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
}
`,
      'script.js': `// Application State
let count = 0;
let clickCount = 0;

// DOM Elements
const counterVal = document.getElementById('counter-val');
const statusPill = document.getElementById('status-pill');
const totalClicks = document.getElementById('total-clicks');
const plusBtn = document.getElementById('plus-btn');
const minusBtn = document.getElementById('minus-btn');
const resetBtn = document.getElementById('reset-btn');

function updateDisplay() {
  counterVal.textContent = count;
  totalClicks.textContent = \`Total clicks made: \${clickCount}\`;

  if (count > 0) {
    statusPill.textContent = \`Positive: +\${count}\`;
    statusPill.className = 'status positive';
    counterVal.style.color = '#4ade80';
  } else if (count < 0) {
    statusPill.textContent = \`Negative: \${count}\`;
    statusPill.className = 'status negative';
    counterVal.style.color = '#f87171';
  } else {
    statusPill.textContent = 'Initial: Zero';
    statusPill.className = 'status neutral';
    counterVal.style.color = '#D4A017';
  }
}

plusBtn.addEventListener('click', () => {
  count++;
  clickCount++;
  console.log('[ACTION] Incremented score. Current count:', count);
  updateDisplay();
});

minusBtn.addEventListener('click', () => {
  count--;
  clickCount++;
  console.log('[ACTION] Decremented score. Current count:', count);
  updateDisplay();
});

resetBtn.addEventListener('click', () => {
  count = 0;
  clickCount++;
  console.log('[ACTION] Reset counter back to 0');
  updateDisplay();
});

console.log('⚡ Interactive App loaded successfully! Click any button to test.');
`
    }
  }
];
