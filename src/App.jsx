import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Edit anything in this file and the page updates instantly — no reload.
// Placeholder content: every question is a stand-in, here to show the sections.
//
// Each question is a turn the agent takes, not a form field:
//   `lead`    — what the agent says before asking. Why this matters, what the
//               tradeoff is, what usually goes wrong. Always on screen.
//   `text`    — the question itself.
//   `options` — pickable answers. Each carries its own `why`, also always on
//               screen: reading the tradeoffs shouldn't require hunting for them.
//   `label`   — how the answer reads back in the draft.
//
// A section with `clause: false` is context-gathering, not a term of the
// agreement — it still shows in the draft, just not as a numbered clause.
const SECTIONS = [
  {
    name: 'Background',
    clause: false,
    questions: [
      {
        lead: 'I’m going to help you put together a cofounder agreement. Before any of the legal mechanics, though, I want to understand the two of you — most of the disputes I’ve watched play out didn’t come from bad paperwork. They came from two people who never said their assumptions out loud.',
        text: 'So, to start: how did you two meet?',
        label: 'How the founders met',
      },
      {
        lead: 'That helps. I ask about the idea next because it quietly drives the equity conversation later — when one person brought the idea and the other joined to build it, they almost always remember that differently a year on.',
        text: 'Where did the idea actually come from?',
        label: 'Origin of the idea',
      },
      {
        lead: 'Good. Now the day-to-day, because roles on paper and roles in practice drift apart fast, and the agreement should describe the real one.',
        text: 'How are the two of you splitting the work right now?',
        label: 'How the work is divided today',
      },
      {
        lead: 'Last one before we get into the document. Uneven commitment is the single biggest source of resentment I see — one founder quits their job, the other keeps consulting “for a few more months,” and nobody ever goes back and renegotiates.',
        text: 'Are you both full-time on this? If not, what’s the plan?',
        label: 'Commitment level',
      },
    ],
  },
  {
    name: 'Company',
    questions: [
      {
        lead: 'Alright — with that context, let’s start building the actual agreement. This first question sounds obvious, but it does real work: the business description is what the IP assignment and any non-compete language point back to. Too vague and it protects nothing; too narrow and it misses whatever you pivot into.',
        text: 'How would you describe what the company does?',
        label: 'Business of the company',
        clause: 'The Company is engaged in the following business: {}',
      },
      {
        lead: 'Now the entity itself, which decides whose corporate law governs everything we’re about to write down.',
        text: 'Where is the company incorporated?',
        label: 'State of incorporation',
        clause: 'Jurisdiction of incorporation: {}',
        options: [
          {
            value: 'Delaware',
            why: 'The default for venture-backed startups — predictable corporate law, and investors will often ask you to reincorporate here before a priced round anyway.',
          },
          {
            value: 'California',
            why: 'Common if you’re staying small or bootstrapped, but it adds its own franchise tax on top of whatever state you’re also registered in.',
          },
          {
            value: 'Not yet incorporated',
            why: 'Fine for now, and worth doing the thinking early — but equity, vesting, and IP assignment can’t bind anyone until there’s an entity to assign them to.',
          },
          {
            value: 'Somewhere else',
            why: 'Less common for startups planning to raise. Tell me where and I’ll flag anything that changes.',
          },
        ],
      },
    ],
  },
  {
    name: 'Equity',
    questions: [
      {
        lead: 'This is the section that ends friendships, so I’ll be direct. I’m not going to tell you what your split should be — that’s yours. But I do want the reasoning written down, because “we agreed it was fair” is not something either of you can point at in two years.',
        text: 'How did you land on the split you have today?',
        label: 'Basis for the split',
        clause: 'Founder Shares are allocated on the following basis: {}',
        options: [
          {
            value: 'Even split',
            why: 'Simple, and it signals trust. The risk is resentment later if one of you ends up carrying noticeably more.',
          },
          {
            value: 'Based on contribution',
            why: 'Fairer on paper, harder to agree on up front, and harder still to revisit later without a fight.',
          },
          {
            value: 'Still deciding',
            why: 'Fine to leave open — but then the agreement should say how and by when you’ll decide, or “later” becomes “never.”',
          },
          {
            value: 'A lawyer advised us',
            why: 'Worth documenting the reasoning anyway. A lawyer’s recommendation still needs both of you to actually agree with it.',
          },
        ],
      },
      {
        lead: 'Now the part founders skip. A one-year cliff means nothing is owed if someone walks early — but for whatever has vested, most agreements also give the company a right to buy those shares back at cost. Without that clause, a founder who left in month fourteen still owns a piece of everything you build afterward.',
        text: 'What should happen to a founder’s shares if they leave in year one?',
        label: 'Shares on early departure',
        clause:
          'If a Founder ceases to provide services to the Company during the first year, the parties intend the following: {}',
      },
    ],
  },
  {
    name: 'Vesting',
    questions: [
      {
        lead: 'Vesting is just the mechanism that makes equity track contribution over time. It’s worth saying that it protects the founder who stays at least as much as it protects the company.',
        text: 'What vesting schedule do you have in mind?',
        label: 'Vesting schedule',
        clause: 'Founder Shares shall vest according to the following schedule: {}',
        options: [
          {
            value: '4 years, 1-year cliff',
            why: 'The startup standard — nothing vests in year one, then monthly after. Investors will expect roughly this.',
          },
          {
            value: '3 years, no cliff',
            why: 'Vests faster and rewards commitment sooner, but hands equity to someone who leaves almost immediately.',
          },
          {
            value: 'Not sure yet',
            why: 'Reasonable. I’d anchor on the four-year, one-year-cliff standard unless you have a specific reason to move off it.',
          },
        ],
      },
      {
        lead: 'One more here, and it’s the one founders most often wish they’d discussed. If you’re acquired holding unvested shares, an acquirer can let you go and keep that equity. Single-trigger acceleration vests everything the moment the deal closes; double-trigger only accelerates if you’re also pushed out afterward — that’s the more common landing spot, since acquirers are paying to keep the team.',
        text: 'Should vesting accelerate if the company is acquired?',
        label: 'Acceleration on acquisition',
        clause: 'Upon a Change of Control, vesting shall accelerate as follows: {}',
      },
    ],
  },
  {
    name: 'Decisions',
    questions: [
      {
        lead: 'Governance now — who gets to decide what alone. The usual “both must agree” list is raising money, selling the company, taking on debt, changing the equity split, and firing a cofounder. Require unanimity on too much and you deadlock over expense reports; on too little and one of you can make an irreversible call by yourself.',
        text: 'Which decisions should need both of you to agree?',
        label: 'Decisions requiring unanimity',
        clause:
          'The following matters require the unanimous written consent of all Founders: {}',
      },
      {
        lead: 'And when you disagree on one of those — you will — the process has to exist before you need it. Agreeing on a tiebreaker while you’re already stuck is close to impossible.',
        text: 'How do you want to break a deadlock?',
        label: 'Deadlock resolution',
        clause: 'In the event of a deadlock, the matter shall be resolved as follows: {}',
        options: [
          {
            value: 'An outside advisor',
            why: 'Neutral and usually respected, but it costs a favor or a fee and slows the decision down every time you invoke it.',
          },
          {
            value: 'The CEO decides',
            why: 'Fast, and honest about where power already sits. Worth naming explicitly rather than letting it be assumed.',
          },
          {
            value: 'Coin flip',
            why: 'Perfectly neutral and instant, but it settles nothing about who was right. Fine for small calls, risky for big ones.',
          },
          {
            value: 'Not sure yet',
            why: 'The most common answer, and the one I’d push back on — this is much easier to decide now than mid-argument.',
          },
        ],
      },
    ],
  },
  {
    name: 'IP',
    questions: [
      {
        lead: 'Last section, and it’s the one that actually blocks deals. Unassigned IP is among the most common things that stalls a fundraise or an acquisition once diligence starts.',
        text: 'Has everything built so far been assigned to the company?',
        label: 'IP assignment',
        clause:
          'All intellectual property created by the Founders to date has been assigned to the Company: {}',
        options: [
          {
            value: 'Yes',
            why: 'Good — make sure it’s documented in writing. “Yes” without paperwork doesn’t survive diligence.',
          },
          {
            value: 'No',
            why: 'Then this goes near the top of the list. It needs to be cleaned up before you raise or sell.',
          },
          {
            value: 'Not sure',
            why: 'Worth checking prior employment contracts and any IP assignment forms you signed elsewhere — the answer changes what the company actually owns.',
          },
        ],
      },
      {
        lead: 'And the trickier half of that. Work you did before the company existed isn’t automatically the company’s — not if you built it specifically for this idea, not even if you’re the only person who touched it. It needs a formal assignment, or an explicit license if you want to keep personal ownership.',
        text: 'Was any of it built before the company existed?',
        label: 'Pre-existing IP',
        clause:
          'Intellectual property created prior to the Company’s formation is treated as follows: {}',
      },
    ],
  },
];

