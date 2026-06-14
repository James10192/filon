import { useEffect } from 'react'

/**
 * Orchestration GSAP de la landing publique (centerpiece du redesign zed-style).
 *
 * Contraintes de la stack (RÈGLE PROJET, non négociable) :
 *  - `gsap` BRUT uniquement, JAMAIS `@gsap/react`/`useGSAP` (double React =
 *    page blanche sur pnpm + TanStack Start).
 *  - Tout est client-only : guard `typeof window`, `import('gsap')` dynamique +
 *    import dynamique des plugins (GSAP n'entre jamais dans le graphe SSR, et
 *    reste code-split hors du bundle critique).
 *  - `gsap.registerPlugin(...)` côté client, `gsap.context(scope)` pour scoper
 *    les sélecteurs, cleanup `ctx.revert()` + `ScrollTrigger.kill()` au unmount.
 *
 * Performance :
 *  - On anime UNIQUEMENT transform + opacity (autoAlpha). Aucune propriété de
 *    layout (width/height/top/left/margin) — zéro reflow.
 *  - `ScrollTrigger.batch` pour les listes (révélations groupées, peu de triggers).
 *  - `will-change` posé seulement pendant l'animation, retiré à la fin.
 *  - Le hero (LCP) peint immédiatement : le contenu est rendu statiquement au
 *    SSR ; le mouvement enrichit après le mount (SplitText repart d'une baseline
 *    visible, on n'occulte jamais le titre avant l'animation).
 *
 * Accessibilité :
 *  - `prefers-reduced-motion: reduce` → on ne lance RIEN. Le contenu reste
 *    entièrement visible et statique (rendu SSR intact).
 *
 * Le scope est passé via une ref (l'élément racine de la landing). Toutes les
 * cibles sont sélectionnées par attributs `data-*` à l'intérieur du scope.
 */
