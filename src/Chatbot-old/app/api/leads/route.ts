import { db } from '@/lib/db';
import { leads, messages } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter');

  const password = request.headers.get('x-admin-password');
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let query = db.select().from(leads).orderBy(desc(leads.score));
  const allLeads = await query;

  const filtered = filter && filter !== 'all'
    ? allLeads.filter(l => l.classification === filter)
    : allLeads;

  return Response.json({ leads: filtered });
}

export async function PATCH(request: Request) {
  const password = request.headers.get('x-admin-password');
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, classification, status } = await request.json();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  await db.update(leads).set({ classification, status }).where(eq(leads.id, id));
  return Response.json({ ok: true });
}