const REPLY_DELAY_MS = 1600;
const FOLLOW_UP = 'Good question — a real agent would answer that here.';
const TOTAL_QUESTIONS = SECTIONS.reduce((sum, section) => sum + section.questions.length, 0);

/** An agent turn carries the lead-in alongside the question it introduces. */
const agentTurn = (question) => ({ role: 'agent', text: question.text, lead: question.lead });

/**
 * Index of the last agent message that moved the script forward — the question
 * currently on the table. Follow-up replies don't count, so asking one doesn't
 * push the question you're actually on off the screen.
 */
function scriptAnchor(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'agent' && messages[i].text !== FOLLOW_UP) return i;
  }
  return -1;
}

/**
 * Where in the thread the agent asked question `qi`. Script-advancing agent
 * messages land in question order, so counting them locates any of them —
 * including the closing message, which sits one past the last question.
 */
function questionMessageIndex(messages, qi) {
  let seen = -1;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'agent' && messages[i].text !== FOLLOW_UP) {
      seen += 1;
      if (seen === qi) return i;
    }
  }
  return -1;
}

const firstMessage = (index) => [agentTurn(SECTIONS[index].questions[0])];

/**
 * A clause reads as drafted prose with your answer set into it, so the panel
 * shows the document taking shape rather than a transcript of your inputs.
 * Until it's answered the slot is a blank, the way an unexecuted contract
 * looks — a gap you can see the shape of.
 */
