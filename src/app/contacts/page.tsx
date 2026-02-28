import ContactsView from '@/components/ContactsView';
import { getContacts } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  // Fetch contacts from database with fallback to mock data
  const contacts = await getContacts();

  return <ContactsView initialContacts={contacts} />;
}
