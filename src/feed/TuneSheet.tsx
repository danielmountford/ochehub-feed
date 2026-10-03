import { type CSSProperties, useEffect, useState } from 'react';
import { accountFollows, competitions, players, sources } from '../data/catalogue';
import type { ItemKind } from '../data/types';
import { ALL_KINDS, countFor, countForYou, defaultPrefs, kindLabels, type Prefs, prefsStore, type Strength } from '../lib/feed';
import { cx, KindGlyph, PlayerDisc, SourceAvatar } from '../ui/bits';
import { toast } from './actions';
import { Sheet } from './Sheet';

const strengths: { id: Strength; label: string }[] = [
  { id: 'everything', label: 'Everything' },
  { id: 'boost', label: 'Follows first' },
  { id: 'only', label: 'Only follows' },
];

const sourceKindLabel = { videoChannel: 'Video channel', podcastShow: 'Podcast', newsPublisher: 'News' } as const;

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/**
 * Personalisation. Changes are staged and applied together (the same atomic
 * update the OcheHub Personalise screen makes), and the button reports how
 * many items the feed will hold before you commit.
 */
export function TuneSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<Prefs>(prefsStore.get());

  useEffect(() => {
    if (open) {
      setDraft(prefsStore.get());
    }
  }, [open]);

  const count = countForYou(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(prefsStore.get());

  // Account follows first, then everyone else.
  const orderedPlayers = [...players].sort(
    (a, b) => Number(accountFollows.players.includes(b.id)) - Number(accountFollows.players.includes(a.id)),
  );

  function apply() {
    prefsStore.set(draft);
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`Tuned · ${count} items`);
  }

  return (
    <Sheet
      className="tune"
      footer={
        <>
          <button className="text-btn" onClick={() => setDraft(defaultPrefs)} type="button">
            Reset
          </button>
          <button className="pill-btn is-wide" disabled={!count} onClick={apply} type="button">
            {count ? `${dirty ? 'Apply' : 'Done'} · ${count}` : 'Nothing matches'}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Tune"
    >
      <section className="tune-block">
        <div className="segmented" role="radiogroup">
          {strengths.map((option) => (
            <button
              aria-checked={draft.strength === option.id}
              className={cx(draft.strength === option.id && 'is-on')}
              key={option.id}
              onClick={() => setDraft({ ...draft, strength: option.id })}
              role="radio"
              type="button"
            >
              {option.label}
            </button>
          ))}
          <span
            aria-hidden="true"
            className="segmented-thumb"
            style={{ '--index': strengths.findIndex((option) => option.id === draft.strength) } as CSSProperties}
          />
        </div>
      </section>

      <section className="tune-block">
        <h3 className="mini-head">
          Players <span>from your OcheHub follows</span>
        </h3>
        <div className="pick-grid">
          {orderedPlayers.map((player) => {
            const on = draft.players.includes(player.id);
            return (
              <button
                aria-pressed={on}
                className={cx('pick', on && 'is-on')}
                key={player.id}
                onClick={() => setDraft({ ...draft, players: toggle(draft.players, player.id) })}
                style={{ '--hue': player.hue } as CSSProperties}
                type="button"
              >
                <PlayerDisc playerId={player.id} size={28} />
                <strong>{player.last}</strong>
                <span className="pick-count">{countFor('player', player.id)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="tune-block">
        <h3 className="mini-head">Competitions</h3>
        <div className="chip-wrap">
          {competitions.map((competition) => {
            const on = draft.competitions.includes(competition.id);
            return (
              <button
                aria-pressed={on}
                className={cx('toggle-chip', on && 'is-on')}
                key={competition.id}
                onClick={() => setDraft({ ...draft, competitions: toggle(draft.competitions, competition.id) })}
                type="button"
              >
                {competition.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="tune-block">
        <h3 className="mini-head">Sources</h3>
        <ul className="source-list">
          {sources.map((source) => {
            const on = draft.sources.includes(source.id);
            return (
              <li key={source.id}>
                <button
                  aria-checked={on}
                  onClick={() => setDraft({ ...draft, sources: toggle(draft.sources, source.id) })}
                  role="switch"
                  type="button"
                >
                  <SourceAvatar size={32} sourceId={source.id} />
                  <span className="source-list-text">
                    <strong>{source.short}</strong>
                    <span>{sourceKindLabel[source.kind]}</span>
                  </span>
                  <span className={cx('switch', on && 'is-on')}>
                    <i />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="tune-block">
        <h3 className="mini-head">Show me</h3>
        <div className="mix-grid">
          {ALL_KINDS.map((kind: ItemKind) => {
            const on = draft.kinds.includes(kind);
            return (
              <button
                aria-pressed={on}
                className={cx('mix', `kind-${kind}`, on && 'is-on')}
                key={kind}
                onClick={() => setDraft({ ...draft, kinds: ALL_KINDS.filter((entry) => toggle(draft.kinds, kind).includes(entry)) })}
                type="button"
              >
                <KindGlyph kind={kind} size={22} />
                {kindLabels[kind]}
              </button>
            );
          })}
        </div>
      </section>
    </Sheet>
  );
}
