# Auto-Grouping

## Objective: Build a React + TypeScript Options page for managing "Auto-Grouping Rules".
## Location: src/options/
## State Target: Sync array to chrome.storage.local under the key 'autoGroupRules'.

Strict Code Design Constraints:
1. Every file must be under 250 lines.
2. Every function / component hook must be under 25 lines.
3. Use Chrome's explicit type for group colors: chrome.tabGroups.Color.

The 9 allowed Chrome Colors are:
['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']

Implement across the following modular template files:
1. Main Page Controller (src/options/OptionsApp.tsx)
```typescript
import React, { useEffect, useState } from 'react';
import { RuleForm } from './RuleForm';
import { RuleList } from './RuleList';
import { AutoGroupRule } from '../background/auto-group-handler';
import { checkPremiumStatus } from '../services/entitlements';

export const OptionsApp: React.FC = () => {
  const [rules, setRules] = useState<AutoGroupRule[]>([]);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  useEffect(() => {
    // Check premium status and sync current rules from local storage
    checkPremiumStatus().then(setIsPremium);
    chrome.storage.local.get({ autoGroupRules: [] }).then((data) => {
      setRules(data.autoGroupRules);
    });
  }, []);

  const handleAddRule = async (newRule: AutoGroupRule) => {
    const updated = [...rules, newRule];
    setRules(updated);
    await chrome.storage.local.set({ autoGroupRules: updated });
  };

  const handleDeleteRule = async (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    await chrome.storage.local.set({ autoGroupRules: updated });
  };

  return (
    <div className="options-container" style={{ padding: '24px', maxWidth: '600px' }}>
      <h2>TabGroup Selector Configuration</h2>
      {!isPremium ? (
        <div className="premium-lock-banner">
          <p>⭐ <strong>Auto-Grouping</strong> is a Premium feature. Upgrade to activate rules.</p>
        </div>
      ) : (
        <>
          <RuleForm onAddRule={handleAddRule} />
          <hr style={{ margin: '24px 0' }} />
          <RuleList rules={rules} onDeleteRule={handleDeleteRule} />
        </>
      )}
    </div>
  );
};
```

2. Rule Composition Form (src/options/RuleForm.tsx)
```typescript
import React, { useState } from 'react';
import { AutoGroupRule } from '../background/auto-group-handler';

const CHROME_COLORS: chrome.tabGroups.Color[] = [
  'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'
];

export const RuleForm: React.FC<{ onAddRule: (rule: AutoGroupRule) => void }> = ({ onAddRule }) => {
  const [pattern, setPattern] = useState('');
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<chrome.tabGroups.Color>('blue');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern || !title) return;

    onAddRule({
      id: crypto.randomUUID(),
      pattern,
      groupTitle: title,
      groupColor: color,
    });
    
    setPattern('');
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3>Create New Auto-Grouping Rule</h3>
      <input type="text" placeholder="URL Pattern (e.g., *.github.com/*)" value={pattern} onChange={(e) => setPattern(e.target.value)} required />
      <input type="text" placeholder="Target Group Title (e.g., Dev)" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select value={color} onChange={(e) => setColor(e.target.value as chrome.tabGroups.Color)}>
        {CHROME_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>Add Routing Rule</button>
    </form>
  );
};
```

3. Rule Presenter Layer (src/options/RuleList.tsx & src/options/RuleItem.tsx)
```typescript
import React from 'react';
import { AutoGroupRule } from '../background/auto-group-handler';

// Renders the wrapper container list
export const RuleList: React.FC<{
  rules: AutoGroupRule[];
  onDeleteRule: (id: string) => void;
}> = ({ rules, onDeleteRule }) => {
  if (rules.length === 0) return <p>No automation rules configured yet.</p>;

  return (
    <div>
      <h3>Active Automation Rules</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rules.map((rule) => (
          <RuleItem key={rule.id} rule={rule} onDelete={onDeleteRule} />
        ))}
      </div>
    </div>
  );
};

// Renders individual list elements cleanly
const RuleItem: React.FC<{
  rule: AutoGroupRule;
  onDelete: (id: string) => void;
}> = ({ rule, onDelete }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <div>
        <strong>{rule.pattern}</strong> → 
        <span style={{ marginLeft: '6px', padding: '2px 6px', borderRadius: '4px', background: rule.groupColor, color: '#fff' }}>
          {rule.groupTitle}
        </span>
      </div>
      <button onClick={() => onDelete(rule.id)} style={{ color: 'red', cursor: 'pointer' }}>Delete</button>
    </div>
  );
};
```

## Execution Strategy:
 - Build the presentational list items first (RuleItem, RuleList) to lock down data layouts.
 - Write the input validation logic in RuleForm. 
 - Integrate all elements into OptionsApp.tsx and wire up the HTML entry point defined in your manifest compiler configuration (options_page: 'options/index.html').


## implementations key notes:
decouple sub-components:
  - OptionsApp.tsx: Main page controller handling storage synchronization and premium-tier locking.
  - RuleForm.tsx: Controlled form for validating and adding new pattern-matching rules.
  - RuleList.tsx: Stateless loop rendering active rules.
  - RuleItem.tsx: Presentational component representing a single rule with delete contro

