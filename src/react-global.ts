// Expose React globalement pour le bundle client : certaines dépendances
// compilées (better-auth / convex react) référencent `React` global et le
// runtime JSX peut le supposer présent. Sans ça, le client jette
// "React is not defined" et l'hydratation échoue (aucune interactivité :
// navbar au scroll, menu mobile, formulaire de réservation…).
import * as React from 'react'
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

const g = globalThis as unknown as { React?: typeof React }
if (!g.React) g.React = React

export { startTransition, StrictMode, hydrateRoot }
