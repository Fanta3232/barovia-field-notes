'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal'

type PartyMember = {
  id: string
  name: string
  level: number
  current_hp: number
  max_hp: number
  temp_hp: number
  strength: number
  dexterity: number
  constitution: number
  wisdom: number
  class: { name: string } | null
  subclass: { name: string } | null
}

type EquippedItem = {
  character_id: string
  items: { category: string; properties: Record<string, any> } | null
}

type ConditionEntry = {
  character_id: string
  conditions: { name: string } | null
}

type ItemCatalogRow = { id: string; name: string; category: string }

type LogEntry = {
  id: string
  character_id: string
  source: string
  detail: string
  created_at: string
  characters: { name: string } | null
}

type Combatant = { id: string; name: string; initiative: number; isParty: boolean }

type NpcInstance = {
  id: string
  name: string
  max_hp: number
  current_hp: number
  temp_hp: number
  armor_class: number
  notes: string | null
  stat_block: MonsterTemplate['stat_block'] | null
}

type MonsterTemplate = {
  id: string
  name: string
  source: string | null
  stat_block: {
    armor_class?: number
    hit_points?: number
    challenge?: string
    type?: string
    traits?: { name: string; description: string }[]
    actions?: {
      name: string
      description: string
      attack_bonus?: number
      damage_dice?: string
      damage_bonus?: number
      damage_type?: string
      extra_damage_dice?: string
      extra_damage_type?: string
      save_dc?: number
      save_ability?: string
    }[]
    legendary_actions?: { name: string; description: string }[]
    [key: string]: any
  }
}

function formatStatBlockAsNotes(m: MonsterTemplate): string {
  return `Source: ${m.source ?? 'unknown'}`
}

async function refreshLog(setLog: (rows: LogEntry[]) => void) {
  const { data } = await supabase
    .from('character_activity_log')
    .select('id, character_id, source, detail, created_at, characters:character_id(name)')
    .order('created_at', { ascending: false })
    .limit(75)
  setLog((data ?? []) as unknown as LogEntry[])
}

async function refreshConditions(setConditions: (rows: ConditionEntry[]) => void) {
  const { data } = await supabase.from('character_conditions').select('character_id, conditions:condition_id(name)')
  setConditions((data ?? []) as unknown as ConditionEntry[])
}

async function refreshNpcs(setNpcs: (rows: NpcInstance[]) => void) {
  const { data } = await supabase.from('npc_instances').select('*').order('created_at')
  setNpcs((data ?? []) as NpcInstance[])
}

