import api from './client'

/**
 * Certificates (Phase 7): only for tickets scanned at the gate, after the event.
 * { number, holderName, eventTitle, venue, eventStart, clubName, clubSlug, issuedAt }
 */
export const fetchMyCertificates = () => api.get('/certificates/mine').then((r) => r.data)

/** PUBLIC: 404 = not a real EventHub certificate */
export const verifyCertificate = (number) => api.get(`/certificates/verify/${encodeURIComponent(number)}`).then((r) => r.data)

/** The PDF (a normal link: the login cookie goes along, the browser downloads the file) */
export const certificatePdfUrl = (number) => `/api/certificates/${encodeURIComponent(number)}/pdf`

/** What the QR code on the certificate opens */
export const verifyPageUrl = (number) => `${window.location.origin}/verify/${number}`
