'use client'

import Image from 'next/image'
import Link from 'next/link'
import CheckIcon from '@mui/icons-material/Check'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import { achievementProgress, unlockedAchievements } from '@/lib/achievements'
import { formatDate, getSeedReviews } from '@/lib/community'
import { allGames, cardImage, getGame } from '@/lib/games'
import { placeholderColor } from '@/lib/image-colors'
import { getPlayer, playerLibrary } from '@/lib/players'
import { formatLastPlayed, formatPlaytime, useStore } from '@/lib/store'
import { useNow } from '@/lib/useNow'
import Avatar from '../UI/Avatar'
import Button from '../UI/Button'
import { PresenceDot, presenceLabel, usePresence } from '../UI/Presence'
import Skeleton from '../UI/Skeleton'
import styles from './ProfileView.module.css'

const DAY = 24 * 60 * 60 * 1000
const seedReviews = new Map()

// The sample reviews a demo player wrote, across every game (worked out once per player)
function reviewsBy(username) {
    if (!seedReviews.has(username)) {
        seedReviews.set(username, allGames.flatMap((game) => getSeedReviews(game).filter((r) => r.author.username === username).map((r) => ({ ...r, slug: game.slug }))))
    }
    return seedReviews.get(username)
}

// Everything a profile shows, for a local account or a demo player.
function useProfile(username, now) {
    const { accounts, community, profileOf } = useStore()
    const local = accounts[username]
    if (local) {
        const reviews = Object.entries(community.reviews)
            .flatMap(([slug, list]) => list.filter((r) => r.author.username === username).map((r) => ({ ...r, slug })))
        return {
            ...profileOf(username),
            bio: local.profile.bio,
            memberSince: local.profile.createdAt,
            library: local.library.filter((e) => !e.hidden),
            friends: local.friends.map((f) => profileOf(f.username)),
            reviews,
        }
    }
    const player = getPlayer(username)
    if (!player) return null
    return {
        ...profileOf(username),
        bio: player.bio,
        memberSince: now - player.memberSinceDaysAgo * DAY,
        library: playerLibrary(player, now),
        friends: null,
        reviews: reviewsBy(username),
    }
}

