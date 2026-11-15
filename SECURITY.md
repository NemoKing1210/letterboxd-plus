# Security Policy

Letterboxd Plus is a client-side userscript. It runs in your browser on
Letterboxd pages, keeps settings and caches in userscript-manager storage, and
talks to Rotten Tomatoes, Metacritic, and Google Translate through
`GM_xmlhttpRequest`. It has no backend service and no account system of its
own.

## Supported versions

Only the latest published version is supported. The script updates itself from
GitHub `main` (see the README), so update before reporting an issue.

| Version | Supported |
|---------|-----------|
| Latest release | ✅ |
| Older releases | ❌ |

The version is shown in the settings panel header, for example `v0.23.1`, and
in the userscript metadata.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub's private vulnerability reporting:

https://github.com/NemoKing1210/letterboxd-plus/security/advisories/new

If the private reporting form is unavailable, open a minimal issue that asks
for a private channel without disclosing the vulnerability details.

Include as much as you can:

- what the issue is and what an attacker could do with it;
- the affected version, browser, and userscript manager;
- reproduction steps or a proof of concept;
- relevant console output — warnings from the script are prefixed with
  `[Letterboxd Plus]`.

You will get an acknowledgement as soon as possible, and a fix or mitigation
plan once the report is triaged. This is a volunteer project: there is no bug
bounty.

## Scope

In scope:

- the userscript source (`src/`) and the generated install artifacts;
- injection, storage, URL and HTML escaping, network requests, and the settings
  and cache surfaces;
- anything that could leak user data, execute untrusted code, or let page
  content escape into userscript-manager privileges.

Out of scope:

- vulnerabilities in Letterboxd, Rotten Tomatoes, Metacritic, Google, browsers,
  or userscript managers — report those to their vendors;
- issues that require a modified copy of the script, or that only affect a
  manager running the script with `@grant none`;
- spam or denial-of-service testing against Letterboxd or third-party
  services.

## Testing guidelines

Test only against your own Letterboxd account and pages you are allowed to use.
Do not access other people's accounts, send automated high-volume requests to
Letterboxd, Rotten Tomatoes, or Metacritic, or publish a working exploit before
a fix is available.

Thank you for helping keep Letterboxd Plus and its users safe.
