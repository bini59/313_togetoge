'use client'

interface Props {
  cinemaMode: boolean
  focusMode: boolean
  sceneTint: string
  yearSlate: string | null
}

export function CinemaChrome({ cinemaMode, focusMode, sceneTint, yearSlate }: Props) {
  return (
    <>
      <div
        className="cinema-backdrop"
        style={{ ['--scene-tint' as string]: sceneTint }}
      />
      {cinemaMode && <div className="cinema-vignette" />}
      {cinemaMode && <div className="cinema-grain" />}
      {cinemaMode && (
        <>
          <div
            className="cinema-letterbox top-0"
            style={{ ['--lb-origin' as string]: 'top' }}
            data-on={focusMode ? '1' : '0'}
          />
          <div
            className="cinema-letterbox bottom-0"
            style={{ ['--lb-origin' as string]: 'bottom' }}
            data-on={focusMode ? '1' : '0'}
          />
        </>
      )}
      {yearSlate && (
        <div key={yearSlate} className="year-slate">
          {yearSlate}
        </div>
      )}
    </>
  )
}