export default function ProfileView({ username }) {
    const { hydrated, session, isFriend, addFriend, removeFriend } = useStore()
    const now = useNow(60000)
    const statusOf = usePresence()
    const profile = useProfile(username, now)

    if (!hydrated) return <Skeleton height="420px" radius="8px" />
    if (!profile) {
        return (
            <div className={styles.missing}>
                <h1>Player not found</h1>
                <p>There’s no player called “{username}”. They may have deleted their account.</p>
                <Button href="/friends" variant="secondary">Find friends</Button>
            </div>
        )
    }

    const isMe = session?.username === username
    const friend = isFriend(username)
    const status = statusOf(username, now)
    const library = profile.library
    const hours = Math.round(library.reduce((sum, e) => sum + e.playtimeMinutes, 0) / 60)
    const achievements = library.flatMap((entry) => unlockedAchievements(entry).map((a) => ({ ...a, slug: entry.slug })))
    const recent = [...library].filter((e) => e.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 4)
    const mostPlayed = [...library].sort((a, b) => b.playtimeMinutes - a.playtimeMinutes).slice(0, 12)
    const latestAchievements = [...achievements].sort((a, b) => b.unlockedAt - a.unlockedAt || a.percent - b.percent).slice(0, 6)
    const rarest = [...achievements].sort((a, b) => a.percent - b.percent)[0]

    return (
        <div className={styles.profile}>
            <header className={styles.hero} style={{ '--hue': profile.hue }}>
                <span className={styles.avatar}>
                    <Avatar user={profile} size={112} />
                    <PresenceDot status={status} className={styles.dot} />
                </span>
                <div className={styles.identity}>
                    <h1>{profile.displayName}</h1>
                    <p className={styles.handle}>
                        @{username} · {presenceLabel(status)}
                    </p>
                    {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                    <p className={styles.since}>Member since {new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className={styles.actions}>
                    {isMe ? (
                        <Button href="/settings" variant="ghost">Edit profile</Button>
                    ) : session && friend ? (
                        <>
                            <span className={styles.friendTag}><CheckIcon fontSize="small" /> Friends</span>
                            <Button variant="ghost" size="small" onClick={() => removeFriend(username)}>Remove friend</Button>
                        </>
                    ) : session ? (
                        <Button onClick={() => addFriend(username)}><PersonAddAlt1Icon fontSize="small" /> Add friend</Button>
                    ) : null}
                </div>
            </header>

            <dl className={styles.stats}>
                <div><dt>Games</dt><dd>{library.length}</dd></div>
                <div><dt>Hours played</dt><dd>{hours}</dd></div>
                <div><dt>Achievements</dt><dd>{achievements.length}</dd></div>
                {profile.friends && <div><dt>Friends</dt><dd>{profile.friends.length}</dd></div>}
                <div><dt>Reviews</dt><dd>{profile.reviews.length}</dd></div>
            </dl>

            {recent.length > 0 && (
                <section aria-labelledby="recent-title" className={styles.section}>
                    <h2 id="recent-title">Recently played</h2>
                    <ul className={styles.recent}>
                        {recent.map((entry) => {
                            const game = getGame(entry.slug)
                            const progress = achievementProgress(entry)
                            return (
                                <li key={entry.slug}>
                                    <Link href={`/games/${game.slug}`} className={styles.recentCard}>
                                        <span className={styles.banner} style={{ backgroundColor: placeholderColor(game.banner) }}>
                                            <Image src={game.banner} alt="" fill sizes="(max-width: 700px) 100vw, 320px" />
                                        </span>
                                        <span className={styles.recentBody}>
                                            <strong>{game.title}</strong>
                                            <span className={styles.muted}>{formatPlaytime(entry.playtimeMinutes)} · {formatLastPlayed(entry.lastPlayed)}</span>
                                            {progress && (
                                                <span className={styles.progress}>
                                                    <EmojiEventsIcon fontSize="inherit" />
                                                    <span className={styles.bar} aria-hidden="true"><span style={{ width: `${progress.percent}%` }} /></span>
                                                    {progress.unlocked}/{progress.total}
                                                </span>
                                            )}
                                        </span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </section>
            )}

            {latestAchievements.length > 0 && (
                <section aria-labelledby="achievements-title" className={styles.section}>
                    <h2 id="achievements-title">Recent achievements</h2>
                    {rarest && (
                        <p className={styles.muted}>
                            Rarest: <strong>{rarest.name}</strong> in {getGame(rarest.slug).title}, unlocked by {rarest.percent}% of players.
                        </p>
                    )}
                    <ul className={styles.achievements}>
                        {latestAchievements.map((a) => (
                            <li key={a.id}>
                                <span className={styles.trophy} aria-hidden="true"><EmojiEventsIcon fontSize="small" /></span>
                                <span className={styles.achievementText}>
                                    <strong>{a.name}</strong>
                                    <Link href={`/games/${a.slug}#achievements`} className={styles.muted}>{getGame(a.slug).title}</Link>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {mostPlayed.length > 0 && (
                <section aria-labelledby="games-title" className={styles.section}>
                    <h2 id="games-title">Most played games</h2>
                    <ul className={styles.games}>
                        {mostPlayed.map((entry) => {
                            const game = getGame(entry.slug)
                            return (
                                <li key={entry.slug}>
                                    <Link href={`/games/${game.slug}`} className={styles.gameTile} title={`${game.title} · ${formatPlaytime(entry.playtimeMinutes)}`}>
                                        <span className={styles.cover} style={{ backgroundColor: placeholderColor(cardImage(game)) }}>
                                            <Image src={cardImage(game)} alt="" fill sizes="120px" />
                                        </span>
                                        <span className={styles.gameTitle}>{game.title}</span>
                                        <span className={styles.muted}>{formatPlaytime(entry.playtimeMinutes)}</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </section>
            )}

            {profile.reviews.length > 0 && (
                <section aria-labelledby="reviews-title" className={styles.section}>
                    <h2 id="reviews-title">Reviews</h2>
                    <ul className={styles.reviews}>
                        {profile.reviews.slice(0, 4).map((review) => (
                            <li key={review.id}>
                                <p className={`${styles.verdict} ${review.recommended ? styles.positive : styles.negative}`}>
                                    {review.recommended ? <ThumbUpIcon fontSize="inherit" /> : <ThumbDownIcon fontSize="inherit" />}
                                    {review.recommended ? 'Recommends' : 'Doesn’t recommend'}{' '}
                                    <Link href={`/games/${review.slug}#reviews`}>{getGame(review.slug).title}</Link>
                                </p>
                                <p>{review.text}</p>
                                <p className={styles.muted}>{review.hoursPlayed} h played · {formatDate(review.createdAt)}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {profile.friends?.length > 0 && (
                <section aria-labelledby="friends-title" className={styles.section}>
                    <h2 id="friends-title">Friends</h2>
                    <ul className={styles.friends}>
                        {profile.friends.map((f) => (
                            <li key={f.username}>
                                <Link href={`/u/${f.username}`}>
                                    <Avatar user={f} size={32} />
                                    {f.displayName}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {library.length === 0 && <p className={styles.muted}>{isMe ? 'Your' : 'Their'} library is empty for now.</p>}
            {profile.demo && <p className={styles.note}>{profile.displayName} is a demo player. Their games, playtime and status are sample content.</p>}
        </div>
    )
}
