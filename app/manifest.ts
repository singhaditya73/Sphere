import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SPHERE',
    short_name: 'Sphere',
    description: 'Live Collaborative Music & Video Rooms',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#090909',
    theme_color: '#090909',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
