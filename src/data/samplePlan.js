// A made-up weekly plan in the same shape as the team's real sheet (an area per
// day, then the companies to visit or call), so the Weekly Plan page is easy to
// understand before a real one exists. Every company and place here is fictional.
import { blankPlan } from '../utils/planBuilder';

const DAYS = [
  {
    area: 'Office: calls & quotations',
    items: [
      ['Call back pending enquiries from last week', true, 'Spoke to 4 of 6; 2 asked for rates'],
      ['Send revised rates on 3 open quotes', true, ''],
      ['Update nomination sheet with confirmed bookings', false, ''],
      ['Fix visit timings for Tuesday', false, ''],
    ],
  },
  {
    area: 'Mahape MIDC (visits)',
    items: [
      ['Sunrise Polymers Pvt Ltd', false, 'Met logistics head last month; 2x40 monthly to Jebel Ali'],
      ['Kaveri Agro Foods', false, ''],
      ['Nexa Auto Components', false, ''],
      ['Bluewave Textiles', false, ''],
      ['Orion Pharma Packaging', false, ''],
      ['Shakti Steel Tubes', false, ''],
    ],
  },
  {
    area: 'Powai + Kurla (visits)',
    items: [
      ['Harbor Leather Exports', false, ''],
      ['Vista Home Furnishings', false, ''],
      ['Meridian Spices Co.', false, 'LCL to Europe; ask for cargo ready date'],
      ['Greenleaf Organics', false, ''],
      ['Apex Electricals', false, ''],
    ],
  },
  {
    area: 'Forwarder partners, Marol',
    items: [
      ['Coastline Logistics', false, ''],
      ['BlueAnchor Shipping', false, ''],
      ['Transglobe Cargo Movers', false, ''],
      ['Polaris Freight Systems', false, ''],
    ],
  },
  {
    area: 'Office: follow-ups',
    items: [
      ['Follow up everyone visited on Tue & Wed', false, ''],
      ['Chase 2 quotes expiring this week', false, ''],
      ['Collect cargo ready dates for next week', false, ''],
    ],
  },
  {
    area: 'Office (half day)',
    items: [
      ["Review the week's numbers", false, ''],
      ["Draft next week's plan", false, ''],
    ],
  },
];

let n = 0;
const item = ([text, done, note]) => ({ id: `sample-${n++}`, text, done, note, ...(done ? { doneAt: new Date().toISOString() } : {}) });

export function buildSamplePlan(weekStart) {
  const plan = blankPlan(weekStart);
  return {
    ...plan,
    isSample: true,
    sourceName: 'Sample plan (made-up data)',
    proposedTargetCbm: 60,
    reviewNote: 'Example: VP asked to add two more Mahape visits on Thursday and keep the target at 60 CBM.',
    general: [item(['Get 2 new customers to their first booking', false, '']), item(['Clear all overdue follow-ups by Wednesday', false, ''])],
    days: plan.days.map((d, i) => ({ ...d, area: DAYS[i].area, items: DAYS[i].items.map(item) })),
  };
}
