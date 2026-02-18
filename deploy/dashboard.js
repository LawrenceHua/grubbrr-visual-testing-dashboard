/**
 * GRUBBRR Visual Testing Dashboard
 * JavaScript Controller
 */

class BugDashboard {
  constructor() {
    this.bugs = [];
    this.filteredBugs = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
    this.init();
  }

  async init() {
    await this.loadData();
    this.renderStats();
    this.renderEnvironment();
    this.renderAutomationStatus();
    this.renderBugs();
    this.setupEventListeners();
    this.startAutoRefresh();
  }

  async loadData() {
    try {
      const response = await fetch('bugs-data.json');
      const data = await response.json();
      this.bugs = data.bugs;
      this.metadata = data.metadata;
      this.filteredBugs = [...this.bugs];
    } catch (error) {
      console.error('Failed to load bug data:', error);
      this.showError('Failed to load bug data. Please refresh the page.');
    }
  }

  renderStats() {
    const stats = {
      fixed: this.bugs.filter(b => b.status === 'fixed').length,
      inProgress: this.bugs.filter(b => b.status === 'in-progress').length,
      pending: this.bugs.filter(b => b.status === 'pending').length,
      failed: this.bugs.filter(b => b.testResult === 'failed').length,
      total: this.bugs.length
    };

    const successRate = this.metadata?.automation?.successRate || '0%';

    document.getElementById('stat-fixed').textContent = stats.fixed;
    document.getElementById('stat-in-progress').textContent = stats.inProgress;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-failed').textContent = stats.failed;
    document.getElementById('stat-success-rate').textContent = successRate;
  }

  renderEnvironment() {
    const env = this.metadata?.testEnvironment;
    if (!env) return;

    document.getElementById('env-url').innerHTML = `
      <a href="${env.url}" target="_blank" rel="noopener">
        ${env.url}
      </a>
    `;
    document.getElementById('env-access-code').textContent = env.accessCode;
    document.getElementById('env-kiosk-id').textContent = env.kioskId;
  }

  renderAutomationStatus() {
    const auto = this.metadata?.automation;
    if (!auto) return;

    const statusEl = document.getElementById('automation-status');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const lastRun = document.getElementById('last-run');
    const testsPassed = document.getElementById('tests-passed');
    const testsFailed = document.getElementById('tests-failed');
    const nextRun = document.getElementById('next-run');
    const progressBar = document.getElementById('progress-bar');

    // Update status
    statusDot.className = `status-dot ${auto.currentStatus}`;
    statusText.textContent = auto.currentStatus === 'running' ? 'Testing in Progress...' : 'Idle';
    
    if (auto.currentStatus === 'running') {
      statusEl.classList.add('running');
    } else {
      statusEl.classList.remove('running');
    }

    // Update metrics
    lastRun.textContent = this.formatTime(auto.lastTestRun);
    testsPassed.textContent = `${auto.testsPassed} passed`;
    testsFailed.textContent = `${auto.testsFailed} failed`;
    nextRun.textContent = this.formatTime(auto.nextScheduledRun);

    // Update progress bar
    const total = auto.testsPassed + auto.testsFailed;
    const progress = total > 0 ? (auto.testsPassed / total) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  }

  renderBugs() {
    const grid = document.getElementById('bug-grid');
    
    if (this.filteredBugs.length === 0) {
      grid.innerHTML = `
        <div class="loading">
          <p>No bugs found matching your criteria.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.filteredBugs.map(bug => this.createBugCard(bug)).join('');
  }

  createBugCard(bug) {
    const hasBefore = bug.screenshots?.before !== null;
    const hasAfter = bug.screenshots?.after !== null;

    const beforeScreenshot = hasBefore ? `
      <div class="screenshot">
        <img src="${bug.screenshots.before}" 
             alt="Before fix" 
             loading="lazy"
             onclick="dashboard.openLightbox('${bug.screenshots.before}', '${bug.id} - Before')">
        <div class="screenshot-label">Before</div>
      </div>
    ` : `
      <div class="screenshot">
        <div class="screenshot-placeholder">No screenshot</div>
      </div>
    `;

    const afterScreenshot = hasAfter ? `
      <div class="screenshot">
        <img src="${bug.screenshots.after}" 
             alt="After fix" 
             loading="lazy"
             onclick="dashboard.openLightbox('${bug.screenshots.after}', '${bug.id} - After')">
        <div class="screenshot-label">After</div>
      </div>
    ` : `
      <div class="screenshot">
        <div class="screenshot-placeholder">
          ${bug.status === 'fixed' ? 'Pending capture' : 'Not fixed yet'}
        </div>
      </div>
    `;

    const resultIcon = {
      passed: '✓',
      failed: '✗',
      pending: '⏳',
      'not-tested': '—'
    }[bug.testResult] || '—';

    return `
      <div class="bug-card" data-status="${bug.status}" data-id="${bug.id}">
        <div class="bug-header">
          <div>
            <div class="bug-id">${bug.id}</div>
            <div class="bug-title">
              ${this.escapeHtml(bug.title)}
              ${bug.priority === 'critical' ? '<span class="priority-badge critical">Critical</span>' : ''}
              ${bug.priority === 'high' ? '<span class="priority-badge high">High</span>' : ''}
            </div>
          </div>
          <span class="status-badge ${bug.status}">${bug.status.replace('-', ' ')}</span>
        </div>
        <div class="bug-body">
          <div class="bug-description">${this.escapeHtml(bug.description)}</div>
          <div class="bug-meta">
            <span class="category-tag">${bug.category}</span>
            <span>Created: ${bug.createdDate}</span>
            ${bug.fixedDate ? `<span>Fixed: ${bug.fixedDate}</span>` : ''}
            ${bug.assignedTo ? `<span>Assigned: ${bug.assignedTo}</span>` : ''}
          </div>
        </div>
        <div class="screenshots">
          ${beforeScreenshot}
          ${afterScreenshot}
        </div>
        <div class="test-result">
          <span class="test-result-label">Test Result:</span>
          <span class="test-result-value ${bug.testResult}">
            ${resultIcon} ${bug.testResult.replace('-', ' ')}
          </span>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.applyFilters();
      });
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.applyFilters();
    });

    // Lightbox close
    document.getElementById('lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-close')) {
        this.closeLightbox();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeLightbox();
      }
    });
  }

  applyFilters() {
    this.filteredBugs = this.bugs.filter(bug => {
      // Status filter
      if (this.currentFilter !== 'all' && bug.status !== this.currentFilter) {
        return false;
      }

      // Search filter
      if (this.searchTerm) {
        const searchable = `${bug.id} ${bug.title} ${bug.description} ${bug.category}`.toLowerCase();
        return searchable.includes(this.searchTerm);
      }

      return true;
    });

    this.renderBugs();
  }

  openLightbox(src, caption) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');

    img.src = src;
    captionEl.textContent = caption;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  formatTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    const grid = document.getElementById('bug-grid');
    grid.innerHTML = `
      <div class="loading">
        <p style="color: var(--color-danger)">⚠️ ${message}</p>
      </div>
    `;
  }

  startAutoRefresh() {
    // Refresh every 30 seconds
    setInterval(() => {
      this.loadData().then(() => {
        this.renderStats();
        this.renderAutomationStatus();
        this.applyFilters();
      });
    }, 30000);
  }
}

// Initialize dashboard
const dashboard = new BugDashboard();
