import styles from './FeaturedGames.module.css'
import Link from 'next/link'
import featuredGames from '../../api/gamesale.json'

export default function FeaturedGames(){
    const games = []
    featuredGames.forEach(game => {
        if(game.featured){
            games.push(game)
        }
    });
    return(
        <div className={styles.container}>
            <div className={styles.title}>Featured PC Games</div>

            <div className={styles.cards}>
                {games.map(game => (
                    <div className={styles.card} key={game.id}>
                        <Link href={`/games/${game.id}`}>
                            <div className={styles.image}>
                                <img 
                                    src={game.image}
                                />
                                <div className={styles.cover}>
                                    <img src={game.logo}/>
                                    <p>{game.title}</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    )
}