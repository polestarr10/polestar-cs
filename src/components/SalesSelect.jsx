import React from 'react';

// Picks one of the CS's sales members. Keeps showing a name that is no longer on
// the team (from an older inquiry) instead of silently dropping it. With onAddNew,
// the last option adds a new member on the spot.
export default function SalesSelect({ value, team = [], fallbackName = '', onChange, onAddNew, className = '' }) {
  const members = team || [];
  const known = members.some(m => m.id === value);
  const handle = async (e) => {
    const v = e.target.value;
    if (v === '__new') {
      const name = (window.prompt('New sales member name:') || '').trim();
      if (!name) return;
      const added = await onAddNew(name);
      if (added) onChange(added);
      return;
    }
    onChange(members.find(m => m.id === v) || (v === value ? { id: value, name: fallbackName } : null));
  };
  return (
    <select value={value || ''} onChange={handle} className={`scm-select w-full ${value ? '' : 'text-amber-300'} ${className}`}>
      <option value="">Not assigned</option>
      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      {value && !known && <option value={value}>{fallbackName || 'Former member'}</option>}
      {onAddNew
        ? <option value="__new">+ Add new sales member…</option>
        : !members.length && <option disabled value="__none">Add your team: name menu → My sales team</option>}
    </select>
  );
}

// A new member with a fresh id, for adding from a dropdown.
export function newSalesMember(name) {
  return { id: `sm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name, phone: '', email: '' };
}
