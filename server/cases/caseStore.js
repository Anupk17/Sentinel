const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class CaseStore extends EventEmitter {
  constructor() {
    super();
    this.cases = new Map();
  }

  createCase(liquidationEvent, currentMetrics, source = 'LIVE', scenarioId = null) {
    const caseId = uuidv4();
    const newCase = {
      id: caseId,
      status: 'PENDING', // PENDING, INVESTIGATING, AWAITING_REVIEW, CLOSED
      createdAt: Date.now(),
      trigger: liquidationEvent,
      snapshot: currentMetrics,
      agentLogs: [],
      verdict: null,
      source,
      scenarioId
    };
    this.cases.set(caseId, newCase);
    this.emit('new_case', newCase);
    return newCase;
  }

  updateCaseStatus(caseId, status) {
    const c = this.cases.get(caseId);
    if (c) {
      c.status = status;
      this.emit('case_updated', c);
    }
  }

  addAgentLog(caseId, log) {
    const c = this.cases.get(caseId);
    if (c) {
      c.agentLogs.push({ time: Date.now(), ...log });
      this.emit('agent_log', { caseId, log });
    }
  }

  setVerdict(caseId, verdict) {
    const c = this.cases.get(caseId);
    if (c) {
      c.verdict = verdict;
      c.status = 'AWAITING_REVIEW';
      this.emit('case_updated', c);
    }
  }

  resolveCase(caseId, action) {
    const c = this.cases.get(caseId);
    if (c) {
      c.status = 'CLOSED';
      c.resolutionAction = action;
      this.emit('case_resolved', c);
    }
  }

  getAllCases() {
    return Array.from(this.cases.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  clearSimulationCases() {
    for (const [id, c] of this.cases.entries()) {
      if (c.source === 'SIMULATION') {
        this.cases.delete(id);
      }
    }
    this.emit('cases_cleared');
  }
}

const caseStore = new CaseStore();
module.exports = { caseStore };
