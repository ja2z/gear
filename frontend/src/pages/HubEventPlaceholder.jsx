import { useParams } from 'react-router-dom';
import { UPCOMING_EVENTS } from '../data/upcomingEvents';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import PlaceholderModule from './PlaceholderModule';

/**
 * Placeholder when tapping an upcoming-event card on the home hero.
 */
export default function HubEventPlaceholder() {
  const { eventId } = useParams();
  const ev = UPCOMING_EVENTS.find((e) => e.id === eventId);
  const title = ev ? `${ev.label} — ${ev.title}` : 'Event';
  useDesktopHeader({ title: 'Event Details' });
  return <PlaceholderModule title={title} />;
}
