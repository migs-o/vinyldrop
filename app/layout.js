import './globals.css'

export const metadata = {
  title: 'VinylDrop - Never Miss a Vinyl Release',
  description: 'Track upcoming vinyl releases, preorders, and reissues from Bandcamp, Discogs, Reddit, and more.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}