import { type CSSProperties, useEffect, useState } from 'react';
import { accountFollows, competitions, players, sources } from '../data/catalogue';
import type { ItemKind } from '../data/types';
import { ALL_KINDS, countFor, countForYou, defaultPrefs, kindLabels, type Prefs, prefsStore, type Strength } from '../lib/feed';
import { cx, KindGlyph, PlayerDisc, SourceAvatar } from '../ui/bits';
import { CheckIcon } from '../ui/icons';
import { toast } from './actions';
import { Sheet } from './Sheet';

const strengths: { id: Strength; label: string; body: string }[] = [
  { id: 'everything', label: 'Everything', body: 'Latest first from every source. Follows don’t change the order.' },
  { id: 'boost', label: 'Follows first', body: 'Everything, with your players, competitions and sources moved up.' },
  { id: 'only', label: 'Only follows', body: 'Nothing unless it matches someone or something you follow.' },
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
    toast(`Feed tuned · ${count} items`);
  }

  return (
    <Sheet
      className="tune"
      eyebrow="Personalise"
      footer={
        <>
          <button className="pill-btn is-ghost" onClick={() => setDraft(defaultPrefs)} type="button">
            Reset
          </button>
          <button className="pill-btn is-wide" disabled={!count} onClick={apply} type="button">
            {count ? `${dirty ? 'Apply' : 'Done'} · ${count} items` : 'Nothing matches'}
          </button>
        </>
      }
      onClose={onClose}
      open={open}
      title="Tune your feed"
    >
      <section className="tune-block">
        <h3 className="mini-head">How much should follows matter?</h3>
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
        <p className="tune-help">{strengths.find((option) => option.id === draft.strength)?.body}</p>
      </section>

      <section className="tune-block">
        <h3 className="mini-head">
          Players <span>{draft.players.length} followed</span>
        </h3>
        <p className="tune-help">Synced with the players you follow in OcheHub. Changes here update your account follows.</p>
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
                <PlayerDisc playerId={player.id} size={32} />
                <span className="pick-text">
                  <strong>{player.last}</strong>
                  <span>
                    {player.first} · {countFor('player', player.id)} in feed
                  </span>
                </span>
                <span className="pick-check">
                  <CheckIcon size={14} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="tune-block">
        <h3 className="mini-head">
          Competitions <span>{draft.competitions.length} followed</span>
        </h3>
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
                {on ? <CheckIcon size={14} /> : null}
                {competition.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="tune-block">
        <h3 className="mini-head">
          Sources <span>{draft.sources.length} followed</span>
        </h3>
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
                  <SourceAvatar size={36} sourceId={source.id} />
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
        <h3 className="mini-head">In your mix</h3>
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
