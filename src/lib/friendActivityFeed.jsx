import { ChatCircle, Headphones, Heart, PlusCircle, Star } from 'phosphor-react'

const BACKLOG_ACTIVITY_STATUSES = new Set(['listening', 'unfinished', 'backloggd'])

function formatRelativeTime(value) {
  if (!value) return 'just now'
  const now = Date.now()
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'just now'

  const diffMs = Math.max(0, now - then)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day

  if (diffMs < minute) return 'just now'
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute)
    return `${n} min${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour)
    return `${n}h ago`
  }
  if (diffMs < week) {
    const n = Math.floor(diffMs / day)
    return `${n} day${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < month) {
    const n = Math.floor(diffMs / week)
    return `${n} week${n === 1 ? '' : 's'} ago`
  }
  if (diffMs < year) {
    const n = Math.floor(diffMs / month)
    return `${n} month${n === 1 ? '' : 's'} ago`
  }

  const n = Math.floor(diffMs / year)
  return `${n} year${n === 1 ? '' : 's'} ago`
}

function getActivityPresentation(item) {
  if (item?.type === 'review') {
    return {
      icon: <ChatCircle size={16} weight="bold" />,
      action: 'reviewed',
      timestamp: item.reviewedAt || item.updatedAt || item.addedAt,
      activityType: 'review',
      ratingValue: typeof item?.rating === 'number' ? item.rating : null,
    }
  }

  if (item?.type === 'favorite') {
    return {
      icon: <Heart size={16} weight="bold" />,
      action: 'favorited',
      timestamp: item.updatedAt || item.addedAt,
      activityType: 'favorite',
      ratingValue: null,
    }
  }

  if (typeof item?.rating === 'number') {
    return {
      icon: <Star size={16} weight="fill" />,
      action: 'rated',
      timestamp: item.updatedAt || item.addedAt,
      activityType: 'rating',
      ratingValue: item.rating,
    }
  }

  if (BACKLOG_ACTIVITY_STATUSES.has(item?.status)) {
    return {
      icon: <PlusCircle size={16} weight="bold" />,
      action: 'added to backlog',
      timestamp: item.updatedAt || item.addedAt,
      activityType: 'backlog',
      ratingValue: null,
    }
  }

  return {
    icon: <Headphones size={16} weight="bold" />,
    action: 'logged',
    timestamp: item?.addedAt,
    activityType: 'log',
    ratingValue: null,
  }
}

export function mapFriendActivityItem(item) {
  const username = item?.user?.username || 'Unknown user'
  const albumTitle = item?.albumTitle || 'Unknown album'
  const artistName = item?.artistName || 'Unknown artist'
  const cover = item?.coverArtUrl || '/album/am.jpg'
  const avatarUrl = item?.user?.avatarUrl || ''
  const { icon, action, timestamp, activityType, ratingValue } = getActivityPresentation(item)
  const time = formatRelativeTime(timestamp)
  const ratingText = typeof ratingValue === 'number' ? ` ${ratingValue}/5` : ''

  return {
    id: item?.id ?? `${username}-${albumTitle}-${timestamp ?? 'activity'}`,
    icon,
    text: `${username} ${action} ${albumTitle}${ratingText}`,
    meta: `${artistName} - ${time}`,
    cover,
    avatarUrl,
    username,
    action,
    albumTitle,
    artistName,
    time,
    ratingValue,
    activityType,
  }
}

export function mapFriendActivityFeed(items = []) {
  return Array.isArray(items) ? items.map(mapFriendActivityItem) : []
}
