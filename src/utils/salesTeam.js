// The CS's sales members and their link to inquiries.

// The key a sales member is tracked by on inquiries (id, or the name for old data).
export function salesKey(inquiry) {
  return inquiry.salesMemberId || inquiry.salesMember || '';
}

// Filter options: the current team, plus anyone still on older inquiries.
export function salesOptions(team = [], inquiries = []) {
  const list = (team || []).map(m => ({ key: m.id, name: m.name }));
  for (const i of inquiries) {
    const key = salesKey(i);
    if (key && !list.some(m => m.key === key)) list.push({ key, name: i.salesMember || key });
  }
  return list;
}

// Same customer as an earlier inquiry -> same sales member (if still on the team).
// Matched by the customer's email domain, so colleagues at one company count too.
export function suggestSalesMember(shipment, inquiries = [], team = []) {
  const email = (shipment?.contactEmail || '').toLowerCase();
  const domain = email.split('@')[1];
  if (!domain || !team?.length) return null;
  const earlier = [...inquiries]
    .filter(i => i.salesMemberId && (i.contactEmail || '').toLowerCase().endsWith(`@${domain}`))
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))[0];
  return earlier ? team.find(m => m.id === earlier.salesMemberId) || null : null;
}
