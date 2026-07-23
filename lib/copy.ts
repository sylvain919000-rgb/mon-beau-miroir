/**
 * Every legal and product-critical string in the app lives here.
 * Components import from this file only — never inline these texts.
 * Keeping copy centralized makes legal review and future translation easy.
 */

export const copy = {
  appName: "Mon Beau Miroir",
  tagline: "One photo. Honest human ratings. Prove you're a 10 out a 10.",

  signup: {
    termsTitle: "The short version of our Terms",
    termsBullets: [
      "You must be 18 or older to use Mon Beau Miroir.",
      "You'll upload one photo of yourself and other members will rate it. Honest opinions can sting — only join if you're comfortable with that.",
      "Be kind. Harassment, hate, threats, or sexual content will get your account removed.",
      "Messaging and some features are paid. Prices are always shown before you pay, taxes included.",
      "We can remove photos or accounts that break these rules.",
    ],
    termsLinkNote:
      "Full Terms of Service and Privacy Policy are linked below. They're written to be readable — please actually read them.",
    checkboxAge: "I am 18 years of age or older.",
    checkboxTos: "I have read and accept the Terms of Service and Privacy Policy.",
    privacyTitle: "How we handle your data, in plain words",
    privacyBullets: [
      "We store your email, your photo, the ratings you give and receive, and your messages.",
      "Your attribute ratings are private to you by default. They only become visible to others if you switch them to public.",
      "We never sell your photo or your data. We use Stripe for payments — we never see your card number.",
      "You can delete your account anytime; your photo and ratings go with it.",
      "Questions or data requests (GDPR): privacy@monbeaumiroir.com",
    ],
  },

  upload: {
    title: "Before you upload",
    bullets: [
      "This must be a real, recent photo of you — not someone else, not AI-generated, not a celebrity.",
      "No nudity, no minors anywhere in the frame, no offensive content.",
      "By uploading, you confirm you own this photo and consent to other members rating it.",
      "You can replace or remove your photo anytime. One active photo per profile.",
    ],
    checkbox: "This is a real photo of me and I own the rights to it.",
    cancel: "Cancel",
    confirm: "Upload my photo",
  },

  moderation: {
    pending:
      "Hang tight — your photo is being reviewed. It'll be visible to others shortly.",
    approved: "Approved — your photo is live and can be rated.",
    rejected:
      "We couldn't approve this photo. Please upload a photo that follows our guidelines.",
  },

  highScoreModal: {
    title9: "A 9? Nice. 🌟",
    title10: "A 10? Wow. ✨",
    body: "Top scores mean a lot here — they're rare and they make someone's day.",
    question: (score: number) => `Are you sure this one's a ${score}/10?`,
    cancel: "Let me reconsider",
    confirm: (score: number) => `Yes, it's a ${score}`,
  },

  attributes: {
    publicBanner: "The user has decided to display feature-specific ratings.",
    publicBannerSub: "You're seeing this breakdown because they chose to share it.",
    toggleLabel: "Make sub-attribute ratings public",
    toggleOffHelp: "Off (default): only you can see your attribute breakdown.",
    toggleOnHelp:
      "On: anyone viewing your photo sees your averages per attribute. You can turn this off anytime — it hides instantly.",
  },

  emails: {
    pendingSubject: "Your photo is in review 👀",
    pendingBody: (url: string) =>
      `Thanks for your upload!\n\nYour photo is now being reviewed by our team. ` +
      `It becomes visible to other members the moment it's approved — we'll email you.\n\n` +
      `Check your mirror anytime: ${url}/me\n\n— Mon Beau Miroir`,
    approvedSubject: "Your photo is live ✨",
    approvedBody: (url: string) =>
      `Good news — your photo has been approved and is now live!\n\n` +
      `Members can see and rate it from this moment. Watch your first ratings ` +
      `land here: ${url}/me/insights\n\n— Mon Beau Miroir`,
    milestoneSubject: (count: number) =>
      count === 1
        ? "Your first rating just landed 🎉"
        : `You've reached ${count} ratings 🎉`,
    milestoneBody: (count: number, url: string) =>
      (count === 1
        ? `Someone just rated your photo — your very first rating!`
        : `Your photo just received its rating number ${count}.`) +
      `\n\nSee your average and the full breakdown: ${url}/me/insights\n\n— Mon Beau Miroir`,
  },

  demographics: {
    title: "One quick thing before you rate",
    intro:
      "Tell us about yourself — it keeps ratings honest and powers the stats everyone sees. Asked once, then locked.",
    sexLabel: "Gender you were born with",
    male: "Male",
    female: "Female",
    monthLabel: "Birth month",
    yearLabel: "Birth year",
    submit: "Save and start rating",
    lockNote: "This can't be changed later, so answer truthfully.",
    underage: "You must be at least 18 to use Mon Beau Miroir.",
    incomplete: "Please answer all three questions.",
  },

  paywall: {
    sendTitle: (username: string) => `Send a message to ${username}`,
    sendIntro:
      "Messaging on Mon Beau Miroir is paid — it keeps conversations genuine and spam-free.",
    // Product names, prices and descriptions come from lib/billing/products.ts
    // (the single pricing source); this file holds only surrounding copy.
    readTitle: "Unlock your inbox to read it:",
    genderTitle: "Who rates you higher — men or women?",
    genderIntro:
      "Unlock the split of your ratings by the gender of your raters. One look per reveal, or see it anytime with a subscription.",
    vatNote: "Prices in USD, tax included. No free trial.",
    keepNote:
      "Your messages are never deleted — they'll be here whenever you unlock.",
    withdrawalWaiver:
      "I want immediate access and waive my 14-day EU withdrawal right for this digital service.",
  },

  report: {
    title: (kind: "photo" | "message") => `Report this ${kind}`,
    reasons: [
      "Not a real photo of this person",
      "Nudity or sexual content",
      "Possibly a minor",
      "Harassment or hate",
      "Something else",
    ],
    anonymityNote:
      "Reports are anonymous to the person you report. We review every one.",
    submit: "Submit report",
    thanks: "Thanks — we'll review this.",
  },
} as const;
