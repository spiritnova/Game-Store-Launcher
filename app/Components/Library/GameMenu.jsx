'use client'

import { useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ReplayIcon from '@mui/icons-material/Replay'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { useStore } from '@/lib/store'
import Button from '../UI/Button'
import Dialog from '../UI/Dialog'
import Menu from '../UI/Menu'
import PropertiesDialog from './PropertiesDialog'
import RefundDialog from './RefundDialog'
import styles from './GameMenu.module.css'

const NAME_MAX = 32

export function CollectionNameDialog({ open, onClose, onSubmit, title, initial = '', submitLabel = 'Create' }) {
    return (
        <Dialog open={open} onClose={onClose} title={title}>
            <NameForm initial={initial} submitLabel={submitLabel} onCancel={onClose} onSubmit={(name) => { onSubmit(name); onClose() }} />
        </Dialog>
    )
}

function NameForm({ initial, submitLabel, onCancel, onSubmit }) {
    const [name, setName] = useState(initial)
    return (
        <form
            className={styles.form}
            onSubmit={(e) => {
                e.preventDefault()
                if (name.trim()) onSubmit(name)
            }}
        >
            <label htmlFor="collection-name">Name</label>
            <input id="collection-name" value={name} maxLength={NAME_MAX} autoFocus autoComplete="off" placeholder="e.g. Co-op nights" onChange={(e) => setName(e.target.value)} />
            <div className={styles.actions}>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={!name.trim()}>{submitLabel}</Button>
            </div>
        </form>
    )
}

// "…" menu for a game you own: favourite, collections, hide, properties, uninstall and refund.
export default function GameMenu({ game, className }) {
    const { getEntry, collections, toggleFavorite, toggleHidden, toggleCollection, createCollection, uninstall } = useStore()
    const [dialog, setDialog] = useState(null)
    const [refundDlc, setRefundDlc] = useState(null)
    const entry = getEntry(game.slug)
    if (!entry) return null

    const items = [
        { label: 'Favourite', checked: Boolean(entry.favorite), onSelect: () => toggleFavorite(game.slug), icon: FavoriteBorderIcon },
        { heading: 'Collections' },
        ...collections.map((c) => ({ label: c.name, checked: c.slugs.includes(game.slug), onSelect: () => toggleCollection(c.id, game.slug) })),
        { label: 'New collection…', icon: AddIcon, onSelect: () => setDialog('collection') },
        { divider: true },
        { label: entry.hidden ? 'Show in library' : 'Hide game', icon: entry.hidden ? VisibilityOutlinedIcon : VisibilityOffOutlinedIcon, onSelect: () => toggleHidden(game.slug) },
        { label: 'Properties…', icon: SettingsOutlinedIcon, onSelect: () => setDialog('properties') },
        ...(entry.installed ? [{ label: 'Uninstall', icon: DeleteOutlineIcon, danger: true, onSelect: () => uninstall(game) }] : []),
        { label: 'Request a refund…', icon: ReplayIcon, onSelect: () => setDialog('refund') },
    ]

    const close = () => {
        setDialog(null)
        setRefundDlc(null)
    }
    return (
        <>
            <Menu label={`Manage ${game.title}`} items={items} buttonClassName={className ?? styles.button}>
                <MoreHorizIcon fontSize="small" />
            </Menu>
            <CollectionNameDialog open={dialog === 'collection'} onClose={close} title="New collection" onSubmit={(name) => createCollection(name, game.slug)} />
            <PropertiesDialog
                game={game}
                open={dialog === 'properties'}
                onClose={close}
                onRefund={() => setDialog('refund')}
                onRefundDlc={(id) => { setRefundDlc(id); setDialog('refund') }}
            />
            <RefundDialog game={game} dlcId={refundDlc} open={dialog === 'refund'} onClose={close} />
        </>
    )
}