function Clause({ template, value, fresh }) {
  const [before, after = ''] = template.split('{}');
  return (
    <span className="clause__text">
      {before}
      {value ? (
        <span className={`slot slot--filled ${fresh ? 'slot--fresh' : ''}`}>{value}</span>
      ) : (
        <span className="slot slot--blank" role="img" aria-label="not yet drafted" />
      )}
      {after}
    </span>
  );
}

/** The agreement as it stands, filling in as the interview goes. */
function Draft({
  answers,
  justFilled,
  activeSection,
  activeQuestion,
  canOpen,
  onOpenSection,
  onJump,
}) {
  const isTerm = (section) => section.clause !== false;
  const totalTerms = SECTIONS.filter(isTerm).reduce((n, s) => n + s.questions.length, 0);
  const draftedTerms = SECTIONS.reduce(
    (n, section, si) =>
      isTerm(section) ? n + section.questions.filter((_, qi) => answers[si][qi]).length : n,
    0,
  );

  let clauseNumber = 0;

  return (
    <article className="doc">
      <header className="doc__head">
        <p className="doc__eyebrow">Draft · unexecuted</p>
        <h2 className="doc__title">Cofounder Agreement</h2>
        <div className="doc__progress">
          <div className="doc__bar">
            <div
              className="doc__bar-fill"
              style={{ width: `${(draftedTerms / totalTerms) * 100}%` }}
            />
          </div>
          <span className="doc__count">
            {draftedTerms} of {totalTerms} terms
          </span>
        </div>
      </header>

      {SECTIONS.map((section, si) => {
        const active = si === activeSection;

        // Background is context, not a term — it sits above the numbered
        // clauses as recitals rather than pretending to be something signable.
        if (!isTerm(section)) {
          return (
            <section key={section.name} className={`recitals ${active ? 'is-active' : ''}`}>
              <h3 className="recitals__title">
                <button type="button" className="section-jump" onClick={() => onOpenSection(si)}>
                  {section.name}
                </button>
              </h3>
              {section.questions.map((question, qi) => {
                const value = answers[si][qi];
                const key = `${si}-${qi}`;
                const open = canOpen(si, qi);
                return (
                  <div key={key} className="recital">
                    <span className="recital__label">{question.label}</span>
                    {open ? (
                      <button
                        type="button"
                        className={`recital__value ${value ? '' : 'recital__value--empty'} ${
                          justFilled === key ? 'slot--fresh' : ''
                        }`}
                        onClick={() => onJump(si, qi)}
                      >
                        {value || '—'}
                      </button>
                    ) : (
                      <span className="recital__value recital__value--empty">{value || '—'}</span>
                    )}
                  </div>
                );
              })}
            </section>
          );
        }

        clauseNumber += 1;
        return (
          <section key={section.name} className={`article ${active ? 'is-active' : ''}`}>
            <h3 className="article__title">
              <button type="button" className="section-jump" onClick={() => onOpenSection(si)}>
                <span className="article__num">{clauseNumber}</span>
                {section.name}
              </button>
            </h3>

            {section.questions.map((question, qi) => {
              const value = answers[si][qi];
              const key = `${si}-${qi}`;
              const current = active && qi === activeQuestion;
              const body = (
                <>
                  <span className="clause__heading">
                    <span className="clause__num">
                      {clauseNumber}.{qi + 1}
                    </span>
                    {question.label}
                  </span>
                  <Clause template={question.clause} value={value} fresh={justFilled === key} />
                </>
              );

              // A clause is a way into the conversation that drafts it — but
              // only once the agent has actually got there. Jumping ahead would
              // skip the questions in between.
              return canOpen(si, qi) ? (
                <button
                  key={key}
                  type="button"
                  className={`clause clause--open ${current ? 'clause--current' : ''}`}
                  onClick={() => onJump(si, qi)}
                >
                  {body}
                  <span className="clause__revisit">{value ? 'Revisit' : 'Answer'}</span>
                </button>
              ) : (
                <div key={key} className="clause">
                  {body}
                </div>
              );
            })}
          </section>
        );
      })}

      <footer className="doc__foot">
        Placeholder language. Nothing here has been reviewed by a lawyer, and
        nothing is saved.
      </footer>
    </article>
  );
}

