import React, { useEffect, useState } from 'react';
import { useIncidentStore } from '../../store/incidentStore';
import CaseQueue from './CaseQueue';
import CaseDetail from './CaseDetail';
import { Plus, X } from 'lucide-react';

export default function InvestigationDashboard() {
  const cases = useIncidentStore(state => state.cases);
  const activeCaseId = useIncidentStore(state => state.activeCaseId);
  const setActiveCaseId = useIncidentStore(state => state.setActiveCaseId);

  const [showManualCase, setShowManualCase] = useState(false);
  const [manualForm, setManualForm] = useState({
    symbol: 'BTCUSDT',
    qty: '',
    price: '',
    side: 'LONG',
    notes: ''
  });

  // Fetch initial cases on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/cases')
      .then(res => res.json())
      .then(data => {
        data.forEach(c => useIncidentStore.getState().addOrUpdateCase(c));
      })
      .catch(console.error);
  }, []);

  const handleCreateCase = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/cases/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });
      const newCase = await res.json();
      useIncidentStore.getState().addOrUpdateCase(newCase);
      setActiveCaseId(newCase.id);
      setShowManualCase(false);
    } catch (e) {
      console.error(e);
      alert('Failed to create case');
    }
  };

  const casesList = Object.values(cases).sort((a, b) => b.createdAt - a.createdAt);
  const activeCase = activeCaseId ? cases[activeCaseId] : null;

  return (
    <div className="flex flex-1 overflow-hidden gap-4 p-4 relative">
      <div className="w-1/3 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Case Queue</h2>
          <button 
            onClick={() => setShowManualCase(true)}
            className="flex items-center gap-1 bg-accent-blue bg-opacity-20 text-accent-blue hover:bg-opacity-30 px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Manual Case
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CaseQueue cases={casesList} activeCaseId={activeCaseId} onSelect={setActiveCaseId} onAddManual={() => setShowManualCase(true)} />
        </div>
      </div>
      <div className="flex-1 bg-card rounded-lg border border-border p-4 flex flex-col">
        {activeCase ? (
          <CaseDetail caseData={activeCase} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-secondary">
            Select a case from the queue to investigate
          </div>
        )}
      </div>

      {showManualCase && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-card border border-border p-6 rounded-lg w-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-primary">Create Manual Case</h3>
              <button onClick={() => setShowManualCase(false)} className="text-secondary hover:text-primary"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-secondary mb-1">Symbol</label>
                <select 
                  className="w-full bg-[#0F1318] border border-border p-2 rounded text-primary"
                  value={manualForm.symbol}
                  onChange={(e) => setManualForm({...manualForm, symbol: e.target.value})}
                >
                  <option>BTCUSDT</option>
                  <option>ETHUSDT</option>
                  <option>SOLUSDT</option>
                </select>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-secondary mb-1">Qty</label>
                  <input 
                    type="number" 
                    className="w-full bg-[#0F1318] border border-border p-2 rounded text-primary"
                    value={manualForm.qty}
                    onChange={(e) => setManualForm({...manualForm, qty: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-secondary mb-1">Price</label>
                  <input 
                    type="number" 
                    className="w-full bg-[#0F1318] border border-border p-2 rounded text-primary"
                    value={manualForm.price}
                    onChange={(e) => setManualForm({...manualForm, price: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-secondary mb-1">Side</label>
                <select 
                  className="w-full bg-[#0F1318] border border-border p-2 rounded text-primary"
                  value={manualForm.side}
                  onChange={(e) => setManualForm({...manualForm, side: e.target.value})}
                >
                  <option>LONG</option>
                  <option>SHORT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1">Notes</label>
                <textarea 
                  className="w-full bg-[#0F1318] border border-border p-2 rounded text-primary resize-none h-20"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({...manualForm, notes: e.target.value})}
                />
              </div>

              <button 
                onClick={handleCreateCase}
                className="w-full bg-accent-blue text-background font-bold uppercase py-2 rounded hover:bg-opacity-90 mt-2"
              >
                CREATE CASE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
