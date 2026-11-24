# Learning Ledger

A private website for tracking the courses, tools and skills you keep meaning to get to. Add items from any platform, give each a next step, a due date and a check-in rhythm, and the "Needs you" list shows what is overdue, due soon, untouched, or stuck in the queue.

- **App:** Next.js 14 (App Router, TypeScript)
- **Database:** Neon Postgres (the `items` table is created automatically on first use)
- **Hosting:** Vercel
- **Sign-in:** one shared password, checked on the server. Sessions are signed cookies that last 30 days.

## 1. Create the Neon database

1. Sign up at neon.tech and create a project.
2. Open the project dashboard, click **Connect**, and copy the **pooled** connection string. It looks like `postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.

You do not need to create any tables. `db/schema.sql` is only a reference copy.

## 2. Run it on your computer (optional)

```bash
cp .env.example .env.local     # then fill in the three values
npm install
npm run dev                    # http://localhost:3000
```

Generate a session secret with `openssl rand -base64 32`.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Learning Ledger"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/learning-ledger.git
git push -u origin main
```

Create the empty repository on github.com first. Make it **private**. `.env.local` is already in `.gitignore`, so your secrets will not be committed.

## 4. Deploy on Vercel

1. On vercel.com choose **Add New > Project** and import the GitHub repository.
2. Leave the framework preset as Next.js.
3. Under **Environment Variables**, add:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the Neon connection string |
| `APP_PASSWORD` | the password you will type to sign in |
| `SESSION_SECRET` | a random string of 16 or more characters |

4. Click **Deploy**. Every later `git push` to `main` redeploys automatically.

If you change an environment variable later, redeploy so the new value takes effect.

## How it works

| Path | Purpose |
| --- | --- |
| `middleware.ts` | Sends anyone without a valid session to `/login`, and returns 401 for the API |
| `app/api/login`, `app/api/logout` | Set and clear the session cookie |
| `app/api/items` and `app/api/items/[id]` | Create, update and delete items, with server-side validation |
| `lib/db.ts` | Neon queries and the automatic table creation |
| `lib/logic.ts` | The rules for what "needs you" |
| `components/` | The ledger screen, rows and the add/edit sheet |

## Notes

- Dates for "overdue" and "untouched" are worked out in your browser's time zone, so they roll over at your midnight.
- There is no rate limiting beyond a short delay on wrong passwords. Use a long password.
- To add real accounts later, replace `lib/session.ts` and the login route with an auth library and add a `user_id` column to `items`.
