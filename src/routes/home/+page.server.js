import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/');
  }

  console.log(locals.user)
  return { user: locals.user };
}
