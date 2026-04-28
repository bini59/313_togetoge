import type { EventType } from './types'

export const PARTICIPATE_LABEL: Record<EventType, string> = {
  live: '라이브 참여',
  fes: '페스 참여',
  album: '앨범 구매',
  bd: 'BD 구매',
  youtube: '시청',
  radio: '청취',
  new_song: '재생',
  tva: 'TVA 시청',
  movie: '극장판 관람',
}

export const TYPE_LABEL: Record<EventType, string> = {
  live: '라이브',
  fes: '페스',
  album: '앨범',
  bd: 'BD',
  youtube: '영상',
  radio: '라디오',
  new_song: '신곡',
  tva: 'TVA',
  movie: '극장판',
}

export const TYPE_TINT: Record<EventType, string> = {
  live: '244, 63, 94',
  fes: '232, 121, 249',
  album: '251, 191, 36',
  bd: '52, 211, 153',
  youtube: '239, 68, 68',
  radio: '56, 189, 248',
  new_song: '244, 114, 182',
  tva: '167, 139, 250',
  movie: '129, 140, 248',
}

export const TYPE_COLOR: Record<EventType, string> = {
  live: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  fes: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  album: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  bd: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  youtube: 'bg-red-500/20 text-red-300 border-red-500/40',
  radio: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  new_song: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  tva: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  movie: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
}
