// Email signatures a rep can save (as many as they like) and pick per reply.
// They live on the rep's login, so they follow them to any computer.

export const COMPANY = 'Polestar Consolidators & Freight Forwarders Pvt Ltd';

export function standardSignatureText(user) {
  return [user?.name || 'Polestar CS Team', user?.role, COMPANY].filter(Boolean).join('\n');
}

// The rep's saved signatures, or a standard one built from their name and role.
export function signatureList(user) {
  const saved = (user?.signatures || []).filter(s => s && s.text);
  if (saved.length) return saved;
  return [{ id: 'standard', name: 'Standard', text: standardSignatureText(user), isDefault: true, auto: true }];
}

export function pickSignature(user, id) {
  const list = signatureList(user);
  return list.find(s => s.id === id) || list.find(s => s.isDefault) || list[0];
}

export function newSignatureId() {
  return `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
