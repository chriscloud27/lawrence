import { db } from '@/lib/db';
import { leads, messages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const password = request.headers.get('x-admin-password');
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) return Response.json({ error: 'Not found' }, { status: 404 });

  const transcript = await db
    .select()
    .from(messages)
    .where(eq(messages.leadId, id))
    .orderBy(asc(messages.createdAt));

  return Response.json({ lead: { ...lead, messages: transcript } });
}
