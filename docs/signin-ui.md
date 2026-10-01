# Talim sign-in look (`signin-ui`)

The sign-in screen shared by the Talim web apps: a white form column with the
tree logo, "Talim" and the app's name in a pale blue pill, "Welcome back", the
form, and a "© Talim · support" line; from the `lg` breakpoint, a navy panel on
the right with an illustration, a title, a sentence and three decorative dots.

Teachers uses it on `/` (and its parts on `/set-password`). Talim-students-web
(Next.js) and talim-parents (Vite + React) adopt the same look by copying the
folder and wiring their own auth.

Source: `src/components/auth/signin-ui/` in Talim-Teachers.

| File | Exports |
| --- | --- |
| `SignInShell.tsx` | `SignInShell`, `SignInFooter` |
| `SignInHeader.tsx` | `SignInLogoHeader`, `SignInHeading` |
| `SignInField.tsx` | `SignInField`, `SignInPasswordField`, `SignInCheckbox`, `SignInOptionsRow` |
| `SignInErrorBanner.tsx` | `SignInErrorBanner`, type `SignInErrorTone` |
| `SignInPrimaryButton.tsx` | `SignInPrimaryButton` |
| `classes.ts` | `signInInputClass`, `signInLabelClass`, `signInLinkClass`, `signInInlineLinkClass`, `signInDescribedBy` |
| `index.ts` | everything above |

## What the folder needs

- React 18 or 19, Tailwind CSS 3.4 with `darkMode: "class"` (all three apps
  have it), and `lucide-react` (icons: `Eye`, `EyeOff`, `AlertCircle`,
  `ShieldAlert`, `Loader2`).
- The folder must be inside Tailwind's `content` globs, so its classes are
  generated: Teachers scans `src/components/**`, Students `components/**`
  (put it at `components/auth/signin-ui/`), Parents `src/**` (for example
  `src/Components/auth/signin-ui/`).
