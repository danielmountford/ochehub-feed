import { competitionById, playerById, sourceById } from '../data/catalogue';
import type { VideoItem } from '../data/types';
import type { Focus } from '../lib/feed';
import { useStore } from '../lib/store';
import { emitFocus, FollowButton, shareItem } from '../feed/actions';
import { SaveButton, SourceAvatar, Thumb } from '../ui/bits';
import { ExternalIcon, ShareIcon } from '../ui/icons';
import { player, playerStore } from './controller';

/**
 * One card in the video pager. The poster sits in the slot the live stage
 * covers, so neighbouring cards show their artwork while you swipe. Under it:
 * the title, who made it, three icons and what comes next.
 */
export function VideoSlide({ item, current }: { item: VideoItem; current: boolean }) {
  const queue = useStore(playerStore, (state) => state.queue);
  const index = useStore(playerStore, (state) => state.index);
  const source = sourceById.get(item.sourceId);
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
          <h2 className="vslide-title">{item.headline}</h2>
          {item.context ? <p className="vslide-context">{item.context}</p> : null}

          <div className="vslide-source">
            <SourceAvatar size={30} sourceId={item.sourceId} />
            <strong>{source?.name}</strong>
            <FollowButton id={item.sourceId} type="source" />
          </div>

          <div className="icon-row">
            <SaveButton className="icon-btn" item={item} />
            <button aria-label="Share" className="icon-btn" onClick={() => shareItem(item)} type="button">
              <ShareIcon size={22} />
            </button>
            <a aria-label="Open on YouTube" className="icon-btn" href={item.url} rel="noreferrer" target="_blank">
              <ExternalIcon size={22} />
            </a>
          </div>

          {item.players.length || item.competitions.length ? (
            <div className="tag-row" data-hscroll>
              {item.players.map((id) => {
                const entry = playerById.get(id);
                return entry ? (
                  <button className="tag" key={id} onClick={() => focusOn({ type: 'player', id })} type="button">
                    {entry.first} {entry.last}
                  </button>
                ) : null;
              })}
              {item.competitions.map((id) => {
                const entry = competitionById.get(id);
                return entry ? (
                  <button className="tag" key={id} onClick={() => focusOn({ type: 'competition', id })} type="button">
                    {entry.name}
                  </button>
                ) : null;
              })}
            </div>
          ) : null}

          {upNext.length ? (
            <section className="upnext">
              <h3 className="mini-head">Next</h3>
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