async function refreshInventory(setEquippedArmor: (rows: EquippedItem[]) => void) {
  const { data } = await supabase.from('character_inventory').select('character_id, items:item_id(category, properties)').eq('equipped', true)
  setEquippedArmor((data ?? []) as unknown as EquippedItem[])
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [party, setParty] = useState<PartyMember[]>([])
  const [equippedArmor, setEquippedArmor] = useState<EquippedItem[]>([])
  const [conditions, setConditions] = useState<ConditionEntry[]>([])
  const [itemCatalog, setItemCatalog] = useState<ItemCatalogRow[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [logFilter, setLogFilter] = useState('all')
  const [campaignNotes, setCampaignNotes] = useState<{ id: string; content: string } | null>(null)

  const [grantItemCharId, setGrantItemCharId] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [grantItemId, setGrantItemId] = useState('')
  const [grantItemQty, setGrantItemQty] = useState(1)

  const [grantCurrencyCharId, setGrantCurrencyCharId] = useState('')
  const [grantCurrency, setGrantCurrency] = useState({ cp: 0, sp: 0, gp: 0, pp: 0 })

  const [hpCharId, setHpCharId] = useState('')
  const [hpAmount, setHpAmount] = useState('')

  const [combatants, setCombatants] = useState<Combatant[]>([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [newCombatantName, setNewCombatantName] = useState('')
  const [newCombatantInit, setNewCombatantInit] = useState('')

  const [npcs, setNpcs] = useState<NpcInstance[]>([])
  const [addNpcOpen, setAddNpcOpen] = useState(false)
  const [newNpc, setNewNpc] = useState({ name: '', max_hp: 10, armor_class: 10, notes: '' })
  const [openNpcId, setOpenNpcId] = useState<string | null>(null)
  const [npcHpAdjust, setNpcHpAdjust] = useState('')
  const [rollToast, setRollToast] = useState<string | null>(null)
  const [lastNpcCrit, setLastNpcCrit] = useState<Record<string, boolean>>({})
  const rollToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [monsterLibrary, setMonsterLibrary] = useState<MonsterTemplate[]>([])
  const [monsterSearch, setMonsterSearch] = useState('')

  // Which characters actually show in the live Party Overview — a personal, per-browser
  // preference (not everyone shows up to every session), persisted so it survives a refresh.
  const [trackedIds, setTrackedIds] = useState<string[] | null>(null) // null = "not loaded yet", show all
  const [manageTrackedOpen, setManageTrackedOpen] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('barovia_dm_tracked_ids')
    setTrackedIds(stored ? JSON.parse(stored) : null)
  }, [])

  function toggleTracked(id: string) {
    setTrackedIds((prev) => {
      const current = prev ?? party.map((p) => p.id)
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
      window.localStorage.setItem('barovia_dm_tracked_ids', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    async function load() {
      const [charsRes, invRes, condRes, itemsRes, notesRes, npcsRes, monstersRes] = await Promise.all([
        supabase.from('characters').select('id, name, level, current_hp, max_hp, temp_hp, strength, dexterity, constitution, wisdom, class:class_id(name), subclass:subclass_id(name)').eq('is_quickstart_template', false).order('name'),
        supabase.from('character_inventory').select('character_id, items:item_id(category, properties)').eq('equipped', true),
        supabase.from('character_conditions').select('character_id, conditions:condition_id(name)'),
        supabase.from('items').select('id, name, category').order('name'),
        supabase.from('campaign_notes').select('id, content').limit(1),
        supabase.from('npc_instances').select('*').order('created_at'),
        supabase.from('monsters').select('id, name, source, stat_block').order('name'),
      ])
      setParty((charsRes.data ?? []) as unknown as PartyMember[])
      setEquippedArmor((invRes.data ?? []) as unknown as EquippedItem[])
      setConditions((condRes.data ?? []) as unknown as ConditionEntry[])
      setItemCatalog((itemsRes.data ?? []) as ItemCatalogRow[])
      const notesRow = (notesRes.data ?? [])[0] as { id: string; content: string | null } | undefined
      setCampaignNotes(notesRow ? { id: notesRow.id, content: notesRow.content ?? '' } : null)
      setNpcs((npcsRes.data ?? []) as NpcInstance[])
      setMonsterLibrary((monstersRes.data ?? []) as MonsterTemplate[])
      await refreshLog(setLog)
      setLoading(false)
    }
    load()
  }, [])

  // Live updates — without this, the panel is just a snapshot from whenever it last loaded,
  // and a player changing their own HP/currency/conditions on their sheet wouldn't show up
  // here until a manual refresh.
  useEffect(() => {
    const channel = supabase
      .channel('dm-panel-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, (payload) => {
        const row = (payload.new ?? payload.old) as { id: string }
        if (payload.eventType === 'DELETE') {
          setParty((prev) => prev.filter((p) => p.id !== row.id))
        } else {
          setParty((prev) => prev.map((p) => p.id === row.id ? { ...p, ...(payload.new as object) } : p))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_conditions' }, () => refreshConditions(setConditions))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_inventory' }, () => refreshInventory(setEquippedArmor))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_activity_log' }, () => refreshLog(setLog))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'npc_instances' }, () => refreshNpcs(setNpcs))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Mirrors the same live-AC logic used on the character sheet, so the party overview isn't
  // showing a stale creation-time number once someone's equipped different armor mid-campaign.
  function computeAC(member: PartyMember): number {
    const dexMod = Math.floor((member.dexterity - 10) / 2)
    const armor = equippedArmor.find((r) => r.character_id === member.id && r.items?.category === 'armor' && r.items?.properties?.ac_base != null)
    const shield = equippedArmor.find((r) => r.character_id === member.id && r.items?.category === 'armor' && r.items?.properties?.ac_bonus != null)
    const shieldBonus = shield ? (shield.items?.properties?.ac_bonus ?? 0) : 0
    if (!armor) {
      if (member.class?.name === 'Barbarian') return 10 + dexMod + Math.floor((member.constitution - 10) / 2) + shieldBonus
      if (member.class?.name === 'Monk') return 10 + dexMod + Math.floor((member.wisdom - 10) / 2) + shieldBonus
      if (member.subclass?.name === 'Draconic Bloodline') return 13 + dexMod + shieldBonus
      return 10 + dexMod + shieldBonus
    }
    const base = armor.items?.properties?.ac_base ?? 10
    const dexCap = armor.items?.properties?.dex_bonus_max
    const dexApplied = dexCap === null || dexCap === undefined ? dexMod : Math.min(dexMod, dexCap)
    return base + dexApplied + shieldBonus
  }

  function conditionsFor(charId: string): string[] {
    return conditions.filter((c) => c.character_id === charId).map((c) => c.conditions?.name).filter((n): n is string => !!n)
  }

  async function logActivity(characterId: string, action: string, detail: string) {
    await supabase.from('character_activity_log').insert({ character_id: characterId, source: 'dm', action, detail })
    await refreshLog(setLog)
  }

  async function applyHpAdjust(kind: 'damage' | 'heal') {
    const member = party.find((p) => p.id === hpCharId)
    const amount = Math.max(0, parseInt(hpAmount) || 0)
    if (!member || amount === 0) return
    let newTemp = member.temp_hp
    let newCurrent = member.current_hp
    let absorbed = 0
    if (kind === 'damage') {
      let remaining = amount
      if (newTemp > 0) {
        absorbed = Math.min(newTemp, remaining)
        newTemp -= absorbed
        remaining -= absorbed
      }
      newCurrent = Math.max(0, member.current_hp - remaining)
    } else {
      newCurrent = Math.min(member.max_hp, member.current_hp + amount)
    }
    setParty((prev) => prev.map((p) => p.id === member.id ? { ...p, current_hp: newCurrent, temp_hp: newTemp } : p))
    await supabase.from('characters').update({ current_hp: newCurrent, temp_hp: newTemp }).eq('id', member.id)
    await logActivity(member.id, kind, `${kind === 'damage' ? '-' : '+'}${amount} HP${absorbed > 0 ? ` (${absorbed} absorbed by temp HP)` : ''} — set by DM`)
    setHpAmount('')
  }

  async function grantItem() {
    if (!grantItemCharId || !grantItemId) return
    const item = itemCatalog.find((i) => i.id === grantItemId)
    await supabase.from('character_inventory').insert({ character_id: grantItemCharId, item_id: grantItemId, quantity: grantItemQty })
    await logActivity(grantItemCharId, 'item_grant', `Granted ${grantItemQty}× ${item?.name ?? 'item'}`)
    setGrantItemId('')
    setItemSearch('')
    setGrantItemQty(1)
  }

  async function grantCurrencyToChar() {
    if (!grantCurrencyCharId) return
    const { data } = await supabase.from('character_currency').select('cp, sp, gp, pp').eq('character_id', grantCurrencyCharId).single()
    if (!data) return
    const updated = {
      cp: data.cp + grantCurrency.cp,
      sp: data.sp + grantCurrency.sp,
      gp: data.gp + grantCurrency.gp,
      pp: data.pp + grantCurrency.pp,
    }
    await supabase.from('character_currency').update(updated).eq('character_id', grantCurrencyCharId)
    const parts = (['cp', 'sp', 'gp', 'pp'] as const).filter((f) => grantCurrency[f] !== 0).map((f) => `${grantCurrency[f]} ${f}`)
    await logActivity(grantCurrencyCharId, 'currency_grant', `Granted ${parts.join(', ') || 'nothing'}`)
    setGrantCurrency({ cp: 0, sp: 0, gp: 0, pp: 0 })
  }

  function addCombatant() {
    if (!newCombatantName || newCombatantInit === '') return
    setCombatants((prev) => [...prev, { id: crypto.randomUUID(), name: newCombatantName, initiative: parseInt(newCombatantInit) || 0, isParty: false }].sort((a, b) => b.initiative - a.initiative))
    setNewCombatantName('')
    setNewCombatantInit('')
  }

  function addPartyToInitiative(member: PartyMember) {
    if (combatants.some((c) => c.id === member.id)) return
    setCombatants((prev) => [...prev, { id: member.id, name: member.name, initiative: 0, isParty: true }].sort((a, b) => b.initiative - a.initiative))
  }

  function removeCombatant(id: string) {
    setCombatants((prev) => prev.filter((c) => c.id !== id))
    setCurrentTurn(0)
  }

  function nextTurn() {
    setCurrentTurn((prev) => (prev + 1) % Math.max(1, combatants.length))
  }

  function clearInitiative() {
    setCombatants([])
    setCurrentTurn(0)
  }

  function announceRoll(text: string) {
    setRollToast(text)
    if (rollToastTimer.current) clearTimeout(rollToastTimer.current)
    rollToastTimer.current = setTimeout(() => setRollToast(null), 6000)
  }

  function rollNpcAttack(npc: NpcInstance, actionName: string, attackBonus: number) {
    const natural = 1 + Math.floor(Math.random() * 20)
    const total = natural + attackBonus
    const isCrit = natural === 20
    setLastNpcCrit((prev) => ({ ...prev, [`${npc.id}:${actionName}`]: isCrit }))
    announceRoll(`${npc.name} — ${actionName}: ${total} to hit${isCrit ? ' — CRITICAL HIT!' : natural === 1 ? ' — natural 1.' : ''}`)
  }

  function rollNpcDamage(npc: NpcInstance, action: any) {
    const key = `${npc.id}:${action.name}`
    const crit = lastNpcCrit[key]
    const rollDice = (expr: string) => {
      const m = expr.match(/(\d+)d(\d+)/)
      if (!m) return 0
      const count = parseInt(m[1], 10) * (crit ? 2 : 1)
      const sides = parseInt(m[2], 10)
      let total = 0
      for (let i = 0; i < count; i++) total += 1 + Math.floor(Math.random() * sides)
      return total
    }
    let total = rollDice(action.damage_dice) + (action.damage_bonus ?? 0)
    let label = `${action.damage_type ?? 'damage'}`
    if (action.extra_damage_dice) {
      const extra = rollDice(action.extra_damage_dice)
      total += extra
      label += ` + ${action.extra_damage_type ?? ''}`
    }
    announceRoll(`${npc.name} — ${action.name} damage: ${total} ${label}${crit ? ' (crit!)' : ''}`)
    setLastNpcCrit((prev) => ({ ...prev, [key]: false }))
  }

  async function spawnFromLibrary(m: MonsterTemplate) {
    const maxHp = m.stat_block.hit_points ?? 10
    const ac = m.stat_block.armor_class ?? 10
    const { data } = await supabase.from('npc_instances').insert({
      name: m.name, max_hp: maxHp, current_hp: maxHp, armor_class: ac,
      notes: m.source ? `Source: ${m.source}` : null, stat_block: m.stat_block,
    }).select().single()
    if (data) setNpcs((prev) => [...prev, data as NpcInstance])
    setMonsterSearch('')
  }

  async function addNpc() {
    if (!newNpc.name.trim()) return
    const { data } = await supabase.from('npc_instances').insert({
      name: newNpc.name, max_hp: newNpc.max_hp, current_hp: newNpc.max_hp,
      armor_class: newNpc.armor_class, notes: newNpc.notes || null,
    }).select().single()
    if (data) setNpcs((prev) => [...prev, data as NpcInstance])
    setNewNpc({ name: '', max_hp: 10, armor_class: 10, notes: '' })
    setAddNpcOpen(false)
  }

  async function deleteNpc(id: string) {
    if (!confirm('Remove this NPC? This can\'t be undone.')) return
    await supabase.from('npc_instances').delete().eq('id', id)
    setNpcs((prev) => prev.filter((n) => n.id !== id))
    setCombatants((prev) => prev.filter((c) => c.id !== id))
    if (openNpcId === id) setOpenNpcId(null)
  }

  async function applyNpcHp(npc: NpcInstance, kind: 'damage' | 'heal' | 'temp') {
    const amount = Math.max(0, parseInt(npcHpAdjust) || 0)
    if (amount === 0) return
    let newCurrent = npc.current_hp
    let newTemp = npc.temp_hp
    if (kind === 'damage') {
      let remaining = amount
      if (newTemp > 0) {
        const absorbed = Math.min(newTemp, remaining)
        newTemp -= absorbed
        remaining -= absorbed
      }
      newCurrent = Math.max(0, npc.current_hp - remaining)
    } else if (kind === 'heal') {
      newCurrent = Math.min(npc.max_hp, npc.current_hp + amount)
    } else {
      newTemp = Math.max(npc.temp_hp, amount)
    }
    setNpcs((prev) => prev.map((n) => n.id === npc.id ? { ...n, current_hp: newCurrent, temp_hp: newTemp } : n))
    await supabase.from('npc_instances').update({ current_hp: newCurrent, temp_hp: newTemp }).eq('id', npc.id)
    setNpcHpAdjust('')
  }

  function addNpcToInitiative(npc: NpcInstance) {
    if (combatants.some((c) => c.id === npc.id)) return
    setCombatants((prev) => [...prev, { id: npc.id, name: npc.name, initiative: 0, isParty: false }].sort((a, b) => b.initiative - a.initiative))
  }

  async function saveCampaignNotes(content: string) {
    if (campaignNotes?.id) {
      await supabase.from('campaign_notes').update({ content, updated_at: new Date().toISOString() }).eq('id', campaignNotes.id)
      setCampaignNotes({ id: campaignNotes.id, content })
    } else {
      const { data } = await supabase.from('campaign_notes').insert({ content }).select('id').single()
      if (data) setCampaignNotes({ id: data.id, content })
    }
  }

  const filteredItems = itemSearch ? itemCatalog.filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 30) : []
  const filteredLog = logFilter === 'all' ? log : log.filter((l) => l.character_id === logFilter)
  const visibleParty = trackedIds === null ? party : party.filter((p) => trackedIds.includes(p.id))

  if (loading) return <main className="p-10 text-parchment/60">Reading the DM's screen…</main>

  return (
    <main className="min-h-screen px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-6 pb-4 border-b" style={{ borderColor: 'rgba(138,28,46,0.4)' }}>
        <h1 className="font-display text-4xl text-blood-bright">DM Panel</h1>
        <p className="text-base text-parchment/50">Actions taken here log as DM changes, kept separate from what players do on their own sheets.</p>
      </div>

      <div className="panel rounded-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-base text-blood-bright uppercase tracking-wide">Party Overview <span className="text-parchment/30 text-sm normal-case">(live)</span></h2>
          <button onClick={() => setManageTrackedOpen((o) => !o)} className="text-sm text-blood-bright hover:text-parchment border border-mist rounded-full px-3 py-1">
            {manageTrackedOpen ? 'Done' : 'Manage'}
          </button>
        </div>
        {manageTrackedOpen && (
          <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-mist/40">
            {party.map((m) => {
              const isTracked = trackedIds === null || trackedIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => toggleTracked(m.id)}
                  className={`text-sm rounded-full px-3 py-1 border transition-colors ${isTracked ? 'border-candle text-candle' : 'border-mist text-parchment/40'}`}
                >
                  {isTracked ? '✓ ' : ''}{m.name}
                </button>
              )
            })}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleParty.map((m) => {
            const ac = computeAC(m)
            const conds = conditionsFor(m.id)
            const hpPct = Math.max(0, Math.min(100, (m.current_hp / Math.max(1, m.max_hp)) * 100))
            return (
              <Link key={m.id} href={`/character/${m.id}`} className="border border-mist rounded-sm p-3 hover:border-blood-bright/50 transition-colors block">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-display text-candle">{m.name}</span>
                  <span className="text-sm text-parchment/50">AC {ac}</span>
                </div>
                <div className="text-sm text-parchment/60 mb-2">Lv {m.level} {m.class?.name}{m.subclass ? ` (${m.subclass.name})` : ''}</div>
                <div className="h-1.5 bg-mist/30 rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full transition-all ${hpPct <= 25 ? 'bg-blood-bright' : hpPct <= 50 ? 'bg-candle' : 'bg-parchment/50'}`} style={{ width: `${hpPct}%` }} />
                </div>
                <div className="text-sm text-parchment/70">{m.current_hp} / {m.max_hp}{m.temp_hp > 0 ? ` (+${m.temp_hp})` : ''}</div>
                {conds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conds.map((c) => <span key={c} className="wax-seal text-xs px-2 py-0.5 rounded-full">{c}</span>)}
                  </div>
                )}
              </Link>
            )
          })}
          {visibleParty.length === 0 && party.length > 0 && <p className="text-sm text-parchment/40 italic">No characters currently tracked — click Manage to add some.</p>}
          {party.length === 0 && <p className="text-sm text-parchment/40 italic">No characters yet.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="panel rounded-sm p-4">
          <h2 className="font-display text-base text-blood-bright mb-3 uppercase tracking-wide">Adjust HP</h2>
          <select value={hpCharId} onChange={(e) => setHpCharId(e.target.value)} className="w-full bg-ink border border-mist rounded-sm p-2 text-sm mb-2">
            <option value="">Choose a character…</option>
            {party.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" value={hpAmount} onChange={(e) => setHpAmount(e.target.value)} placeholder="0" className="w-20 bg-ink border border-mist rounded-sm text-center p-2 text-sm" />
            <button onClick={() => applyHpAdjust('damage')} className="flex-1 text-sm border border-blood-bright/50 text-blood-bright rounded-sm hover:bg-blood/20 transition-colors">Damage</button>
            <button onClick={() => applyHpAdjust('heal')} className="flex-1 text-sm border border-candle/50 text-candle rounded-sm hover:bg-candle/10 transition-colors">Heal</button>
          </div>
        </div>

        <div className="panel rounded-sm p-4">
          <h2 className="font-display text-base text-blood-bright mb-3 uppercase tracking-wide">Grant Currency</h2>
          <select value={grantCurrencyCharId} onChange={(e) => setGrantCurrencyCharId(e.target.value)} className="w-full bg-ink border border-mist rounded-sm p-2 text-sm mb-2">
            <option value="">Choose a character…</option>
            {party.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {(['cp', 'sp', 'gp', 'pp'] as const).map((f) => (
              <div key={f}>
                <div className="text-xs text-parchment/40 uppercase text-center mb-1">{f}</div>
                <input
                  type="number"
                  value={grantCurrency[f]}
                  onChange={(e) => setGrantCurrency((prev) => ({ ...prev, [f]: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-ink border border-mist rounded-sm text-center p-1.5 text-sm"
                />
              </div>
            ))}
          </div>
          <button onClick={grantCurrencyToChar} disabled={!grantCurrencyCharId} className="w-full text-sm border border-blood-bright/50 text-blood-bright rounded-sm py-1.5 hover:bg-blood/20 transition-colors disabled:opacity-30">Grant</button>
        </div>
      </div>

      <div className="panel rounded-sm p-4 mb-4">
        <h2 className="font-display text-base text-blood-bright mb-3 uppercase tracking-wide">Grant Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <select value={grantItemCharId} onChange={(e) => setGrantItemCharId(e.target.value)} className="bg-ink border border-mist rounded-sm p-2 text-sm">
            <option value="">Choose a character…</option>
            {party.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => { setItemSearch(e.target.value); setGrantItemId('') }}
            placeholder="Search items…"
            className="bg-ink border border-mist rounded-sm p-2 text-sm md:col-span-2"
          />
          <input type="number" min={1} value={grantItemQty} onChange={(e) => setGrantItemQty(parseInt(e.target.value) || 1)} className="bg-ink border border-mist rounded-sm p-2 text-sm text-center" />
        </div>
        {itemSearch && !grantItemId && (
          <div className="border border-mist rounded-sm max-h-40 overflow-y-auto mb-2">
            {filteredItems.map((i) => (
              <div key={i.id} onClick={() => { setGrantItemId(i.id); setItemSearch(i.name) }} className="px-3 py-1.5 text-sm hover:bg-candle/10 cursor-pointer">
                {i.name} <span className="text-parchment/40 text-xs">({i.category})</span>
              </div>
            ))}
            {filteredItems.length === 0 && <p className="px-3 py-1.5 text-sm text-parchment/40 italic">No matches.</p>}
          </div>
        )}
        <button onClick={grantItem} disabled={!grantItemCharId || !grantItemId} className="text-sm border border-blood-bright/50 text-blood-bright rounded-sm px-4 py-1.5 hover:bg-blood/20 transition-colors disabled:opacity-30">Grant Item</button>
      </div>

      <div className="panel rounded-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h2 className="font-display text-base text-blood-bright uppercase tracking-wide">Initiative Tracker</h2>
          <div className="flex gap-2">
            <button onClick={nextTurn} disabled={combatants.length === 0} className="text-sm border border-mist rounded-sm px-3 py-1 hover:border-blood-bright/50 disabled:opacity-30 transition-colors">Next Turn</button>
            <button onClick={clearInitiative} className="text-sm text-parchment/40 hover:text-parchment">Clear</button>
          </div>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input type="text" value={newCombatantName} onChange={(e) => setNewCombatantName(e.target.value)} placeholder="Monster/NPC name" className="flex-1 min-w-[140px] bg-ink border border-mist rounded-sm p-2 text-sm" />
          <input type="number" value={newCombatantInit} onChange={(e) => setNewCombatantInit(e.target.value)} placeholder="Init" className="w-20 bg-ink border border-mist rounded-sm p-2 text-sm text-center" />
          <button onClick={addCombatant} className="text-sm border border-mist rounded-sm px-3 hover:border-blood-bright/50 transition-colors">Add</button>
        </div>
        {party.filter((m) => !combatants.some((c) => c.id === m.id)).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {party.filter((m) => !combatants.some((c) => c.id === m.id)).map((m) => (
              <button key={m.id} onClick={() => addPartyToInitiative(m)} className="text-xs border border-mist rounded-full px-2.5 py-1 hover:border-candle/50 text-parchment/70 transition-colors">+ {m.name}</button>
            ))}
          </div>
        )}
        {combatants.length === 0 ? (
          <p className="text-sm text-parchment/40 italic">No combatants yet.</p>
        ) : (
          <div className="space-y-1.5">
            {combatants.map((c, i) => (
              <div key={c.id} className={`flex justify-between items-center px-3 py-2 rounded-sm border transition-colors ${i === currentTurn ? 'border-blood-bright bg-blood/20' : 'border-mist/40'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-candle font-display w-8 text-center">{c.initiative}</span>
                  <span className={c.isParty ? 'text-candle' : 'text-parchment/80'}>{c.name}</span>
                  {i === currentTurn && <span className="text-sm text-blood-bright">← current turn</span>}
                </div>
                <button onClick={() => removeCombatant(c.id)} className="text-sm text-parchment/40 hover:text-blood-bright transition-colors">Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel rounded-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-base text-blood-bright uppercase tracking-wide">NPCs &amp; Enemies <span className="text-parchment/30 text-sm normal-case">(live)</span></h2>
          <button onClick={() => setAddNpcOpen((o) => !o)} className="text-sm border border-blood-bright/50 text-blood-bright rounded-sm px-3 py-1 hover:bg-blood/20 transition-colors">
            {addNpcOpen ? 'Cancel' : '+ Add NPC'}
          </button>
        </div>

        <div className="mb-3">
          <input
            type="text"
            value={monsterSearch}
            onChange={(e) => setMonsterSearch(e.target.value)}
            placeholder={`Search ${monsterLibrary.length} known stat block${monsterLibrary.length === 1 ? '' : 's'}… (e.g. Strahd, Wereraven)`}
            className="w-full bg-ink border border-mist rounded-sm p-2 text-sm focus:border-blood-bright/50 outline-none"
          />
          {monsterSearch && (
            <div className="border border-mist rounded-sm max-h-52 overflow-y-auto mt-1.5">
              {monsterLibrary
                .filter((m) => m.name.toLowerCase().includes(monsterSearch.toLowerCase()))
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => spawnFromLibrary(m)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blood/10 transition-colors flex justify-between items-center border-b border-mist/30 last:border-0"
                  >
                    <span>
                      {m.name}
                      {m.stat_block.challenge && <span className="text-parchment/40 text-xs"> · CR {m.stat_block.challenge}</span>}
                    </span>
                    <span className="text-xs text-blood-bright">+ Spawn</span>
                  </button>
                ))}
              {monsterLibrary.filter((m) => m.name.toLowerCase().includes(monsterSearch.toLowerCase())).length === 0 && (
                <p className="px-3 py-2 text-sm text-parchment/40 italic">No matches in the library yet — use + Add NPC for a one-off.</p>
              )}
            </div>
          )}
        </div>

        {addNpcOpen && (
          <Modal open={addNpcOpen} onClose={() => setAddNpcOpen(false)} title="Add a One-Off NPC">
            <div className="space-y-2">
              <input
                type="text"
                value={newNpc.name}
                onChange={(e) => setNewNpc((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Name (e.g. Strahd's Spellcaster, Wolf #2)"
                className="w-full bg-ink border border-mist rounded-sm p-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-parchment/40 uppercase">Max HP</label>
                  <input type="number" value={newNpc.max_hp} onChange={(e) => setNewNpc((prev) => ({ ...prev, max_hp: parseInt(e.target.value) || 0 }))} className="w-full bg-ink border border-mist rounded-sm p-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-parchment/40 uppercase">Armor Class</label>
                  <input type="number" value={newNpc.armor_class} onChange={(e) => setNewNpc((prev) => ({ ...prev, armor_class: parseInt(e.target.value) || 0 }))} className="w-full bg-ink border border-mist rounded-sm p-2 text-sm mt-1" />
                </div>
              </div>
              <textarea
                value={newNpc.notes}
                onChange={(e) => setNewNpc((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Quick stat block — attacks, abilities, resistances, whatever you need at the table"
                rows={4}
                className="w-full bg-ink border border-mist rounded-sm p-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setAddNpcOpen(false)} className="text-sm text-parchment/60 hover:text-parchment px-3 py-1.5">Cancel</button>
                <button onClick={addNpc} disabled={!newNpc.name.trim()} className="text-sm border border-blood-bright/50 text-blood-bright rounded-sm px-4 py-1.5 hover:bg-blood/20 transition-colors disabled:opacity-30">Create</button>
              </div>
            </div>
          </Modal>
        )}

        {npcs.length === 0 ? (
          <p className="text-sm text-parchment/40 italic">No active NPCs.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {npcs.map((npc) => {
              const hpPct = Math.max(0, Math.min(100, (npc.current_hp / Math.max(1, npc.max_hp)) * 100))
              return (
                <button
                  key={npc.id}
                  onClick={() => setOpenNpcId(npc.id)}
                  className="border border-mist rounded-sm p-2.5 hover:border-blood-bright/50 transition-colors text-left"
                >
                  <div className="text-sm text-candle truncate mb-1">{npc.name}</div>
                  <div className="h-1 bg-mist/30 rounded-full overflow-hidden mb-1">
                    <div className={`h-full ${hpPct <= 25 ? 'bg-blood-bright' : hpPct <= 50 ? 'bg-candle' : 'bg-parchment/50'}`} style={{ width: `${hpPct}%` }} />
                  </div>
                  <div className="text-xs text-parchment/50">{npc.current_hp}/{npc.max_hp} HP</div>
                </button>
              )
            })}
          </div>
        )}

        {openNpcId && (() => {
          const npc = npcs.find((n) => n.id === openNpcId)
          if (!npc) return null
          const sb = npc.stat_block
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpenNpcId(null)}>
              <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" />
              <div className="panel rounded-sm p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-display text-lg text-candle">{npc.name}</h3>
                    {sb?.type && <p className="text-sm text-parchment/50">{sb.type}{sb.challenge ? ` — CR ${sb.challenge}` : ''}</p>}
                  </div>
                  <button onClick={() => setOpenNpcId(null)} className="text-parchment/50 hover:text-candle text-2xl leading-none">×</button>
                </div>

                {/* HP — always front and center, always editable, regardless of whether this NPC has a full stat block */}
                <div className="border border-mist rounded-sm p-3 mb-4">
                  <div className="flex justify-between items-center text-lg mb-2">
                    <span>HP</span>
                    <span>{npc.current_hp} / {npc.max_hp}{npc.temp_hp > 0 ? ` (+${npc.temp_hp})` : ''}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={npcHpAdjust}
                      onChange={(e) => setNpcHpAdjust(e.target.value)}
                      placeholder="0"
                      className="w-16 bg-ink border border-mist rounded-sm text-center text-sm py-1.5 text-parchment"
                    />
                    <button onClick={() => applyNpcHp(npc, 'damage')} className="flex-1 text-sm border border-blood-bright/50 text-blood-bright rounded-sm hover:bg-blood/20 transition-colors">Damage</button>
                    <button onClick={() => applyNpcHp(npc, 'heal')} className="flex-1 text-sm border border-candle/50 text-candle rounded-sm hover:bg-candle/10 transition-colors">Heal</button>
                    <button onClick={() => applyNpcHp(npc, 'temp')} className="flex-1 text-sm border border-mist text-parchment/70 rounded-sm hover:border-candle/50 transition-colors">Temp</button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-3">
                  <span className="text-parchment/50">Armor Class</span>
                  <span className="text-candle">{npc.armor_class}</span>
                </div>

                {sb ? (
                  <>
                    {(sb.speed || sb.senses || sb.skills || sb.damage_resistances || sb.condition_immunities || sb.saving_throws) && (
                      <div className="text-sm space-y-1 mb-4 pb-3 border-b border-mist/40">
                        {sb.speed && <p><span className="text-parchment/50">Speed:</span> {sb.speed}</p>}
                        {sb.senses && <p><span className="text-parchment/50">Senses:</span> {sb.senses}</p>}
                        {sb.saving_throws && <p><span className="text-parchment/50">Saves:</span> {sb.saving_throws}</p>}
                        {sb.skills && <p><span className="text-parchment/50">Skills:</span> {sb.skills}</p>}
                        {sb.damage_resistances && <p><span className="text-parchment/50">Resistances:</span> {sb.damage_resistances}</p>}
                        {sb.condition_immunities && <p><span className="text-parchment/50">Condition Immunities:</span> {sb.condition_immunities}</p>}
                      </div>
                    )}

                    {sb.abilities && (
                      <div className="grid grid-cols-6 gap-1 text-center mb-4 pb-3 border-b border-mist/40">
                        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ab) => (
                          <div key={ab}>
                            <div className="text-[10px] text-parchment/40 uppercase">{ab}</div>
                            <div className="text-sm text-candle">{sb.abilities![ab]} ({sb.abilities![ab] >= 10 ? '+' : ''}{Math.floor((sb.abilities![ab] - 10) / 2)})</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {sb.traits && sb.traits.length > 0 && (
                      <div className="mb-4 pb-3 border-b border-mist/40">
                        <h4 className="font-display text-sm text-candle mb-2 uppercase tracking-wide">Traits</h4>
                        {sb.traits.map((t) => (
                          <p key={t.name} className="text-sm mb-1.5 leading-snug"><span className="text-candle italic">{t.name}.</span> {t.description}</p>
                        ))}
                      </div>
                    )}

                    {sb.actions && sb.actions.length > 0 && (
                      <div className="mb-4 pb-3 border-b border-mist/40">
                        <h4 className="font-display text-sm text-candle mb-2 uppercase tracking-wide">Actions</h4>
                        {sb.actions.map((a) => (
                          <div key={a.name} className="mb-2 last:mb-0">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-sm text-candle italic">{a.name}</span>
                              {typeof a.attack_bonus === 'number' && (() => {
                              const attackBonus: number = a.attack_bonus
                              return (
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={() => rollNpcAttack(npc, a.name, attackBonus)} className="text-xs border border-mist rounded-sm px-2 py-0.5 hover:border-candle/50 hover:text-candle transition-colors">
                                    Hit {attackBonus >= 0 ? `+${attackBonus}` : attackBonus}
                                  </button>
                                  {a.damage_dice && (
                                    <button onClick={() => rollNpcDamage(npc, a)} className="text-xs border border-mist rounded-sm px-2 py-0.5 hover:border-candle/50 hover:text-candle transition-colors">
                                      Dmg {a.damage_dice}{a.damage_bonus ? `+${a.damage_bonus}` : ''}
                                      {lastNpcCrit[`${npc.id}:${a.name}`] && <span className="text-blood-bright"> (crit)</span>}
                                    </button>
                                  )}
                                </div>
                              )
                            })()}
                              {a.save_dc && <span className="text-xs text-parchment/50 shrink-0">DC {a.save_dc} {a.save_ability}</span>}
                            </div>
                            {a.description && <p className="text-sm text-parchment/70 leading-snug mt-0.5">{a.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {sb.legendary_actions && sb.legendary_actions.length > 0 && (
                      <div className="mb-4 pb-3 border-b border-mist/40">
                        <h4 className="font-display text-sm text-candle mb-2 uppercase tracking-wide">Legendary Actions</h4>
                        {sb.legendary_actions.map((a) => (
                          <p key={a.name} className="text-sm mb-1.5 leading-snug"><span className="text-candle italic">{a.name}.</span> {a.description}</p>
                        ))}
                      </div>
                    )}

                    {sb.notes_for_dm && (
                      <p className="text-sm text-parchment/60 italic mb-4">{sb.notes_for_dm}</p>
                    )}
                  </>
                ) : npc.notes ? (
                  <div className="mb-4 pt-1">
                    <p className="text-sm text-parchment/70 whitespace-pre-wrap leading-relaxed">{npc.notes}</p>
                  </div>
                ) : null}

                <div className="flex justify-between pt-3 border-t border-mist/40">
                  <button onClick={() => { addNpcToInitiative(npc); setOpenNpcId(null) }} className="text-sm text-candle hover:text-parchment">+ Add to Initiative</button>
                  <button onClick={() => deleteNpc(npc.id)} className="text-sm text-parchment/40 hover:text-blood-bright">Remove NPC</button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {rollToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 roll-toast rounded-sm pl-4 pr-5 py-3 max-w-lg flex items-start gap-3">
          <span className="wax-seal rounded-full w-2.5 h-2.5 mt-1.5 shrink-0" />
          <div>
            <p className="text-lg text-candle leading-snug">{rollToast}</p>
            <button onClick={() => setRollToast(null)} className="text-sm text-parchment/40 hover:text-parchment mt-1">Dismiss</button>
          </div>
        </div>
      )}

      <div className="panel rounded-sm p-4 mb-4">
        <h2 className="font-display text-base text-blood-bright mb-3 uppercase tracking-wide">Campaign Notes</h2>
        <textarea
          defaultValue={campaignNotes?.content ?? ''}
          onBlur={(e) => saveCampaignNotes(e.target.value)}
          placeholder="Shared DM notes — session plans, secrets, whatever needs a central home…"
          rows={6}
          className="w-full bg-ink border border-mist rounded-sm p-2 text-sm text-parchment focus:border-blood-bright/50 outline-none placeholder:text-parchment/30"
        />
      </div>

      <div className="panel rounded-sm p-4">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h2 className="font-display text-base text-blood-bright uppercase tracking-wide">Activity Log</h2>
          <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="bg-ink border border-mist rounded-sm p-1.5 text-sm">
            <option value="all">All characters</option>
            {party.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {filteredLog.length === 0 ? (
          <p className="text-sm text-parchment/40 italic">Nothing logged yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {filteredLog.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 text-sm flex-wrap">
                <span className="text-parchment/30 shrink-0 w-16">{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full ${entry.source === 'dm' ? 'wax-seal' : 'border border-mist text-parchment/50'}`}>
                  {entry.source === 'dm' ? 'DM' : 'Sheet'}
                </span>
                <span className="text-candle shrink-0">{entry.characters?.name ?? 'Unknown'}:</span>
                <span className="text-parchment/70">{entry.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
