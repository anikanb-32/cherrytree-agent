# cherrytree-agent-dummy

**Live (new-product):** [Open the prototype](https://cdn.jsdelivr.net/gh/anikanb-32/cherrytree-agent@main/new-product/index.html)

Scratch project for trying out agent ideas. Nothing here is wired to Firebase,
Clerk or any real data — the interview is a front-end mock: the agent works
through a fixed list of questions and nothing you type is stored.

## Run it

```bash
nvm use 22      # or any Node >= 20
npm install
npm run dev     # http://localhost:3001
```

Port 3001 so it can run at the same time as `cherrytree-cofounder-agreement`
on 3000.

## Live reload

Vite's dev server hot-reloads on save. Edit `src/App.jsx` or `src/index.css`
and the browser updates instantly, without a full refresh — the transcript
you've already built up survives the update.

Start with:

- `QUESTIONS` in `src/App.jsx` — the interview script
- `:root` in `src/index.css` — colours and type
