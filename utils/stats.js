// utils/stats.js
import { Redis } from '@upstash/redis'
import os from 'os'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

export const botStats = {
  startTime: Date.now(),
  messagesHandled: 0,
  commandsUsed: 0,
  groupCount: 0,
  userCount: 0,
  version: '2.0.0',
}

export function getUptime() {
  const ms = Date.now() - botStats.startTime
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}j ${h % 24}h ${m % 60}m`
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export function getRAMUsage() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024
  return `${used.toFixed(1)} MB`
}

export async function countRealUsers() {
  try {
    const keys = await redis.keys('seen:*')
    return keys.length
  } catch {
    return 0
  }
}