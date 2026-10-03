function t(q) { return String(q).toLowerCase(); }

window.DECISION_QUESTIONS = [
  {
    id: 'discussion',
    key: 'dec-discussion',
    type: 'multi',
    question: 'What type of decisions require a discussion between all cofounders?',
    hint: 'Anything that should never happen unless everyone’s on board — not office snacks.',
    doneLabel: "That's all",
    exclusive: ['None of the above'],
    choices: [
      { value: 'Accepting advisors', label: 'Accepting advisors' },
      { value: 'Accepting investors', label: 'Accepting investors' },
      { value: 'Equity allocations', label: 'Equity allocations' },
      { value: 'Hiring key personnel', label: 'Hiring key personnel' },
      { value: 'Major partnerships or contracts', label: 'Major partnerships or contracts' },
      { value: 'Product pivots', label: 'Product pivots' },
      { value: 'Selling the company or merging', label: 'Selling the company or merging' },
      { value: 'None of the above', label: 'None of the above' }
    ],
    reply(q) {
      const s = t(q);
      if (s.includes('three') || s.includes('unanimous') || s.includes('typical') || s.includes('most') || s.includes('require') || s.includes('common')) {
        return 'Most agreements put accepting investors, equity allocations, and a sale behind unanimous consent — those are the hardest to undo. Choose any that apply, or write your own list.';
      }
      if (s.includes('change') || s.includes('later') || s.includes('amend')) {
        return 'You can amend this later if everyone agrees. It just gets harder as stakes rise. Start with what you wouldn’t want done unilaterally.';
      }
      return 'This is for calls that shouldn’t happen unless you’re both on board. Choose any that apply, or write your own.';
    }
  },
  {
    id: 'voting',
    key: 'dec-voting-power',
    type: 'single',
    question: 'Should equity ownership reflect voting power?',
    hint: 'Votes can follow each person’s equity, or everyone can have an equal vote.',
    choices: [
      { value: 'Yes', label: 'Yes — votes follow equity', match: /\b(yes|yeah|yep|equity|proportional|ownership|percent)\b/i },
      { value: 'No', label: 'No — equal votes', match: /\b(no|nope|equal|50\s*\/?\s*50|same vote)\b/i }
    ],
    reply(q) {
      const s = t(q);
      if (s.includes('equal') || s.includes('50/50') || s.includes('50-50') || s.includes('partnership')) {
        return 'Equal votes make sense if you want a partnership dynamic even when equity isn’t even. If you’re already 50/50, both options are the same.';
      }
      if (s.includes('investor') || s.includes('typical') || s.includes('usual') || s.includes('most') || s.includes('default') || s.includes('standard') || s.includes('should')) {
        return 'Tying votes to equity is the usual default — it matches economic stake. Choose Yes unless you specifically want equal votes.';
      }
      return 'If ownership is equal, both options are the same. If it isn’t, tying votes to equity is the usual default.';
    }
  },
  {
    id: 'deadlock',
    key: 'dec-deadlock',
    type: 'single',
    question: 'If cofounders are deadlocked, how should the tie be resolved?',
    hint: 'Decide how to break a stalemate before it becomes a staring contest nobody wins.',
    choices: [
      { value: 'External advisor / board member', label: 'Consult a shared advisor / board member' },
      { value: 'Mediation', label: 'Mediation with a neutral third party' },
      { value: 'Domain authority', label: 'Final decision by domain' }
    ],
    reply(q) {
      const s = t(q);
      if (s.includes('investor') || s.includes('vc') || s.includes('fund') || s.includes('raise')) {
        return 'Investors care that some path exists. Mediation looks the most institutional if you plan to raise; for seed, a shared advisor is usually enough.';
      }
      if (s.includes('early') || s.includes('typical') || s.includes('common') || s.includes('most') || s.includes('should')) {
        return 'For an early team, a trusted advisor is the lightest first step — faster and less adversarial than mediation.';
      }
      return 'You rarely use this in practice — picking one is the point. A shared advisor is the most common starting point for two cofounders.';
    }
  },
  {
    id: 'shotgun',
    key: 'dec-shotgun',
    type: 'single',
    question: 'Do you want to include a shotgun clause if cofounders cannot resolve deadlocks?',
    hint: 'You offer to buy each other out. You’re incentivized to make a reasonable offer because you might be bought out.',
    choices: [
      { value: 'Yes', label: 'Yes', match: /\b(yes|yeah|yep|include|add it)\b/i },
      { value: 'No', label: 'No', match: /\b(no|nope|skip)\b/i }
    ],
    reply(q) {
      const s = t(q);
      if (s.includes('afford') || s.includes('capital') || s.includes('money') || s.includes("can't buy") || s.includes('cannot buy')) {
        return 'That’s a real risk if one founder has more capital. You can still include it and add a 60–90 day payment window so it stays fair. Attorneys usually still recommend Yes.';
      }
      if (s.includes('how') || s.includes('work') || s.includes('trigger') || s.includes('price') || s.includes('fair')) {
        return 'One founder names a price; the other has to buy or sell at that price. That uncertainty keeps offers honest, and it almost never gets used.';
      }
      return 'One founder names a price for the company; the other has to buy or sell at that price. It almost never gets used — its job is to keep both of you reasonable. Attorneys usually recommend including it.';
    }
  },
  {
    id: 'cooling',
    key: 'dec-cooling',
    type: 'single',
    question: 'Should a cooling-off period apply before a shotgun clause can be triggered?',
    hint: 'A forced pause — usually 30 days — so nobody can launch a buyout in the heat of a fight.',
    choices: [
      { value: 'Yes', label: 'Yes', match: /\b(yes|yeah|yep)\b/i },
      { value: 'No', label: 'No', match: /\b(no|nope)\b/i }
    ],
    reply() {
      return 'Shotgun clauses are most dangerous when they’re used as a weapon. A cooling-off period doesn’t block the buyout — it just makes sure the trigger is a decision, not a reaction. 30 days is the usual default.';
    }
  },
  {
    id: 'indie',
    key: 'dec-indie-board',
    type: 'single',
    question: 'Should an independent director hold a tie-breaking vote?',
    hint: 'Someone you both already trust, who only steps in when you two are stuck.',
    choices: [
      { value: 'Yes', label: 'Yes', match: /\b(yes|yeah|yep)\b/i },
      { value: 'No', label: 'No', match: /\b(no|nope)\b/i }
    ],
    reply(q) {
      const s = t(q);
      if (s.includes('who') || s.includes('slow') || s.includes('day')) {
        return 'Usually a shared advisor or former founder you both already trust. They only vote on deadlocks, not ordinary decisions — so day-to-day stays with the two of you.';
      }
      if (s.includes('investor') || s.includes('board') || s.includes('expect')) {
        return 'Seed investors care more that some deadlock path exists. A formal independent director usually shows up around a priced round.';
      }
      return 'It’s a more formal version of the advisor path, with a standing vote instead of a one-off consult.';
    }
  },
  {
    id: 'spend',
    key: 'dec-spend-limit',
    type: 'single',
    question: 'Should cofounders be able to spend below a set amount without a vote?',
    hint: 'Agree on a ceiling now so everyday expenses don’t turn into meetings.',
    choices: [
      { value: 'Yes', label: 'Yes — set a spending limit', match: /\b(yes|yeah|yep|limit|ceiling)\b/i },
      { value: 'No', label: 'No — vote on every spend', match: /\b(no|nope|every|all spend)\b/i }
    ],
    reply() {
      return 'A limit keeps the company moving. Typical early-stage ceilings are $1k–$5k; anything above still needs a conversation. Voting on every spend is maximum alignment, but it gets slow once you’re hiring or running ads.';
    }
  }
];
