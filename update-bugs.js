#!/usr/bin/env node

/**
 * GRUBBRR Bug Status Updater
 * Updates bugs-data.json with new bug statuses and test results
 * Usage: node update-bugs.js [options]
 */

const fs = require('fs');
const path = require('path');

const BUGS_DATA_FILE = 'bugs-data.json';

// Sample bug status update template
const STATUS_UPDATE_TEMPLATE = {
  "id": "NGE-XXX", // Required: Bug ID to update
  "status": "fixed", // fixed | in-progress | pending
  "testResult": "passed", // passed | failed | pending | not-tested
  "screenshots": {
    "before": "screenshots/fixed/NGE-XXX-before.png", // Optional
    "after": "screenshots/fixed/NGE-XXX-after.png" // Optional
  },
  "fixedDate": "2026-02-18", // Optional: Only for fixed bugs
  "assignedTo": "dev-team-alpha" // Optional: For in-progress bugs
};

class BugUpdater {
  constructor() {
    this.data = null;
    this.loadData();
  }

  loadData() {
    try {
      const rawData = fs.readFileSync(BUGS_DATA_FILE, 'utf8');
      this.data = JSON.parse(rawData);
    } catch (error) {
      console.error(`Error loading ${BUGS_DATA_FILE}:`, error.message);
      process.exit(1);
    }
  }

  saveData() {
    try {
      // Update metadata
      this.data.metadata.lastUpdated = new Date().toISOString();
      
      fs.writeFileSync(BUGS_DATA_FILE, JSON.stringify(this.data, null, 2));
      console.log(`✅ Successfully updated ${BUGS_DATA_FILE}`);
      console.log(`   Last updated: ${this.data.metadata.lastUpdated}`);
    } catch (error) {
      console.error(`Error saving ${BUGS_DATA_FILE}:`, error.message);
      process.exit(1);
    }
  }

  updateBug(updates) {
    const { id, status, testResult, screenshots, fixedDate, assignedTo } = updates;
    
    const bugIndex = this.data.bugs.findIndex(bug => bug.id === id);
    if (bugIndex === -1) {
      console.error(`❌ Bug ${id} not found`);
      return false;
    }

    const bug = this.data.bugs[bugIndex];
    
    // Update status
    if (status) {
      bug.status = status;
      console.log(`📝 Updated ${id} status: ${status}`);
    }

    // Update test result
    if (testResult) {
      bug.testResult = testResult;
      console.log(`🧪 Updated ${id} test result: ${testResult}`);
    }

    // Update screenshots
    if (screenshots) {
      bug.screenshots = { ...(bug.screenshots || {}), ...screenshots };
      console.log(`📸 Updated ${id} screenshots`);
    }

    // Update fixed date
    if (fixedDate) {
      bug.fixedDate = fixedDate;
      console.log(`📅 Updated ${id} fixed date: ${fixedDate}`);
    }

    // Update assigned team
    if (assignedTo) {
      bug.assignedTo = assignedTo;
      console.log(`👥 Updated ${id} assigned to: ${assignedTo}`);
    }

    // Remove assignedTo if bug is fixed
    if (status === 'fixed' && bug.assignedTo) {
      delete bug.assignedTo;
      console.log(`👥 Removed assignment for fixed bug ${id}`);
    }

    return true;
  }

  updateAutomationStatus(automationData) {
    this.data.metadata.automation = {
      ...this.data.metadata.automation,
      ...automationData,
      lastTestRun: new Date().toISOString()
    };
    console.log('🤖 Updated automation status');
  }

