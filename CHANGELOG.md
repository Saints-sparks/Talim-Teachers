# Changelog

All notable changes to Talim Teachers (the teacher portal) are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project uses [Semantic Versioning](https://semver.org/).

## [1.5.0] - 2026-10-06

Platform sync release (`talimBE-V2/docs/v1.5-platform-sync.md`): one support
system across every Talim app, and version 1.5.0 across the platform.

### Added

- **My tickets** under Settings → Help, on the one ticket system (§1):
  - a list of the teacher's tickets with status chips (Open, In progress,
    Waiting on you, Resolved, Closed), an unread dot when support has written,
    and when each last changed; "Load more" for older ones;
  - **New ticket**: what it is about, a subject (3–140 characters), the
    message (up to 5,000) and up to five files. Teachers raise tickets to
    Talim support only; school matters stay with "Contact the school office";
  - the **thread**: every message with its files, a reply box with
    attachments, **Reopen** within 7 days of a ticket being resolved (with the
    deadline shown), and **Close ticket** after a confirm step;
  - clear words when the API refuses (409): a closed ticket, a reopen after
    the 7-day window, the 500-message cap. The draft is kept and the ticket
    reloaded.
- A support notification (`{ page: 'support', ticketId }`) opens the ticket's
  thread at `/settings?tab=help&ticket=<id>`.
- Notifications gain a **Support** tab and a "Support" chip for the new
  `support` category.
- A page guide for Settings → Help that points out My tickets.

### Changed

- Settings → About shows "Version 1.5.0", read from `package.json`.
- The version in `package.json` is now 1.5.0.

### Removed

- "Report a problem" and its `POST /support/tickets` call; tickets replace it.
