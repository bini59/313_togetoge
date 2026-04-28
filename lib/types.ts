export type EventType =
  | 'live'
  | 'fes'
  | 'album'
  | 'youtube'
  | 'new_song'
  | 'radio'
  | 'bd'
  | 'tva'
  | 'movie'

export interface Song {
  id: string
  title: string
  youtubeId: string
}

export interface Setlist {
  id: string
  songIds: string[]
}

interface BaseEvent {
  id: string
  date: string
  type: EventType
  title: string
  description?: string
  thumbnail?: string
}

export interface DirectVideoEvent extends BaseEvent {
  type: Exclude<EventType, 'live' | 'fes' | 'album'>
  youtubeId?: string
  songId?: string
}

export interface SetlistEvent extends BaseEvent {
  type: 'live' | 'fes'
  setlistId: string
}

export interface AlbumEvent extends BaseEvent {
  type: 'album'
  titleSongId: string
}

export type TimelineEvent = DirectVideoEvent | SetlistEvent | AlbumEvent

export interface CommentRow {
  id: string
  event_id: string
  content: string
  created_at: string
}

export interface ParticipationRow {
  event_id: string
  count: number
}
