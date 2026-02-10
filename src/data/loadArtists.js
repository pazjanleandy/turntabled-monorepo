const artistModules = import.meta.glob('./artists/*.json', { eager: true })

export function loadArtists() {
  return Object.entries(artistModules).map(([path, module]) => {
    const filename = path.split('/').pop() || ''
    const id = filename.replace('.json', '')
    return {
      id,
      ...(module?.default ?? {}),
    }
  })
}