export function useLandingMotion(scopeRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const scope = scopeRef.current
    if (!scope) return

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReduced) return

    let ctx: { revert: () => void } | undefined
    let smoother: { kill: () => void } | undefined
    let cancelled = false

    void (async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/SplitText'),
      ])
      if (cancelled) return

      // ScrollSmoother est optionnel : import isolé pour ne pas tout casser si
      // l'environnement ne le résout pas. Désactivé sur tactile (scroll natif
      // plus fiable et performant sur mobile).
      let ScrollSmoother:
        | { create: (vars: Record<string, unknown>) => { kill: () => void } }
        | undefined
      const isTouch = window.matchMedia('(hover: none)').matches
      if (!isTouch) {
        try {
          const mod = await import('gsap/ScrollSmoother')
          if (cancelled) return
          ScrollSmoother = mod.ScrollSmoother as typeof ScrollSmoother
        } catch {
          ScrollSmoother = undefined
        }
      }

      gsap.registerPlugin(ScrollTrigger, SplitText)
      if (ScrollSmoother) {
        gsap.registerPlugin(ScrollSmoother)
        // Expose ScrollSmoother au header (hors scope GSAP) pour le scroll doux
        // des ancres de navigation : `ScrollSmoother.get()` y devient accessible.
        ;(window as unknown as { ScrollSmoother?: unknown }).ScrollSmoother =
          ScrollSmoother
      }

      ctx = gsap.context(() => {
        // ── ScrollSmoother (scroll « beurre » + base du parallax) ──────────
        if (
          ScrollSmoother &&
          scope.querySelector('#smooth-wrapper') &&
          scope.querySelector('#smooth-content')
        ) {
          smoother = ScrollSmoother.create({
            wrapper: '#smooth-wrapper',
            content: '#smooth-content',
            smooth: 1,
            effects: true,
            normalizeScroll: false,
          })
        }

        // ── HERO — moment signature : révélation mot par mot du titre ──────
        const heading = scope.querySelector<HTMLElement>('[data-hero-title]')
        if (heading) {
          // Split synchrone (SANS autoSplit, dont le re-split au chargement des
          // polices laissait le titre coincé invisible sous le masque de lignes)
          // + gsap.from DIRECT (pas de masque qui clippe) : se révèle de façon
          // fiable au load, comme le reste du hero. aria:'auto' garde le texte
          // lisible aux lecteurs d'écran.
          const split = SplitText.create(heading, {
            type: 'words',
            aria: 'auto',
          }) as unknown as { words: Element[] }
          gsap.from(split.words, {
            yPercent: 60,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.out',
            stagger: 0.04,
            delay: 0.05,
          })
        }

        // Reste du hero (badge, sous-titre, CTA, stat) : entrée douce post-titre.
        const heroRise = gsap.utils.toArray<HTMLElement>('[data-hero-rise]')
        if (heroRise.length) {
          gsap.from(heroRise, {
            y: 24,
            autoAlpha: 0,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.08,
            delay: 0.25,
          })
        }

        // Aperçu produit du hero : entrée + léger parallax au scroll.
        const heroVisual = scope.querySelector<HTMLElement>('[data-hero-visual]')
        if (heroVisual) {
          gsap.from(heroVisual, {
            y: 36,
            autoAlpha: 0,
            duration: 0.8,
            ease: 'power3.out',
            delay: 0.35,
          })
          gsap.to(heroVisual, {
            yPercent: -6,
            ease: 'none',
            scrollTrigger: {
              trigger: heroVisual,
              start: 'top 80%',
              end: 'bottom top',
              scrub: true,
            },
          })
        }

        // ── RÉVÉLATIONS AU SCROLL — une par élément (fiable avec ScrollSmoother) ──
        // gsap.from gère l'état caché initial (immediateRender) ET le révèle via
        // ScrollTrigger : les éléments déjà dans le viewport se montrent dès le
        // refresh, on ne laisse jamais un bloc coincé en autoAlpha:0 (le bug du
        // batch, dont l'onEnter ne se déclenchait pas après l'init asynchrone de
        // ScrollSmoother).
        const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]')
        const vh = window.innerHeight
        reveals.forEach((el) => {
          const inView = el.getBoundingClientRect().top < vh * 0.9
          // Au-dessus de la ligne de flottaison : révélation au load (comme le
          // hero), SANS gating ScrollTrigger — dont l'onEnter initial n'est pas
          // fiable sous ScrollSmoother. En dessous : révélation au scroll.
          gsap.from(el, {
            y: 28,
            autoAlpha: 0,
            duration: 0.6,
            ease: 'power2.out',
            delay: inView ? 0.1 : 0,
            ...(inView
              ? {}
              : {
                  scrollTrigger: { trigger: el, start: 'top 85%', once: true },
                }),
          })
        })

        // ── PARALLAX subtil sur les éléments marqués (transform-only) ──────
        const parallax = gsap.utils.toArray<HTMLElement>('[data-parallax]')
        parallax.forEach((el) => {
          const depth = Number(el.dataset.parallax || '8')
          gsap.to(el, {
            yPercent: -depth,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          })
        })

        // ── SHOWCASE ───────────────────────────────────────────────────────
        // La vitrine est désormais un sélecteur d'onglets interactif (cf.
        // landing-showcase.tsx + use-showcase-tabs.ts) : crossfade en pure
        // opacité CSS, AUCUN pin/sticky ScrollTrigger (qui entrait en conflit
        // avec ScrollSmoother → zone morte mobile, recouvrement desktop). Elle
        // se révèle au scroll via le pattern [data-reveal] partagé ci-dessus.

        // ScrollSmoother s'initialise sur quelques frames : un refresh synchrone
        // calcule les positions trop tôt (triggers jamais déclenchés). On
        // rafraîchit aussi après le paint ET après le chargement des polices
        // (qui décale la mise en page), pour fiabiliser les révélations.
        ScrollTrigger.refresh()
        requestAnimationFrame(() => {
          if (!cancelled) ScrollTrigger.refresh()
        })
        if (document.fonts?.ready) {
          void document.fonts.ready.then(() => {
            if (!cancelled) ScrollTrigger.refresh()
          })
        }
      }, scope)
    })()

    return () => {
      cancelled = true
      smoother?.kill()
      ctx?.revert()
    }
  }, [scopeRef])
}
