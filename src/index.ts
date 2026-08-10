import { renderHtml } from "./renderHtml";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ১. রুট পেজ (পুরনো HTML রেন্ডারিং অথবা API স্ট্যাটাস)
    if (url.pathname === '/' && request.method === 'GET') {
      try {
        const stmt = env.DB.prepare("SELECT * FROM comments LIMIT 3");
        const { results } = await stmt.all();

        return new Response(renderHtml(JSON.stringify(results, null, 2)), {
          headers: {
            "content-type": "text/html",
          },
        });
      } catch (error) {
        return Response.json({ message: 'FlyTripVisa D1 API is operational' });
      }
    }

    // ২. সাইনআপ এপিআই (POST /api/v1/auth/signup)
    if (url.pathname === '/api/v1/auth/signup' && request.method === 'POST') {
      try {
        const body = (await request.json()) as {
          name?: string;
          email?: string;
          password_hash?: string;
          role?: string;
        };

        const { name, email, password_hash, role = 'user' } = body;

        if (!name || !email || !password_hash) {
          return Response.json(
            { error: 'Missing required fields: name, email, password_hash' },
            { status: 400 }
          );
        }

        // ইউজার আগে থেকেই আছে কিনা চেক
        const existingUser = await env.DB
          .prepare('SELECT id FROM users WHERE email = ?1')
          .bind(email)
          .first();

        if (existingUser) {
          return Response.json(
            { error: 'User with this email already exists' },
            { status: 409 }
          );
        }

        const id = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO users (id, name, email, password_hash, role) VALUES (?1, ?2, ?3, ?4, ?5)'
        ).bind(id, name, email, password_hash, role).run();

        return Response.json(
          { message: 'User created successfully', user: { id, name, email, role } },
          { status: 201 }
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return Response.json({ error: errorMessage }, { status: 500 });
      }
    }

    // ৩. ইউজারের তথ্য পাওয়ার এপিআই (GET /api/v1/users)
    if (url.pathname === '/api/v1/users' && request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT id, name, email, role FROM users').all();
        return Response.json({ users: results });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return Response.json({ error: errorMessage }, { status: 500 });
      }
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
