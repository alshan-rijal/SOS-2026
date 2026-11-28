// Static content for the landing page. Plain data only — every string here is
// the English source that the client components wrap in t(...), so this module
// can be imported from the server component (for the FAQ JSON-LD) or the
// client one alike.
import {
  BadgeCheck,
  BellRing,
  Building2,
  Camera,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  EyeOff,
  Heart,
  History,
  Languages,
  Lock,
  Map as MapIcon,
  MapPin,
  PhoneOff,
  Timer,
  TrendingUp,
  TriangleAlert,
  ThumbsUp,
  Users,
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
  {
    icon: Lock,
    title: 'Report privately when it matters',
    text: 'A confidential report stays visible only to you and the admin team, off the public map and counts.',
    mock: 'confidential',
  },
  {
    icon: CalendarDays,
    title: 'Community events, listed and reviewed',
    text: 'Blood drives, clean-ups, plantation and health camps are posted by organisers and approved before they go live.',
    mock: 'events',
  },
  {
    icon: Languages,
    title: 'Nepali and English, one tap apart',
    text: 'The whole site switches language, including dates and numbers, so a report reads in the language you think in.',
    mock: 'language',
  },
]

// Who the record is for. Three audiences, one public record.
export const AUDIENCES = [
  {
    icon: Users,
    title: 'Citizens and neighbours',
    text: 'Spot something, report it in about two minutes, and watch it move instead of wondering if anyone noticed.',
  },
  {
    icon: Building2,
    title: 'Ward offices and the municipality',
    text: 'One prioritised, verifiable list of what the neighbourhood is reporting, with counts and locations, not scattered complaints.',
  },
  {
    icon: Heart,
    title: 'Community groups and volunteers',
    text: 'See the problems piling up on a street, organise around them, and list your own events for others to join.',
  },
]

// The five-step journey, rendered with the real StatusBadge so the landing page
// and the app never disagree about what a status means.
export const STATUS_JOURNEY = [
  {
    status: 'reported',
    text: 'A neighbour puts the problem on the map. It is public from this moment.',
  },
  {
    status: 'under_verification',
    text: 'Others nearby confirm it is real. One verification per account keeps the count honest.',
  },
  {
    status: 'in_progress',
    text: 'Whoever is responsible has picked it up. The change is stamped on the timeline.',
  },
  {
    status: 'fixed',
    text: 'The repair is done and recorded, so the street can see it was closed out.',
  },
  {
    status: 'cannot_fix',
    text: 'It will not be fixed, and the record says why — a reason of at least ten characters is required.',
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
  {
    question: 'Can I keep a report private?',
    answer:
      'Yes. A report can be marked confidential when you create it. A confidential report is visible only to you and the admin team: it stays off the public map, public lists and public counts. Only a normal report appears for everyone.',
  },
  {
    question: 'Does the site work in Nepali?',
    answer:
      'Yes. Use the language switch in the header to read the whole site in Nepali or English. Dates and numbers follow your choice, and reports can carry a title and description in both languages.',
  },
]
