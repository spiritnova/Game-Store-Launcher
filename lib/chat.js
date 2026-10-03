// Messages between friends: thread ids, and the replies demo players send back. Replies depend on
// what you wrote (a greeting, an invite to play, a question…) and are picked deterministically.
import { getGame } from '@/lib/games'
import { getPlayer } from '@/lib/players'
import { hash } from '@/lib/random'

export const MESSAGE_MAX = 1000

// One conversation per pair of players, whoever started it
export const threadId = (a, b) => [a, b].sort().join(':')

// The other player in a thread
export const otherIn = (thread, me) => thread.split(':').find((name) => name !== me) ?? me

const REPLIES = {
  greeting: ['Hey! What’s up?', 'Yo, good to see you online.', 'Hey hey! Been a while.', 'Hi! Perfect timing, I just got on.'],
  invite: [
    'I’m in! Give me ten minutes to finish this run in {game}.',
    'Can’t tonight, but tomorrow evening works?',
    'Only if we play {game} after, I’m hooked.',
    'Sure, send me an invite when you’re ready.',
  ],
  thanks: ['Anytime!', 'No worries.', 'Happy to help.'],
  question: ['Good question, honestly not sure.', 'Probably yes? Ask me again after this match.', 'Hmm, I’d say go for it.', 'No idea, but I like where your head’s at.'],
  bye: ['Later! GG.', 'See you around.', 'Catch you tomorrow.'],
  other: ['Ha, nice.', 'Haha, true.', 'I’ve been playing a lot of {game} lately, you should try it.', 'Sounds good to me.', 'Same here, honestly.'],
}

export function replyKind(text) {
  const t = text.toLowerCase()
  if (/\b(bye|later|gn|good ?night|cya|see (you|ya))\b/.test(t)) return 'bye'
  if (/\b(thanks|thank you|thx|ty)\b/.test(t)) return 'thanks'
  if (/\b(play|game|join|co-?op|match|squad|invite|run|raid|online)\b/.test(t)) return 'invite'
  if (/^\s*(hi|hey|hello|yo|sup|hiya|howdy)\b/.test(t)) return 'greeting'
  if (t.includes('?')) return 'question'
  return 'other'
}

// What a demo player answers to `text`; `count` (the thread's length) varies the pick between messages
export function demoReply(username, text, count = 0) {
  const player = getPlayer(username)
  const pool = REPLIES[replyKind(text)]
  const reply = pool[hash(`${username}:${count}:${text.length}`) % pool.length]
  const game = getGame(player?.library[0]?.slug)?.title ?? 'this new roguelike'
  return reply.replace('{game}', game)
}

// How long a demo player takes to answer: 3–7 seconds, "typing…" for the last two
export const replyDelay = (username, count) => 3000 + (hash(`delay:${username}:${count}`) % 4000)
export const TYPING_MS = 2000
