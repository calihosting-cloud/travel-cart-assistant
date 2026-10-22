/**
 * Cliente Carrito GT API (Postgres car_* vía FastAPI).
 * Las peticiones salen del service worker (host_permissions) — sin CORS de página.
 */

export const CAR_API_BASE_KEY = 'tce_car_api_base';
export const CAR_API_TOKEN_KEY = 'tce_car_api_token';
export const CAR_CRM_USER_ID_KEY = 'tce_crm_user_id';
export const CAR_CRM_USER_EMAIL_KEY = 'tce_crm_user_email';

/** URL pública (nginx → 127.0.0.1:8787). */
export const DEFAULT_CAR_API_BASE = 'https://chatcrm.grupostravel.com/car-api';

export type CarApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status?: number };

export interface CarContacto {
  id: number;
  nombre: string;
  telefono?: string | null;
  telefono_norm?: string | null;
  email?: string | null;
  notas?: string | null;
  crm_contact_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** Hit unificado CRM WhatsApp + car_contacto */
export interface ContactSearchHit {
  source: 'crm' | 'carrito' | string;
  crm_contact_id?: string | null;
  car_contacto_id?: number | null;
  nombre: string;
  telefono?: string | null;
  telefono_norm?: string | null;
  /** Agencia / company del CRM (crm.contacts.company), si existe */
  agencia?: string | null;
}

export interface CarCotizacion {
  id: number;
  numero_car: number;
  numero_car_ref: string;
  asesor_id?: number | null;
  asesor_nombre?: string | null;
  agencia_id?: number | null;
  agencia_nombre?: string | null;
  contacto_id?: number | null;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  oportunidad_crm_id?: string | null;
  oportunidad_seq?: number | null;
  payload_json: Record<string, unknown>;
  origen: string;
  created_at: string;
  updated_at: string;
}

export interface CarAsesor {
  id: number;
  nombre: string;
  email?: string | null;
  crm_user_id?: string | null;
  activo: boolean;
}

export async function loadCarApiBase(): Promise<string> {
  try {
    const r = await chrome.storage.local.get(CAR_API_BASE_KEY);
    const v = r[CAR_API_BASE_KEY];
    if (typeof v === 'string' && v.trim()) return v.trim().replace(/\/$/, '');
  } catch {
    // ignore
  }
  return DEFAULT_CAR_API_BASE;
}

export async function saveCarApiBase(base: string): Promise<void> {
  await chrome.storage.local.set({
    [CAR_API_BASE_KEY]: base.trim().replace(/\/$/, ''),
  });
}

export async function loadCarApiToken(): Promise<string> {
  try {
    const r = await chrome.storage.local.get(CAR_API_TOKEN_KEY);
    const v = r[CAR_API_TOKEN_KEY];
    if (typeof v === 'string') return v.trim();
  } catch {
    // ignore
  }
  return '';
}

export async function saveCarApiToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [CAR_API_TOKEN_KEY]: token.trim() });
}

export async function loadCrmUserId(): Promise<string> {
  try {
    const r = await chrome.storage.local.get(CAR_CRM_USER_ID_KEY);
    const v = r[CAR_CRM_USER_ID_KEY];
    if (typeof v === 'string') return v.trim();
  } catch {
    // ignore
  }
  return '';
}

export async function loadCrmUserEmail(): Promise<string> {
  try {
    const r = await chrome.storage.local.get(CAR_CRM_USER_EMAIL_KEY);
    const v = r[CAR_CRM_USER_EMAIL_KEY];
    if (typeof v === 'string') return v.trim();
  } catch {
    // ignore
  }
  return '';
}

export async function saveCrmUserLink(opts: { id?: string; email?: string }): Promise<void> {
  const payload: Record<string, string> = {};
  if (opts.id !== undefined) payload[CAR_CRM_USER_ID_KEY] = opts.id.trim();
  if (opts.email !== undefined) payload[CAR_CRM_USER_EMAIL_KEY] = opts.email.trim();
  if (Object.keys(payload).length) await chrome.storage.local.set(payload);
}

