import { describe, expect, it } from 'vitest'
import { demoReply, otherIn, replyDelay, replyKind, threadId } from '@/lib/chat'

describe('chat', () => {
  it('uses one thread per pair, whoever writes first', () => {
    expect(threadId('demo', 'pixelnomad')).toBe(threadId('pixelnomad', 'demo'))
    expect(otherIn(threadId('demo', 'pixelnomad'), 'demo')).toBe('pixelnomad')
  })

  it('recognises what kind of message it is answering', () => {
    expect(replyKind('hey there')).toBe('greeting')
    expect(replyKind('want to play co-op tonight?')).toBe('invite')
    expect(replyKind('thanks!')).toBe('thanks')
    expect(replyKind('is it any good?')).toBe('question')
    expect(replyKind('ok bye')).toBe('bye')
    expect(replyKind('nice weather')).toBe('other')
  })

  it('replies the same way every time for the same message', () => {
    const reply = demoReply('pixelnomad', 'want to play?', 3)
    expect(reply).toBe(demoReply('pixelnomad', 'want to play?', 3))
    expect(reply).not.toContain('{game}')
  })

  it('answers within a few seconds', () => {
    for (let i = 0; i < 20; i++) {
      const delay = replyDelay('lunabyte', i)
      expect(delay).toBeGreaterThanOrEqual(3000)
      expect(delay).toBeLessThan(7000)
    }
  })
})
