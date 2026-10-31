// Wraps route handlers: turns thrown errors into clean JSON responses.
export async function handle(fn) {
  try {
    return await fn();
  } catch (e) {
    let status = e.status;
    if (!status) {
      if (e.code === '42501') status = 403;            // permission denied (RBAC)
      else if (e.code === '23505') { status = 409; e.message = 'That already exists (duplicate)'; }
      else if (typeof e.code === 'string' && /^(P0001|23|22)/.test(e.code)) status = 400; // trigger / constraint / data error
      else status = 500;
    }
    if (status === 500) console.error(e);
    return Response.json({ error: status === 500 ? 'Server error' : e.message }, { status });
  }
}

export const bad = (msg, status = 400) => { throw Object.assign(new Error(msg), { status }); };
