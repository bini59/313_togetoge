import type { Setlist, Song, TimelineEvent } from '@/lib/types'

export const songs: Song[] = [
  { id: 'wrong-world', title: 'Wrong World', youtubeId: 'gv5xkvsLBRA' },
  { id: 'kamuy-uta', title: '空の箱', youtubeId: 'OoSkOHQNAt0' },
  { id: 'hitorigoto', title: 'независимость', youtubeId: 'gv5xkvsLBRA' },
  { id: 'fluorite', title: '名もなき何もかも', youtubeId: 'gv5xkvsLBRA' },
  { id: 'theme', title: '理由', youtubeId: 'gv5xkvsLBRA' },
  // TODO: 실제 곡/유튜브 ID로 채우기 — timeline-data-curator agent에 의뢰
]

export const setlists: Setlist[] = [
  {
    id: 'live-2024-08-25-kinema',
    songIds: ['wrong-world', 'kamuy-uta', 'theme', 'fluorite'],
  },
  {
    id: 'fes-2024-natsu',
    songIds: ['wrong-world', 'theme'],
  },
]

export const events: TimelineEvent[] = [
  {
    id: 'tva-2024-04-05',
    date: '2024-04-05',
    type: 'tva',
    title: 'TVA 「ガールズバンドクライ」 방영 시작',
    description: '도에이 애니메이션 제작, 풀 3DCG 음악 애니메이션의 막이 오르다.',
    songId: 'theme',
  },
  {
    id: 'song-wrongworld-2024-04-10',
    date: '2024-04-10',
    type: 'new_song',
    title: 'Wrong World — 1화 OP',
    songId: 'wrong-world',
  },
  {
    id: 'live-2024-08-25-kinema',
    date: '2024-08-25',
    type: 'live',
    title: '도쿄 키네마 클럽 원맨 라이브',
    description: '트구미코의 첫 단독 공연.',
    setlistId: 'live-2024-08-25-kinema',
  },
  {
    id: 'album-2024-09-25-1st',
    date: '2024-09-25',
    type: 'album',
    title: '1st 앨범 발매',
    titleSongId: 'wrong-world',
  },
  {
    id: 'fes-2024-natsu',
    date: '2024-08-10',
    type: 'fes',
    title: 'ROCK IN JAPAN FES 2024',
    setlistId: 'fes-2024-natsu',
  },
  {
    id: 'movie-2025-summer',
    date: '2025-08-08',
    type: 'movie',
    title: '극장판 발표 (가)',
    description: '극장판 제작 결정 — 발매일/제목은 가공.',
    songId: 'theme',
  },
].sort((a, b) => a.date.localeCompare(b.date)) as TimelineEvent[]
