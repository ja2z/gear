import { Award, Backpack, Calendar, Home, Settings, Tent } from 'lucide-react';

/**
 * Single source of truth for Troop Hub tiles (mobile + laptop dashboard).
 * Same routes everywhere — only layout differs by breakpoint.
 */
export const HUB_ACCENTS = {
  blue: {
    border: 'border-scout-blue/15',
    bg: 'bg-scout-blue/8',
    icon: 'text-scout-blue/70',
    hover: 'hover:bg-scout-blue/12',
    active: 'active:bg-scout-blue/15',
  },
  green: {
    border: 'border-scout-green/15',
    bg: 'bg-scout-green/8',
    icon: 'text-scout-green/70',
    hover: 'hover:bg-scout-green/12',
    active: 'active:bg-scout-green/15',
  },
  orange: {
    border: 'border-scout-orange/15',
    bg: 'bg-scout-orange/8',
    icon: 'text-scout-orange/70',
    hover: 'hover:bg-scout-orange/12',
    active: 'active:bg-scout-orange/15',
  },
  teal: {
    border: 'border-scout-teal/15',
    bg: 'bg-scout-teal/8',
    icon: 'text-scout-teal/70',
    hover: 'hover:bg-scout-teal/12',
    active: 'active:bg-scout-teal/15',
  },
  red: {
    border: 'border-scout-red/15',
    bg: 'bg-scout-red/8',
    icon: 'text-scout-red/70',
    hover: 'hover:bg-scout-red/12',
    active: 'active:bg-scout-red/15',
  },
};

/** @typedef {'grid' | 'full'} HubLayout */

/**
 * @typedef {object} HubAction
 * @property {string} id
 * @property {string} to
 * @property {string} label
 * @property {string} [subtitle] — short line for laptop quick-link strip
 * @property {import('lucide-react').LucideIcon} Icon
 * @property {keyof typeof HUB_ACCENTS} accent
 * @property {HubLayout} layout
 */

/** @type {HubAction[]} */
export const HUB_ACTIONS = [
  {
    id: 'gear',
    to: '/gear',
    label: 'Gear',
    subtitle: 'Checkout & inventory',
    Icon: Backpack,
    accent: 'blue',
    layout: 'grid',
  },
  {
    id: 'events',
    to: '/events',
    label: 'Events',
    subtitle: 'Plan & manage trips',
    Icon: Tent,
    accent: 'green',
    layout: 'grid',
  },
  {
    id: 'advancement',
    to: '/advancement',
    label: 'Advancement',
    subtitle: 'Ranks & merit badges',
    Icon: Award,
    accent: 'orange',
    layout: 'grid',
  },
  {
    id: 'calendar',
    to: '/calendar',
    label: 'Calendar',
    subtitle: 'Troop schedule',
    Icon: Calendar,
    accent: 'teal',
    layout: 'grid',
  },
  {
    id: 'manage',
    to: '/manage',
    label: 'Manage',
    subtitle: 'Admin & settings',
    Icon: Settings,
    accent: 'red',
    layout: 'full',
  },
];

/** Left nav for laptop hub: Hub + same destinations as tiles. */
export const HUB_SIDEBAR = [
  { id: 'hub', to: '/home', label: 'Hub', Icon: Home, accent: 'blue' },
  ...HUB_ACTIONS.map(({ id, to, label, Icon, accent }) => ({ id, to, label, Icon, accent })),
];

export const HUB_GRID_ACTIONS = HUB_ACTIONS.filter((a) => a.layout === 'grid');
export const HUB_MANAGE_ACTION = HUB_ACTIONS.find((a) => a.id === 'manage');

export function hubAccentClasses(accent) {
  const a = HUB_ACCENTS[accent];
  if (!a) return HUB_ACCENTS.blue;
  return a;
}
