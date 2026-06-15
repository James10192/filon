/**
 * Logo Google « G » multicolore officiel, en SVG inline (lucide n'en fournit
 * pas). `aria-hidden` car le bouton porte déjà son libellé textuel.
 */
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.52 12.273c0-.851-.076-1.67-.218-2.455H12v4.642h6.458a5.52 5.52 0 0 1-2.394 3.622v3.01h3.878c2.27-2.09 3.578-5.17 3.578-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.956-1.075 7.942-2.908l-3.878-3.01c-1.075.72-2.45 1.145-4.064 1.145-3.125 0-5.77-2.11-6.714-4.946H1.276v3.108A11.997 11.997 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.286 14.281A7.214 7.214 0 0 1 4.91 12c0-.792.136-1.562.376-2.281V6.611H1.276A11.997 11.997 0 0 0 0 12c0 1.937.464 3.769 1.276 5.389l4.01-3.108Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.773c1.762 0 3.343.606 4.587 1.795l3.44-3.44C17.952 1.19 15.236 0 12 0A11.997 11.997 0 0 0 1.276 6.611l4.01 3.108C6.23 6.883 8.875 4.773 12 4.773Z"
      />
    </svg>
  )
}