  generateReport() {
    const stats = {
      total: this.data.bugs.length,
      fixed: this.data.bugs.filter(b => b.status === 'fixed').length,
      inProgress: this.data.bugs.filter(b => b.status === 'in-progress').length,
      pending: this.data.bugs.filter(b => b.status === 'pending').length,
      passed: this.data.bugs.filter(b => b.testResult === 'passed').length,
      failed: this.data.bugs.filter(b => b.testResult === 'failed').length
    };

    console.log('\n📊 Current Bug Statistics:');
    console.log(`   Total bugs: ${stats.total}`);
    console.log(`   Fixed: ${stats.fixed} (${Math.round(stats.fixed/stats.total*100)}%)`);
    console.log(`   In Progress: ${stats.inProgress} (${Math.round(stats.inProgress/stats.total*100)}%)`);
    console.log(`   Pending: ${stats.pending} (${Math.round(stats.pending/stats.total*100)}%)`);
    console.log(`   Tests Passed: ${stats.passed}`);
    console.log(`   Tests Failed: ${stats.failed}`);
    console.log(`   Success Rate: ${this.data.metadata.automation.successRate}`);
  }

  listBugsByStatus(status = null) {
    const bugs = status ? this.data.bugs.filter(b => b.status === status) : this.data.bugs;
    
    console.log(`\n🐛 ${status ? `${status.charAt(0).toUpperCase() + status.slice(1)} ` : ''}Bugs:`);
    bugs.forEach(bug => {
      console.log(`   ${bug.id}: ${bug.title} (${bug.testResult})`);
    });
  }

  // CLI Commands
  static showHelp() {
    console.log(`
🐛 GRUBBRR Bug Status Updater

Usage: node update-bugs.js [command] [options]

Commands:
  update <file.json>    Update bugs from JSON file
  report               Show current bug statistics
  list [status]        List bugs by status (fixed|in-progress|pending)
  template             Generate update template file
  help                 Show this help message

Examples:
  node update-bugs.js template          # Create update template
  node update-bugs.js update updates.json # Apply updates from file
  node update-bugs.js report            # Show statistics
  node update-bugs.js list fixed        # List fixed bugs

Update file format:
{
  "bugs": [
    {
      "id": "NGE-001",
      "status": "fixed",
      "testResult": "passed",
      "fixedDate": "2026-02-18"
    }
  ],
  "automation": {
    "successRate": "85.5%",
    "testsPassed": 47,
    "testsFailed": 8
  }
}
    `);
  }

  static generateTemplate() {
    const template = {
      description: "GRUBBRR Bug Update Template",
      timestamp: new Date().toISOString(),
      bugs: [
        {
          id: "NGE-XXX",
          status: "fixed", // fixed | in-progress | pending
          testResult: "passed", // passed | failed | pending | not-tested
          screenshots: {
            before: "screenshots/fixed/NGE-XXX-before.png",
            after: "screenshots/fixed/NGE-XXX-after.png"
          },
          fixedDate: "2026-02-18"
        }
      ],
      automation: {
        successRate: "85.5%",
        testsPassed: 47,
        testsFailed: 8,
        currentStatus: "idle" // idle | running | error
      }
    };

    const filename = 'bug-update-template.json';
    fs.writeFileSync(filename, JSON.stringify(template, null, 2));
    console.log(`✅ Template generated: ${filename}`);
  }
}

// CLI Handler
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const updater = new BugUpdater();

  switch (command) {
    case 'update':
      if (!args[1]) {
        console.error('❌ Please specify update file');
        process.exit(1);
      }
      
      try {
        const updateData = JSON.parse(fs.readFileSync(args[1], 'utf8'));
        
        // Update bugs
        if (updateData.bugs) {
          let updatedCount = 0;
          updateData.bugs.forEach(update => {
            if (updater.updateBug(update)) {
              updatedCount++;
            }
          });
          console.log(`\n✅ Updated ${updatedCount} bugs`);
        }

        // Update automation status
        if (updateData.automation) {
          updater.updateAutomationStatus(updateData.automation);
        }

        // Save changes
        updater.saveData();
        
      } catch (error) {
        console.error(`❌ Error processing update file: ${error.message}`);
        process.exit(1);
      }
      break;

    case 'report':
      updater.generateReport();
      break;

    case 'list':
      const status = args[1];
      updater.listBugsByStatus(status);
      break;

    case 'template':
      BugUpdater.generateTemplate();
      break;

    case 'help':
    case '--help':
    case '-h':
      BugUpdater.showHelp();
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      BugUpdater.showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BugUpdater;