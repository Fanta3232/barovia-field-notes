'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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

async function refreshLog(setLog: (rows: LogEntry[]) => void) {
  const { data } = await supabase
    .from('character_activity_log')
    .select('id, character_id, source, detail, created_at, characters:character_id(name)')
    .order('created_at', { ascending: false })
    .limit(75)
  setLog((data ?? []) as unknown as LogEntry[])
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

  useEffect(() => {
    async function load() {
      const [charsRes, invRes, condRes, itemsRes, notesRes] = await Promise.all([
        supabase.from('characters').select('id, name, level, current_hp, max_hp, temp_hp, strength, dexterity, constitution, wisdom, class:class_id(name), subclass:subclass_id(name)').eq('is_quickstart_template', false).order('name'),
        supabase.from('character_inventory').select('character_id, items:item_id(category, properties)').eq('equipped', true),
        supabase.from('character_conditions').select('character_id, conditions:condition_id(name)'),
        supabase.from('items').select('id, name, category').order('name'),
        supabase.from('campaign_notes').select('id, content').limit(1),
      ])
      setParty((charsRes.data ?? []) as unknown as PartyMember[])
      setEquippedArmor((invRes.data ?? []) as unknown as EquippedItem[])
      setConditions((condRes.data ?? []) as unknown as ConditionEntry[])
      setItemCatalog((itemsRes.data ?? []) as ItemCatalogRow[])
      const notesRow = (notesRes.data ?? [])[0] as { id: string; content: string | null } | undefined
      setCampaignNotes(notesRow ? { id: notesRow.id, content: notesRow.content ?? '' } : null)
      await refreshLog(setLog)
      setLoading(false)
    }
    load()
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

  if (loading) return <main className="p-10 text-parchment/60">Reading the DM's screen…</main>

  return (
    <main className="min-h-screen px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-6 pb-4 border-b" style={{ borderColor: 'rgba(138,28,46,0.4)' }}>
        <h1 className="font-display text-4xl text-blood-bright">DM Panel</h1>
        <p className="text-base text-parchment/50">Actions taken here log as DM changes, kept separate from what players do on their own sheets.</p>
      </div>

      <div className="panel rounded-sm p-4 mb-4">
        <h2 className="font-display text-base text-blood-bright mb-3 uppercase tracking-wide">Party Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {party.map((m) => {
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
