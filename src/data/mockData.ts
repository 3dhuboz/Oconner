import { Job, Electrician } from '../types';

export const mockElectricians: Electrician[] = [
  { id: 'e1', name: 'John Spark', phone: '555-0101', email: 'john@wirezrus.com' },
  { id: 'e2', name: 'Mike Volt', phone: '555-0102', email: 'mike@wirezrus.com' },
  { id: 'e3', name: 'Sarah Watt', phone: '555-0103', email: 'sarah@wirezrus.com' },
];

export const mockJobs: Job[] = [
  {
    id: 'WRU-1001',
    title: 'Faulty Switchboard in Unit 4',
    type: 'GENERAL_REPAIR',
    status: 'INTAKE',
    createdAt: new Date().toISOString(),
    tenantName: 'Alice Johnson',
    tenantPhone: '555-0201',
    tenantEmail: 'alice@example.com',
    propertyAddress: '123 Main St, Unit 4, Springfield',
    propertyManagerEmail: 'pm@realestate.com',
    contactAttempts: [],
    materials: [],
    photos: [],
  },
  {
    id: 'WRU-1002',
    title: 'Annual Smoke Alarm Compliance',
    type: 'SMOKE_ALARM',
    status: 'SCHEDULING',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    tenantName: 'Bob Smith',
    tenantPhone: '555-0202',
    tenantEmail: 'bob@example.com',
    propertyAddress: '456 Oak Ave, Springfield',
    contactAttempts: [
      { id: 'c1', date: new Date(Date.now() - 80000000).toISOString(), method: 'CALL', successful: false, notes: 'Left voicemail' },
      { id: 'c2', date: new Date(Date.now() - 40000000).toISOString(), method: 'CALL', successful: true, notes: 'Agreed to tomorrow morning' }
    ],
    materials: [],
    photos: [],
  },
  {
    id: 'WRU-1003',
    title: 'Kitchen Power Outage',
    type: 'GENERAL_REPAIR',
    status: 'EXECUTION',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    tenantName: 'Charlie Davis',
    tenantPhone: '555-0203',
    tenantEmail: 'charlie@example.com',
    propertyAddress: '789 Pine Rd, Springfield',
    contactAttempts: [],
    assignedElectricianId: 'e1',
    scheduledDate: new Date().toISOString(),
    accessCodes: 'Gate: 1234',
    materials: [],
    photos: [],
  },
  {
    id: 'WRU-1004',
    title: 'Replace Hallway Lights',
    type: 'GENERAL_REPAIR',
    status: 'REVIEW',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    tenantName: 'Diana Prince',
    tenantPhone: '555-0204',
    tenantEmail: 'diana@example.com',
    propertyAddress: '321 Elm St, Springfield',
    contactAttempts: [],
    assignedElectricianId: 'e2',
    scheduledDate: new Date(Date.now() - 86400000).toISOString(),
    laborHours: 2.5,
    materials: [
      { id: 'm1', name: 'LED Downlight', quantity: 4, cost: 25.00 },
      { id: 'm2', name: 'Wiring 10m', quantity: 1, cost: 15.00 }
    ],
    photos: ['https://picsum.photos/seed/job1004a/400/300', 'https://picsum.photos/seed/job1004b/400/300'],
    siteNotes: 'Replaced 4 downlights. Old wiring was slightly frayed but safe after re-terminating.',
  }
];
