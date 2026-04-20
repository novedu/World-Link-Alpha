const ACTIVATION_ANALYTICS_STORAGE_KEY = 'activationAnalyticsEvents';
const ACTIVATION_ANALYTICS_MAX_EVENTS = 500;

type ActivationEventPayload = Record<string, unknown>;

interface ActivationEventRecord {
  id: string;
  name: string;
  payload: ActivationEventPayload;
  ts: number;
  isoTime: string;
}

function canUseChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local);
}

function safeObjectPayload(input: unknown): ActivationEventPayload {
  if (!input || typeof input !== 'object') return {};
  return input as ActivationEventPayload;
}

function buildEventRecord(name: string, payload: ActivationEventPayload): ActivationEventRecord {
  const ts = Date.now();
  return {
    id: `${ts}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    payload,
    ts,
    isoTime: new Date(ts).toISOString()
  };
}

function readEvents(): Promise<ActivationEventRecord[]> {
  if (!canUseChromeStorage()) return Promise.resolve([]);

  return new Promise((resolve) => {
    chrome.storage.local.get([ACTIVATION_ANALYTICS_STORAGE_KEY], (result) => {
      const list = result?.[ACTIVATION_ANALYTICS_STORAGE_KEY];
      resolve(Array.isArray(list) ? list : []);
    });
  });
}

function writeEvents(events: ActivationEventRecord[]): Promise<void> {
  if (!canUseChromeStorage()) return Promise.resolve();

  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [ACTIVATION_ANALYTICS_STORAGE_KEY]: events
      },
      () => resolve()
    );
  });
}

export async function trackActivationEvent(nameInput: string, payloadInput: unknown = {}) {
  const name = String(nameInput || '').trim();
  if (!name) return;

  const payload = safeObjectPayload(payloadInput);
  const event = buildEventRecord(name, payload);

  const current = await readEvents();
  const next = [...current, event].slice(-ACTIVATION_ANALYTICS_MAX_EVENTS);
  await writeEvents(next);
}

export async function getActivationAnalyticsSnapshot() {
  const events = await readEvents();
  const byEventName = events.reduce<Record<string, number>>((acc, item) => {
    const key = String(item?.name || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    storageKey: ACTIVATION_ANALYTICS_STORAGE_KEY,
    total: events.length,
    byEventName,
    lastEvent: events[events.length - 1] || null,
    recentEvents: events
      .slice(-8)
      .reverse()
      .map((event) => ({
        id: event.id,
        name: event.name,
        isoTime: event.isoTime,
        payload: event.payload
      }))
  };
}

export async function clearActivationAnalyticsEvents() {
  await writeEvents([]);
}
