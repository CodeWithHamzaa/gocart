// M110 (ADR-050): the wording an admin can edit (globals/StorefrontContent.ts), with the storefront's
// previous wording as the fallback for every empty field. Pure (no Payload import) so it can be tested
// and used by server and client components alike.
export type StorefrontContent = {
  announcementMessages: string[]
  showDeliveryMessage: boolean
  showTrackOrderLink: boolean
  featuredTitle: string
  featuredDescription: string
  featuredLinkLabel: string
  newArrivalsTitle: string
  newArrivalsDescription: string
  newArrivalsLinkLabel: string
  footerTagline: string
}

export const DEFAULT_CONTENT: StorefrontContent = {
  announcementMessages: ['Cash on delivery across Pakistan'],
  showDeliveryMessage: true,
  showTrackOrderLink: true,
  featuredTitle: 'Featured',
  featuredDescription: 'Picked by the store, across every category.',
  featuredLinkLabel: 'View all',
  newArrivalsTitle: 'New arrivals',
  newArrivalsDescription: 'The latest additions to the store.',
  newArrivalsLinkLabel: 'View all',
  footerTagline: 'Electronics, fashion, home and beauty, delivered across Pakistan. Pay in cash when your order arrives.',
}

const MAX_MESSAGES = 6
const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

/** Turns the raw global (anything Payload returned, or null) into a complete, safe StorefrontContent. */
export function normaliseContent(raw: unknown): StorefrontContent {
  const g = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const rows = Array.isArray(g.announcementMessages) ? g.announcementMessages : []
  const messages = rows
    .map((row) => text((row as { text?: unknown } | null)?.text, 120))
    .filter((message): message is string => message !== null)
    .slice(0, MAX_MESSAGES)
  const D = DEFAULT_CONTENT
  return {
    announcementMessages: messages.length > 0 ? messages : D.announcementMessages,
    // A checkbox that was never saved is undefined: keep the default (on). Only an explicit false turns it off.
    showDeliveryMessage: g.showDeliveryMessage !== false,
    showTrackOrderLink: g.showTrackOrderLink !== false,
    featuredTitle: text(g.featuredTitle, 60) ?? D.featuredTitle,
    featuredDescription: text(g.featuredDescription, 140) ?? D.featuredDescription,
    featuredLinkLabel: text(g.featuredLinkLabel, 30) ?? D.featuredLinkLabel,
    newArrivalsTitle: text(g.newArrivalsTitle, 60) ?? D.newArrivalsTitle,
    newArrivalsDescription: text(g.newArrivalsDescription, 140) ?? D.newArrivalsDescription,
    newArrivalsLinkLabel: text(g.newArrivalsLinkLabel, 30) ?? D.newArrivalsLinkLabel,
    footerTagline: text(g.footerTagline, 200) ?? D.footerTagline,
  }
}

/** The bar's messages in order: the admin's (or the default), then the automatic delivery sentence if enabled. */
export function announcementList(content: StorefrontContent, delivery: string): string[] {
  const list = [...content.announcementMessages]
  if (content.showDeliveryMessage && delivery.trim()) list.push(delivery.trim())
  return list
}