export default function App() {
  // Each section keeps its own chat, its own place in the script, and its own
  // completed flag. Switching tabs swaps which one is on screen.
  const [threads, setThreads] = useState(() =>
    SECTIONS.map((_, i) => (i === 0 ? firstMessage(0) : [])),
  );
  const [positions, setPositions] = useState(() => SECTIONS.map(() => 0));
  const [completed, setCompleted] = useState(() => SECTIONS.map(() => false));
  // Answers mirrored out of the chat so the draft can render them.
  const [answers, setAnswers] = useState(() => SECTIONS.map((s) => s.questions.map(() => null)));
  const [justFilled, setJustFilled] = useState(null);
  const [si, setSi] = useState(0);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);

  const inputRef = useRef(null);
  const transcriptRef = useRef(null);
  const threadRef = useRef(null);
  const msgTops = useRef(new Map());
  const lastSection = useRef(si);
  const lastAnchor = useRef(null);

  const messages = threads[si];
  const qi = positions[si];
  const isComplete = completed[si];
  const anchor = scriptAnchor(messages);

  // Keep the live question on stage, and slide earlier turns up the way a
  // chat does — measure where each message sat, scroll, then animate the gap.
  useLayoutEffect(() => {
    const scroller = transcriptRef.current;
    const thread = threadRef.current;
    if (!scroller || !thread) return;

    const jumped = lastAnchor.current === null || lastSection.current !== si;
    const advanced = !jumped && anchor !== lastAnchor.current && anchor !== -1;
    lastSection.current = si;
    lastAnchor.current = anchor;

    const padTop = parseFloat(getComputedStyle(scroller).paddingTop) || 0;
    const padBottom = parseFloat(getComputedStyle(scroller).paddingBottom) || 0;
    const view = scroller.clientHeight - padTop - padBottom;

    if (jumped || advanced) {
      const live = thread.querySelector(`[data-msg="${si}-${anchor}"]`);
      if (live) {
        // Stretch the thread so the live question can sit at the top even
        // when the history above it wouldn't otherwise overflow — that's
        // what lets the previous turn actually slide up.
        const peek = live.previousElementSibling ? 32 : 0;
        const top = live.offsetTop;
        thread.style.minHeight = `${Math.max(view, top + view - peek)}px`;
        scroller.scrollTop = Math.max(0, top - peek);
      }
    } else {
      scroller.scrollTop = scroller.scrollHeight;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextTops = new Map();
    thread.querySelectorAll('[data-msg]').forEach((node) => {
      const key = node.dataset.msg;
      const top = node.getBoundingClientRect().top;
      nextTops.set(key, top);
      if (jumped || reduce) return;
      const prev = msgTops.current.get(key);
      if (prev == null) return;
      const delta = prev - top;
      if (Math.abs(delta) < 1) return;
      node.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
        duration: 480,
        easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
      });
    });
    msgTops.current = nextTops;
  }, [messages, thinking, si, anchor]);

  // Size the composer to its contents. Doing it here rather than in the change
  // handler means it also works when the value changes on its own — clearing
  // on send leaves behind the height the last answer grew it to otherwise.
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }, [input]);

  // Clear the highlight on a freshly filled field after it has played.
  useEffect(() => {
    if (!justFilled) return;
    const timer = setTimeout(() => setJustFilled(null), 1400);
    return () => clearTimeout(timer);
  }, [justFilled]);

  function updateAt(setter, index, value) {
    setter((current) => current.map((item, i) => (i === index ? value : item)));
  }

  // `choice` is set when the answer came from a chip rather than the composer.
  function send(choice) {
    const text = (choice ?? input).trim();
    if (!text || thinking) return;

    const section = si;
    const questions = SECTIONS[section].questions;
    const wasComplete = completed[section];
    const hasMore = qi + 1 < questions.length;
    // No real NLP here — a trailing "?" is the stand-in for "this is a
    // follow-up, not an answer to the current question."
    const isFollowUp = !wasComplete && !choice && text.endsWith('?');
    // A finished section is out of script, and a follow-up mid-section is
    // off-script too — neither should overwrite an answer already captured
    // in the draft or move the interview along.
    const isAnswer = !wasComplete && !isFollowUp;

    // Nothing already said gets taken back — a revised answer is just the next
    // thing you said, the way it would be in a real conversation. Only the
    // draft treats it as a replacement.
    setThreads((current) =>
      current.map((thread, i) => (i === section ? [...thread, { role: 'user', text }] : thread)),
    );
    setInput('');
    setThinking(true);

    if (isAnswer) {
      setAnswers((current) =>
        current.map((row, i) => (i === section ? row.map((a, j) => (j === qi ? text : a)) : row)),
      );
      setJustFilled(`${section}-${qi}`);
    }

    setTimeout(() => {
      const next = SECTIONS[section + 1];
      const closing = next
        ? `That’s ${SECTIONS[section].name} covered. ${next.name} is what I’d look at next — but ask me anything about this first.`
        : 'That’s the last section. The draft has everything you’ve told me — ask me anything about it.';

      const reply = !isAnswer
        ? { role: 'agent', text: FOLLOW_UP }
        : hasMore
          ? agentTurn(questions[qi + 1])
          : { role: 'agent', text: closing };

      setThreads((current) =>
        current.map((thread, i) => (i === section ? [...thread, reply] : thread)),
      );

      if (isAnswer) {
        if (hasMore) {
          updateAt(setPositions, section, qi + 1);
        } else {
          updateAt(setCompleted, section, true);
        }
      }

      setThinking(false);
      inputRef.current?.focus();
    }, REPLY_DELAY_MS);
  }

  // Reopen a question that's already been answered — from the back button, or
  // by clicking the clause it drafted. Revisiting is a revision, not a reset:
  // the answer stays in the draft and stays in the transcript as a message you
  // already sent, so you work on top of it rather than from a blank composer.
  function revisit(section, target) {
    if (thinking) return;

    // Roll the thread back to just before the next question was asked, which
    // leaves the one you're revisiting as the live turn with your answer under
    // it. Anything said after that — follow-ups included — goes with it.
    const cut = questionMessageIndex(threads[section], target + 1);
    if (cut !== -1) updateAt(setThreads, section, threads[section].slice(0, cut));

    if (completed[section]) updateAt(setCompleted, section, false);
    updateAt(setPositions, section, target);
    setSi(section);
    inputRef.current?.focus();
  }

  function goBack() {
    if (thinking) return;
    const target = isComplete ? SECTIONS[si].questions.length - 1 : qi - 1;
    if (target < 0) return;
    revisit(si, target);
  }

  // A question in the draft is reachable once the agent has asked it. An
  // untouched section has only its opening question — everything after that
  // depends on answers that don't exist yet.
  function canOpen(section, question) {
    if (thinking) return false;
    return threads[section].length === 0 ? question === 0 : question <= positions[section];
  }

  // Clicking a clause in the draft goes to the question that drafts it.
  function jumpTo(section, question) {
    if (!canOpen(section, question)) return;
    if (threads[section].length === 0) {
      updateAt(setThreads, section, firstMessage(section));
      setSi(section);
      inputRef.current?.focus();
      return;
    }
    revisit(section, question);
  }

  // Each tab is its own conversation; opening an untouched one starts it.
  function openSection(index) {
    if (thinking || index === si) return;
    if (threads[index].length === 0) {
      updateAt(setThreads, index, firstMessage(index));
    }
    setSi(index);
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  function handleInput(event) {
    setInput(event.target.value);
  }

  const answered = answers.flat().filter(Boolean).length;
  const progress = (answered / TOTAL_QUESTIONS) * 100;
  const choices = !thinking && !isComplete ? SECTIONS[si].questions[qi].options : undefined;
  // Non-null only when this question has been answered before, i.e. you've
  // stepped back onto it.
  const priorAnswer = answers[si][qi];

  return (
    <div className="app">
      <div className="progress">
        <div className="progress__fill" style={{ width: `${progress}%` }} />
      </div>

      <header className="topbar">
        <nav className="tabs">
          {SECTIONS.map((section, i) => {
            const state = completed[i] ? 'done' : i === si ? 'active' : 'upcoming';
            return (
              <button
                key={section.name}
                type="button"
                className={`tab tab--${state}`}
                onClick={() => openSection(i)}
                aria-current={i === si ? 'step' : undefined}
              >
                {completed[i] && <span className="tab__check">✓</span>}
                {section.name}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="panes">
        <div className="pane pane--chat">
          <main className="transcript" ref={transcriptRef}>
            <div className="thread" ref={threadRef}>
              {messages.map((message, i) => (
                <div
                  key={i}
                  data-msg={`${si}-${i}`}
                  className={`msg msg--${message.role}`}
                >
                  {/* The agent frames the question before asking it. */}
                  {message.lead && <p className="msg__lead">{message.lead}</p>}
                  {message.text}
                </div>
              ))}

              {thinking && (
                <div className="msg msg--agent typing" aria-label="Typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {/* Each option states its own tradeoff — no hovering required. */}
              {choices && (
                <div className="choices">
                  {choices.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`choice ${
                        option.value === priorAnswer ? 'choice--picked' : ''
                      }`}
                      onClick={() => send(option.value)}
                      aria-pressed={option.value === priorAnswer}
                    >
                      <span className="choice__value">{option.value}</span>
                      <span className="choice__why">{option.why}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </main>

          <footer className="composer-wrap">
            <div className="composer-row">
              <button
                type="button"
                className="composer__back"
                onClick={goBack}
                disabled={thinking || (qi === 0 && !isComplete)}
                aria-label="Back"
              >
                ←
              </button>
              <div className="composer">
                <textarea
                  ref={inputRef}
                  className="composer__input"
                  rows={1}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  // The placeholder carries the fact that this isn't just a form —
                  // answering and asking both happen in the same box.
                  placeholder={
                    isComplete
                      ? 'Ask a follow-up…'
                      : choices
                        ? 'Pick one, or say it in your own words…'
                        : 'Answer, or ask a question…'
                  }
                  autoFocus
                />
                <button
                  type="button"
                  className="composer__send"
                  onClick={() => send()}
                  disabled={!input.trim() || thinking}
                  aria-label="Send"
                >
                  →
                </button>
              </div>
            </div>
            <p className="hint">Dummy app — nothing is saved</p>
          </footer>
        </div>

        <div
          className={`scrim ${draftOpen ? 'scrim--on' : ''}`}
          onClick={() => setDraftOpen(false)}
          aria-hidden="true"
        />

        {/* Collapsed by default; the tab on the right edge pulls it open. */}
        <aside
          className={`draft-panel ${draftOpen ? 'draft-panel--open' : ''}`}
          aria-label="Agreement preview"
        >
          <button
            type="button"
            className="draft-tab"
            onClick={() => setDraftOpen((open) => !open)}
            aria-expanded={draftOpen}
            aria-label={draftOpen ? 'Hide the agreement' : 'Show the agreement'}
          >
            <span className="draft-tab__arrow">{draftOpen ? '›' : '‹'}</span>
            {!draftOpen && (
              <>
                <span className="draft-tab__label">Agreement</span>
                <span className="draft-tab__meter">
                  <span
                    className="draft-tab__meter-fill"
                    style={{ height: `${progress}%` }}
                  />
                </span>
                <span className="draft-tab__count">
                  {answered}/{TOTAL_QUESTIONS}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            className="draft-panel__close"
            onClick={() => setDraftOpen(false)}
            tabIndex={draftOpen ? 0 : -1}
            aria-label="Close"
          >
            ✕
          </button>

          <div className="draft-panel__body">
            <Draft
              answers={answers}
              justFilled={justFilled}
              activeSection={si}
              activeQuestion={qi}
              canOpen={canOpen}
              onOpenSection={(section) => {
                openSection(section);
                setDraftOpen(false);
              }}
              onJump={(section, question) => {
                jumpTo(section, question);
                setDraftOpen(false);
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