export async function carApiConfigured(): Promise<boolean> {
  const token = await loadCarApiToken();
  return token.length >= 16;
}

/** Llamada desde content/popup → background (evita CORS de página). */
export async function carApiRequest<T = unknown>(opts: {
  method?: string;
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}): Promise<CarApiResult<T>> {
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TCE_CAR_API',
      method: opts.method || 'GET',
      path: opts.path,
      body: opts.body,
      query: opts.query,
    });
    if (!res || typeof res !== 'object') {
      return { ok: false, error: 'Sin respuesta del background' };
    }
    return res as CarApiResult<T>;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Búsqueda unificada CRM + carrito */
export async function searchContactosMerged(
  q: string,
  limit = 20
): Promise<CarApiResult<{ items: ContactSearchHit[]; total: number }>> {
  return carApiRequest({
    path: '/v1/contactos/search',
    query: { q, limit },
  });
}

/** @deprecated prefer searchContactosMerged */
export async function searchContactos(
  q: string,
  limit = 20
): Promise<CarApiResult<{ items: CarContacto[]; total: number }>> {
  return carApiRequest({
    path: '/v1/contactos',
    query: { q, limit },
  });
}

export async function getContacto(id: number): Promise<CarApiResult<CarContacto>> {
  return carApiRequest({ path: `/v1/contactos/${id}` });
}

export async function ensureContacto(body: {
  nombre: string;
  telefono?: string;
  crm_contact_id?: string;
  email?: string;
}): Promise<CarApiResult<CarContacto>> {
  return carApiRequest({ method: 'POST', path: '/v1/contactos/ensure', body });
}

export async function createContacto(body: {
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
  crm_contact_id?: string;
}): Promise<CarApiResult<CarContacto>> {
  return carApiRequest({ method: 'POST', path: '/v1/contactos', body });
}

export async function listCotizaciones(opts?: {
  q?: string;
  limit?: number;
  asesor_id?: number;
}): Promise<CarApiResult<{ items: CarCotizacion[]; total: number }>> {
  return carApiRequest({
    path: '/v1/cotizaciones',
    query: {
      q: opts?.q,
      limit: opts?.limit ?? 30,
      asesor_id: opts?.asesor_id,
    },
  });
}

export async function upsertCotizacion(body: {
  numero_car: number;
  numero_car_ref?: string;
  asesor_id?: number;
  asesor_nombre?: string;
  agencia_nombre?: string;
  contacto_nombre?: string;
  contacto_telefono?: string;
  contacto_id?: number;
  oportunidad_seq?: number;
  oportunidad_crm_id?: string;
  payload_json?: Record<string, unknown>;
  origen?: string;
}): Promise<CarApiResult<CarCotizacion>> {
  return carApiRequest({ method: 'POST', path: '/v1/cotizaciones', body });
}

export async function listAsesores(): Promise<CarApiResult<CarAsesor[]>> {
  return carApiRequest({ path: '/v1/asesores', query: { activos: true } });
}

export async function ensureAsesor(body: {
  nombre: string;
  email?: string;
  crm_user_id?: string;
}): Promise<CarApiResult<CarAsesor>> {
  return carApiRequest({ method: 'POST', path: '/v1/asesores/ensure', body });
}

export async function pingCarApi(): Promise<CarApiResult<{ ok: boolean; auth?: string }>> {
  return carApiRequest({ path: '/v1/me' });
}

/** Display label for asesores with same name: "Nombre · email" */
export function formatAsesorLabel(a: Pick<CarAsesor, 'nombre' | 'email' | 'crm_user_id'>): string {
  const name = (a.nombre || '').trim() || 'Asesor';
  if (a.email) return `${name} · ${a.email}`;
  if (a.crm_user_id) return `${name} · ${a.crm_user_id.slice(0, 8)}`;
  return name;
}
