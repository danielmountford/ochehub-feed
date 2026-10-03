import { competitionById, playerById, sourceById } from '../data/catalogue';
import type { VideoItem } from '../data/types';
import { type Focus, prefsStore, reasonFor } from '../lib/feed';
import { useStore } from '../lib/store';
import { emitFocus, FollowButton, shareItem } from '../feed/actions';
import { KindTag, PlayerDisc, SaveButton, SourceAvatar, Thumb } from '../ui/bits';
import { ExternalIcon, ShareIcon } from '../ui/icons';
import { player, playerStore } from './controller';

/**
 * One card in the video pager. The poster sits in the slot the live stage
 * covers, so neighbouring cards show their artwork while you swipe.
 */
export function VideoSlide({ item, current }: { item: VideoItem; current: boolean }) {
  const prefs = useStore(prefsStore);
  const queue = useStore(playerStore, (state) => state.queue);
  const index = useStore(playerStore, (state) => state.index);
  const source = sourceById.get(item.sourceId);
  const reason = reasonFor(item, prefs);
  const upNext = current ? queue.slice(index + 1, index + 4) : [];

  function focusOn(focus: Focus) {
    player.minimise();
    emitFocus(focus);
  }

  return (
    <article className="vslide">
      <div className="vslide-slot" data-slot={current ? 'current' : undefined}>
        <Thumb eager item={item} quality="high" />
      </div>

      <div className="vslide-scroll" data-scroll>
        <div className="vslide-body">
          <div className="vslide-tags">
            <KindTag kind="video" />
            {reason ? <span className="reason">Because you follow {reason.label}</span> : null}
          </div>
          <h2 className="vslide-title">{item.headline}</h2>
          {item.context ? <p className="vslide-context">{item.context}</p> : null}

          <div className="vslide-source">
            <SourceAvatar size={40} sourceId={item.sourceId} />
            <div>
              <strong>{source?.name}</strong>
              <span>{source?.blurb}</span>
            </div>
            <FollowButton id={item.sourceId} type="source" />
          </div>

          <div className="action-row">
            <SaveButton className="action" item={item} label />
            <button className="action" onClick={() => shareItem(item)} type="button">
              <ShareIcon size={20} />
              <span>Share</span>
            </button>
            <a className="action" href={item.url} rel="noreferrer" target="_blank">
              <ExternalIcon size={20} />
              <span>YouTube</span>
            </a>
          </div>

          {item.players.length || item.competitions.length ? (
            <div className="chip-row" data-hscroll>
              {item.players.map((id) => {
                const entry = playerById.get(id);
                return entry ? (
                  <button className="chip" key={id} onClick={() => focusOn({ type: 'player', id })} type="button">
                    <PlayerDisc playerId={id} size={22} />
                    {entry.first} {entry.last}
                  </button>
                ) : null;
              })}
              {item.competitions.map((id) => {
                const entry = competitionById.get(id);
                return entry ? (
                  <button className="chip" key={id} onClick={() => focusOn({ type: 'competition', id })} type="button">
                    {entry.name}
                  </button>
                ) : null;
              })}
            </div>
          ) : null}

          {upNext.length ? (
            <section className="upnext">
              <h3 className="mini-head">Up next</h3>
              <ol>
                {upNext.map((next, offset) => (
                  <li key={next.id}>
                    <button onClick={() => player.jumpTo(index + 1 + offset)} type="button">
                      <span className="upnext-thumb">
                        <Thumb item={next as VideoItem} />
                      </span>
                      <span className="upnext-text">
                        <strong>{(next as VideoItem).headline}</strong>
                        <span>{sourceById.get(next.sourceId)?.short}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}
