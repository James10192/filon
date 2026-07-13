import hanken400 from '@fontsource/hanken-grotesk/400.css?inline'
import hanken500 from '@fontsource/hanken-grotesk/500.css?inline'
import hanken600 from '@fontsource/hanken-grotesk/600.css?inline'
import hanken700 from '@fontsource/hanken-grotesk/700.css?inline'
import jetbrains400 from '@fontsource/jetbrains-mono/400.css?inline'
import jetbrains500 from '@fontsource/jetbrains-mono/500.css?inline'
import jetbrains600 from '@fontsource/jetbrains-mono/600.css?inline'

// Ces règles sont injectées dans l'iframe et dans Chrome afin que les deux
// rendus utilisent les mêmes fichiers auto-hébergés, sans police distante.
export const proposalDocumentFontFaces = [
  hanken400,
  hanken500,
  hanken600,
  hanken700,
  jetbrains400,
  jetbrains500,
  jetbrains600,
].join('\n')
