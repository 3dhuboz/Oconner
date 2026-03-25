import { initializeApp, getApps, deleteApp } from 'firebase/app'
import { getFirestore, collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// ─── Dynamic Firebase init (per-tenant config) ─────────────────────────────
let app = null
let db = null
let storage = null
let auth = null

export function initFirebase(config) {
  // Tear down existing app if re-initializing
  const existing = getApps().find(a => a.name === 'wirez-tenant')
  if (existing) deleteApp(existing)

  app = initializeApp(config, 'wirez-tenant')
  db = getFirestore(app)
  storage = getStorage(app)
  auth = getAuth(app)
  return { db, storage, auth }
}

export function getFirebaseInstances() {
  return { db, storage, auth }
}

// ─── Job Helpers ──────────────────────────────────────────────────────────────

export const JOB_STATUS = {
  NEW: 'new',
  CONTACT_ATTEMPTED: 'contact_attempted',
  ENTRY_NOTICE_SENT: 'entry_notice_sent',
  SCHEDULED: 'scheduled',
  DISPATCHED: 'dispatched',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  INVOICED: 'invoiced',
}

export const JOB_TYPE = {
  REPAIR: 'repair',
  SMOKE_ALARM: 'smoke_alarm',
  COMPLIANCE: 'compliance',
  OTHER: 'other',
}

// Generate a readable job number: WRU-YYYYMMDD-XXX
export function generateJobNumber() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 900) + 100
  return `WRU-${date}-${rand}`
}

// ─── CRUD Operations ──────────────────────────────────────────────────────────

export async function createJob(jobData) {
  const jobNumber = generateJobNumber()
  const docRef = await addDoc(collection(db, 'jobs'), {
    ...jobData,
    jobNumber,
    status: JOB_STATUS.NEW,
    contactAttempts: 0,
    fieldData: { labourHours: 0, materials: [], siteNotes: '', photos: [] },
    xeroInvoiceId: null,
    xeroInvoiceNumber: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: docRef.id, jobNumber }
}

export async function updateJob(jobId, updates) {
  const jobRef = doc(db, 'jobs', jobId)
  await updateDoc(jobRef, { ...updates, updatedAt: serverTimestamp() })
}

export async function getJob(jobId) {
  const snap = await getDoc(doc(db, 'jobs', jobId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getJobs(statusFilter = null) {
  let q
  if (statusFilter) {
    q = query(collection(db, 'jobs'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'))
  } else {
    q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'))
  }
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getElectricians() {
  const snap = await getDocs(collection(db, 'electricians'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function uploadPhoto(jobId, file) {
  const storageRef = ref(storage, `jobs/${jobId}/photos/${Date.now()}_${file.name}`)
  await uploadBytes(storageRef, file)
  return await getDownloadURL(storageRef)
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  return signOut(auth)
}
