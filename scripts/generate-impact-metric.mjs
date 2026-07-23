import { writeFile } from "node:fs/promises";

const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error("GITHUB_TOKEN is required to refresh profile metrics.");
}

const to = new Date();
const from = new Date(to);
from.setUTCFullYear(from.getUTCFullYear() - 1);

const query = `query($from: DateTime!, $to: DateTime!) {
  viewer {
    repositories(first: 1, privacy: PUBLIC) { totalCount }
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar { totalContributions }
    }
  }
}`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "sakshamm-goyal-profile-metrics",
  },
  body: JSON.stringify({ query, variables: { from: from.toISOString(), to: to.toISOString() } }),
});

if (!response.ok) {
  throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
}

const payload = await response.json();

if (payload.errors?.length) {
  throw new Error(payload.errors.map(({ message }) => message).join("; "));
}

const contributions = payload.data.viewer.contributionsCollection.contributionCalendar.totalContributions;
const repositories = payload.data.viewer.repositories.totalCount;
const formatter = new Intl.NumberFormat("en-US");
const updated = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(to).toUpperCase();

const svg = `<svg width="1200" height="190" viewBox="0 0 1200 190" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title description">
  <title id="title">Proof of work</title>
  <desc id="description">${formatter.format(contributions)} contributions over the last 12 months and ${formatter.format(repositories)} public repositories. Refreshed daily from GitHub.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="190" gradientUnits="userSpaceOnUse"><stop stop-color="#0B172E"/><stop offset="0.5" stop-color="#16284A"/><stop offset="1" stop-color="#24143E"/></linearGradient>
    <linearGradient id="accent" x1="48" y1="38" x2="1146" y2="152" gradientUnits="userSpaceOnUse"><stop stop-color="#67E8F9"/><stop offset="0.5" stop-color="#A78BFA"/><stop offset="1" stop-color="#F9A8D4"/></linearGradient>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="clip"><rect width="1200" height="190" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect width="1200" height="190" fill="url(#bg)"/>
    <g opacity="0.16"><path d="M0 38H1200M0 76H1200M0 114H1200M0 152H1200" stroke="#C4B5FD"/><path d="M38 0V190M76 0V190M114 0V190M152 0V190M190 0V190M228 0V190M266 0V190M304 0V190M342 0V190M380 0V190M418 0V190M456 0V190M494 0V190M532 0V190M570 0V190M608 0V190M646 0V190M684 0V190M722 0V190M760 0V190M798 0V190M836 0V190M874 0V190M912 0V190M950 0V190M988 0V190M1026 0V190M1064 0V190M1102 0V190M1140 0V190M1178 0V190" stroke="#C4B5FD"/></g>
    <text x="50" y="47" fill="#CFFAFE" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" letter-spacing="3.1">PROOF OF WORK</text>
    <text x="50" y="76" fill="#E2E8F0" font-family="Arial, Helvetica, sans-serif" font-size="14">A live signal, built from GitHub activity.</text>
    <path d="M50 98H678" stroke="url(#accent)" stroke-width="1.2" stroke-opacity="0.58"/>
    <text x="50" y="137" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">${formatter.format(contributions)}</text>
    <text x="50" y="162" fill="#A5F3FC" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" letter-spacing="1.8">CONTRIBUTIONS · LAST 12 MONTHS</text>
    <path d="M334 116V166" stroke="#C4B5FD" stroke-opacity="0.36"/>
    <text x="366" y="137" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">${formatter.format(repositories)}</text>
    <text x="366" y="162" fill="#DDD6FE" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" letter-spacing="1.8">PUBLIC REPOSITORIES</text>
    <path d="M786 124L869 79L954 123L1047 58L1144 108" stroke="url(#accent)" stroke-width="1.5" stroke-dasharray="6 7"><animate attributeName="stroke-dashoffset" values="0;-52" dur="3.2s" repeatCount="indefinite"/></path>
    <path d="M786 124L883 148L954 123L1064 144L1144 108" stroke="#67E8F9" stroke-opacity="0.4" stroke-dasharray="3 7"/>
    <g filter="url(#glow)"><circle cx="786" cy="124" r="4" fill="#67E8F9"/><circle cx="869" cy="79" r="5" fill="#A78BFA"/><circle cx="954" cy="123" r="5" fill="#F9A8D4"/><circle cx="1047" cy="58" r="5" fill="#67E8F9"/><circle cx="1144" cy="108" r="5" fill="#C4B5FD"/><circle cx="883" cy="148" r="3.5" fill="#67E8F9"/><circle cx="1064" cy="144" r="3.5" fill="#F9A8D4"/></g>
    <text x="965" y="174" text-anchor="middle" fill="#E2E8F0" fill-opacity="0.78" font-family="Arial, Helvetica, sans-serif" font-size="10" letter-spacing="1.6">REFRESHES DAILY · ${updated}</text>
  </g>
</svg>
`;

await writeFile(new URL("../assets/impact.svg", import.meta.url), svg);
