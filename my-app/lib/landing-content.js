// Static content for the landing page. Plain data only — every string here is
// the English source that the client components wrap in t(...), so this module
// can be imported from the server component (for the FAQ JSON-LD) or the
// client one alike.
import {
  BadgeCheck,
  BellRing,
  Camera,
  CircleCheck,
  ClipboardList,
  EyeOff,
  History,
  Map as MapIcon,
  MapPin,
  PhoneOff,
  Timer,
  TrendingUp,
  TriangleAlert,
  ThumbsUp,
} from 'lucide-react'

export const REASSURANCE = [
  { icon: BadgeCheck, label: 'Free' },
  { icon: Timer, label: 'Takes 2 minutes' },
  { icon: Camera, label: 'Photo and location only, no paperwork' },
]

export const PAINS = [
  {
    icon: TriangleAlert,
    text: 'A pothole damages vehicles and injures riders every day.',
  },
  {
    icon: PhoneOff,
    text: 'Reports sent by phone or word of mouth disappear with no record.',
  },
  {
    icon: ClipboardList,
    text: 'Nobody knows whether others already reported the same thing.',
  },
  {
    icon: EyeOff,
    text: 'No one can see whether anything was done about it.',
  },
]

export const FEATURES = [
  {
    icon: Camera,
    title: 'Report in 2 minutes',
    text: 'A photo, a pin and a severity — the whole form fits on one screen.',
    mock: 'report',
  },
  {
    icon: MapIcon,
    title: 'See every problem on one live map',
    text: 'Pins are sized and coloured by severity, so the worst stands out first.',
    mock: 'map',
  },
  {
    icon: TrendingUp,
    title: 'Most-affected areas highlighted in coral',
    text: 'Repeated problems on the same street roll up into one hotspot.',
    mock: 'hotspot',
  },
  {
    icon: ThumbsUp,
    title: 'Neighbours verify, so real issues rise',
    text: 'One verification per account, which makes the count mean something.',
    mock: 'verify',
  },
  {
    icon: BellRing,
    title: 'Alerts when 3 or more reports cluster',
    text: 'Similar reports within 500 m raise one signal instead of five separate complaints.',
    mock: 'signal',
  },
  {
    icon: History,
    title: 'Track status from Pending to Resolved',
    text: 'Every change is written to the report timeline with a note and a date.',
    mock: 'timeline',
  },
]

export const STEPS = [
  {
    icon: Camera,
    title: 'Spot it and snap a photo',
    text: 'A blocked drain, a crater in the road, a light out at night — one clear photo is enough.',
  },
  {
    icon: MapPin,
    title: 'Pin it and submit',
    text: 'Add the place, drop a pin on the map and pick how serious it is. The report is public straight away.',
  },
  {
    icon: CircleCheck,
    title: 'Neighbours verify, you track it',
    text: 'People nearby confirm it, the status moves as it is picked up, and the timeline stays on the record.',
  },
]

export const FAQ_ITEMS = [
  {
    question: 'Is it free?',
    answer:
      'Yes. Reporting, verifying and browsing are all free. There are no fees, subscriptions or charges of any kind.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'Only to post a report or verify someone else’s. Reading reports and using the map needs no account at all.',
  },
  {
    question: 'Who can see my report?',
    answer:
      'Everyone. Reports are public records: the title, category, severity, description, photo if you add one, location and status are readable by anyone. Your name appears as you entered it, or as Anonymous if you prefer.',
  },
  {
    question: 'How do you stop fake or duplicate reports?',
    answer:
      'A report is tied to a signed-in account, and a photo and a map pin help neighbours check it. Each account can verify a report only once — the database enforces that. When three or more reports of the same kind sit within about 500 metres, they raise a signal alert instead of scattering.',
  },
  {
    question: 'Who fixes the problem?',
    answer:
      'Sajha Pahal does not repair roads, drains or streetlights itself. It records and verifies reports and keeps the status public, so the problem stays visible to whoever is responsible — the ward, the municipality or the utility — and to everyone else watching.',
  },
  {
    question: 'How long does it take?',
    answer:
      'Submitting takes about two minutes. How long the repair takes depends on the problem and who carries it out; every status change is stamped on the report timeline so you are not left guessing.',
  },
  {
    question: 'Can I report anonymously?',
    answer:
      'You need an account to post, but a report is published under your display name, which can simply be Anonymous. Nothing else about your account is shown to the public.',
  },
  {
    question: 'Can I join community events?',
    answer:
      'Yes. Blood donation drives, plantation, clean-ups, food and clothes donation, health camps and awareness campaigns are listed on the Events page. Browse and read them without an account; an account lets you join, and lets you submit your own event for review. Nothing is published until an admin approves it.',
  },
]