- Nothing else: no app hooks, no router, no `next/image`, no path aliases
  between the files (they import each other relatively). Images and links are
  passed in as elements, so each app uses its own (`next/image` and
  `next/link`, or `<img>` and react-router's `Link`).
- `SignInField.tsx` starts with `"use client"` (it holds the show/hide state).
  Next.js needs it; Vite ignores it.

Copy the folder as is. Keep the copies identical across apps, so a fix in one
can be copied to the others.

## Components

### `SignInShell`

The layout and the page's `main` landmark.

| Prop | Type | Notes |
| --- | --- | --- |
| `children` | `ReactNode` | The left column: logo header, heading, banner, form, footer. |
| `illustration` | `ReactNode` | Sits in a square `relative` box: `<Image fill className="object-contain" />` (Next) or `<img className="h-full w-full object-contain" />`. Use `alt=""`: the panel title says the same. |
| `panelTitle` | `ReactNode` | The bold line under the illustration. |
| `panelText` | `ReactNode` | The sentence under it. |

The navy panel is hidden under `lg`, so phones see the form column only.

### `SignInFooter`

"© Talim 2026 · support@…" under the form.

| Prop | Type | Notes |
| --- | --- | --- |
| `supportEmail` | `string` | Shown as a `mailto:` link. |
| `brand` | `string?` | Default `"Talim"`. |
| `year` | `number?` | Default: the current year. |

### `SignInLogoHeader`

| Prop | Type | Notes |
| --- | --- | --- |
| `logo` | `ReactNode` | The 40px tree mark (`h-10 w-10`), with `alt=""` (the brand name is written next to it). |
| `appName` | `string` | The pill: "Teachers", "Students" or "Parents". |
| `brand` | `string?` | Default `"Talim"`. |
| `className` | `string?` | Spacing under the row; default `mb-8`. |

### `SignInHeading`

| Prop | Type | Notes |
| --- | --- | --- |
| `title` | `ReactNode` | The page's one `h1` ("Welcome back"; the e2e specs look for it). |
| `subtitle` | `ReactNode?` | The grey line under it. |

### `SignInField`

A labelled text input. Every prop not listed goes to the `<input>`
(`name`, `value`, `onChange`, `autoComplete`, `placeholder`, `disabled`,
`required`, …), and `ref` is forwarded to it (to focus the first error).

| Prop | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Required. The label, the hint (`${id}-hint`) and the error (`${id}-error`) are tied to it. |
| `label` | `ReactNode` | The visible label. |
| `hint` | `ReactNode?` | A lasting line under the input (a format example). |
| `error` | `ReactNode?` | Red line under the input; sets `aria-invalid` and a red border. |
| `invalid` | `boolean?` | Marks the field invalid with no error of its own (the wrong-credentials banner explains it). |
| `describedBy` | `string[]?` | Other ids for `aria-describedby` (the banner's id, a rules list). |
| `after` | `ReactNode?` | Content under the error and hint (a rules checklist). |
| `className` | `string?` | Classes for the wrapper (spacing). |

`aria-describedby` is always computed: error, then hint, then `describedBy`.

### `SignInPasswordField`

`SignInField` for a password, with an eye button inside its right edge. The
button is `type="button"` (never submits), focusable, 44 × 44px, and named
"Show password" / "Hide password".

Extra props:

| Prop | Type | Notes |
| --- | --- | --- |
| `visible` | `boolean?` | Controlled visibility. Leave out to let the field keep its own state. |
| `onToggleVisible` | `() => void?` | Called by the eye button when controlled. |
| `toggleLabels` | `[show, hide]?` | The button's names; default `["Show password", "Hide password"]`. |
| `hideToggle` | `boolean?` | No button (a field that follows another field's toggle). |

### `SignInCheckbox` and `SignInOptionsRow`

`SignInCheckbox` is a small checkbox inside its label ("Keep me signed in");
the label is a 44px tall target. Props: `label`, plus any `<input>` props
(`name`, `checked`, `onChange`).

`SignInOptionsRow` lays out the checkbox and a link ("Forgot password?") on
one row. It pulls itself in by 12px above and below, so the 44px targets keep
the compact spacing. Give the link `className={signInLinkClass}`.

### `SignInErrorBanner`

The banner above the form for a failure that is not one field's. It has
`role="alert"`, so it is read out when it appears.

| Prop | Type | Notes |
| --- | --- | --- |
| `tone` | `"danger" \| "warning" \| "neutral"` | Red: refused account. Amber: wrong credentials. Grey: anything else. |
| `title` | `ReactNode?` | Bold first line ("Access denied"); the message is then set smaller under it. |
| `children` | `ReactNode` | The explanation. |
| `icon` | `"alert" \| "shield"?` | Use `"shield"` for a refused account. |
| `id` | `string?` | So a field can name the banner in `describedBy`. |
| `className` | `string?` | Spacing; the sign-in page uses `mt-6`. |

### `SignInPrimaryButton`

The full-width navy button, 44px tall. It submits by default.

| Prop | Type | Notes |
| --- | --- | --- |
| `loading` | `boolean?` | Shows a spinner and `loadingText`, and disables the button. |
| `loadingText` | `ReactNode?` | "Signing in…". |
| `children` | `ReactNode` | "Sign in". |

Any other `<button>` prop (`disabled`, `type`, `onClick`) is passed through.

## Putting it together

```tsx
<SignInShell illustration={…} panelTitle="Talim Teacher Portal" panelText="…">
  <SignInLogoHeader appName="Teachers" logo={…} />
  <SignInHeading title="Welcome back" subtitle="…" />

  {error ? <SignInErrorBanner id="signin-alert" tone="warning" className="mt-6">…</SignInErrorBanner> : null}

  <form onSubmit={…} noValidate aria-label="Sign in" className="mt-8 space-y-5">
    <SignInField id="identifier" name="identifier" label="…" hint="…" autoComplete="username" … />
    <SignInPasswordField id="password" name="password" label="Password" autoComplete="current-password" … />
    <SignInOptionsRow>
      <SignInCheckbox label="Keep me signed in" name="rememberMe" checked={…} onChange={…} />
      <Link href="/forgot-password" className={signInLinkClass}>Forgot password?</Link>
    </SignInOptionsRow>
    <SignInPrimaryButton loading={isLoading} loadingText="Signing in…">Sign in</SignInPrimaryButton>
  </form>

  <SignInFooter supportEmail="support@mytalim.com" />
</SignInShell>
```

Teachers' version is `src/app/page.tsx` (layout) and
`src/components/auth/SignInForm.tsx` (the form and its banner).

## Copy per app

| | Teachers | Students | Parents |
| --- | --- | --- | --- |
| Pill (`appName`) | Teachers | Students | Parents |
| Heading | Welcome back | Welcome back | Welcome back |
| Subtitle | Sign in to the teacher portal with your school email or staff number. | Sign in to continue your learning journey. | Sign in to track your child's learning journey. |
| Identifier label | Email or staff number | Email or Student ID | Email address |
| Placeholder | you@school.com | you@school.com or ESEC-260100001 | you@example.com |
| Hint | A staff number looks like ESEC-260200001. | Student ID format: school slug-student ID, e.g. ESEC-260100001. | none |
| Wrong credentials | Incorrect email, staff number, or password. Please double-check your credentials and try again. | Incorrect email, student ID, or password. Please check your credentials and try again. | the message `login` returns |
| Panel title | Talim Teacher Portal | Talim Student Portal | Talim Parent Portal |
| Panel text | Manage your classes, students, attendance, and curriculum — all in one place. | Access your subjects, timetable, results, and resources — all in one place. | Stay connected with your child's school, track their progress, and manage leave requests. |
| Logo | `/icons/login/tree.svg` | `/icons/login/tree.svg` | `src/assets/logo.svg` (imported) |
| Illustration | `/icons/login/school-illustration.svg` | `/icons/login/school-illustration.svg` | `/Par.svg` |
| Support | support@mytalim.com | support@mytalim.com | `SUPPORT_EMAIL` (`src/lib/support.ts`) |
| "Keep me signed in" / "Forgot password?" | both | both | neither today |

The copy above is what each app shows today (Students' and Parents' from their
current sign-in pages); the button stays "Sign in" everywhere.

## What each app wires

The components only draw. Each app keeps, in its own page:

1. **Its auth hook.** Call `login`, show `isLoading` on the button and
   disable the fields while it runs, and turn a refusal into a banner tone:
   - Teachers: `useAuth()` from `@/app/hooks/useAuth`; `classifyLoginError`
     and `validateSignIn` from `src/hooks/auth/signIn.logic.ts` (access denied
     → `danger` with the shield and title "Access denied", invalid credentials
     → `warning`, anything else → `neutral`).
   - Students: `useAuth()` from `@/hooks/useAuth` (`login`, `isLoading`) and
     `useAuthContext()` from `@/contexts/AuthContext` (`isAuthenticated`,
     `isLoading`); the same three kinds, from `getErrorMessage`.
   - Parents: `useAuth()` from `src/services/auth.services` (`login`,
     `loading`); `login` returns `{ kind: 'success' | 'access_denied' |
     'invalid_credentials' | 'unknown', message }`, so map the kind to a tone.
2. **Its routes.** Where the sign-in page lives and where it sends people:
   - Teachers: `/` (`SIGN_IN_ROUTE`); after sign-in `login` routes to
     `/set-password`, `/onboarding` or the teacher's landing page; "Forgot
     password?" is `/forgot-password`.
   - Students: `/signin`; then `/dashboard`; "Forgot password?" is
     `/forgot-password`.
   - Parents: `/`; then `/dashboard` (react-router `navigate`).
3. **The signed-in redirect.** A visitor who already has a session is sent
   on instead of seeing the form. Teachers: `useSignedInRedirect` in
   `src/app/page.tsx` (with `resolveSignedInRoute`); Students: the effect on
   `useAuthContext()` in `app/signin/page.tsx`; Parents: none today (its
   `ProtectedRoute` only guards the signed-in pages), so add one on
   `useAuth().user` if wanted.
4. **The loader.** Each app keeps its own full-screen "Talim" loader
   (`ModernLoader`): shown while `login` runs and, in Teachers, instead of the
   page while the session restores. It is not part of the folder (Teachers'
   uses Next's styled-jsx).
5. **Images and links.** Pass the logo and illustration as elements, and use
   the app's link component with `signInLinkClass`.
6. **Field focus.** Focus the first invalid field on submit (`ref` is
   forwarded by both fields).

## Dark mode

Every part has `dark:` variants: the form column turns slate-900, labels
slate-100, the subtitle and hints slate-400, inputs slate-800 with slate-700
borders, the pill `#1a2740` with blue-300 text, the button blue-600, links
blue-300, and the banners deep red, amber or slate with light text. The navy
panel stays navy.

Teachers also has global dark overrides for hex and grey classes in
`globals.css`. They win over the `dark:` variants but land on the same
colours, except the banners' backgrounds and the grey banner's text, which
come out a shade different. The other apps get exactly the `dark:` values.

## Accessibility contract

- Every input has a `<label for>`; errors and hints are named in
  `aria-describedby`; an invalid field has `aria-invalid`.
- The refusal banner has `role="alert"` and an id the fields can name.
- The password toggle is a focusable 44px `type="button"` with a name.
- The checkbox label, the "Forgot password?" link and the button are at least
  44px tall.
- Set `autoComplete` on the fields (`username`, `current-password`, and
  `new-password` / `one-time-code` on reset pages).
- Small grey text is AA on white in the stock palette: footer `gray-500`,
  banner text `red-700` / `amber-700` / `gray-600`.

## Selectors the Teachers e2e specs rely on

`#identifier`, `#password`, the heading "Welcome back", the button "Sign in",
the checkbox labelled "Keep me signed in" and the link "Forgot password?"
(`e2e/01-signin.spec.ts`, `e2e/auth.setup.ts`, `e2e/support/auth.ts`).
Keep these ids and words when adopting the look elsewhere, so the same specs
can be ported.
