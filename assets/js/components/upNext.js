// Up next (Sidebar_R). Mounted by main.js: mountUpNext(document.getElementById('panel')).
// Queue = player.state.queue; compact rows; a click jumps to that queue index (playAt keeps the queue).
// Panel width/padding/gap live in shell.css (#app[data-panel]); this file only fills it.
import { player } from '../player.js';
import { emptyHTML } from '../util.js';
import { trackRowHTML, syncRows } from './trackRow.js';
import { icon } from '../icons.js';
import { openSimplebox } from './modals.js';

export function mountUpNext(el) {
  el.innerHTML = `
    <div class="un-head">
      <div class="un-heading">
        <h2 class="un-title text-title">Up next</h2>
        <button class="un-clear" type="button" data-clear hidden>Clear queue</button>
      </div>
      <p class="un-from text-caption"></p>
    </div>
    <div class="un-list" data-un-list></div>`;

  const from = el.querySelector('.un-from');
  const list = el.querySelector('[data-un-list]');
  const clear = el.querySelector('[data-clear]');

  function render() {
    const { queue, index, label } = player.state;
    from.textContent = label ? `Playing from ${label}` : '';
    from.hidden = !label;
    clear.hidden = index < 0 || queue.length <= index + 1;

    const start = Math.max(0, index);
    list.innerHTML = queue.length
      ? queue.slice(start).map((t, i) =>
          `<div class="un-row" data-queue-index="${start + i}">
            ${trackRowHTML(t, { variant: 'compact' })}
            <button class="un-remove" type="button" data-remove-index="${start + i}" aria-label="Remove from queue" title="Remove from queue">${icon('x', 24)}</button>
          </div>`).join('')
      : emptyHTML('list-music', 'Nothing queued', '', '', true);

    syncRows(el);
  }

  list.addEventListener('click', (e) => {
    const remove = e.target.closest('[data-remove-index]');
    if (remove) {
      e.stopPropagation();
      player.removeFromQueue(Number(remove.dataset.removeIndex));
      return;
    }
    const row = e.target.closest('[data-queue-index]');
    if (row) player.playAt(Number(row.dataset.queueIndex));
  });
  list.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('[data-queue-index]');
    if (!row) return;
    e.preventDefault();
    const index = Number(row.dataset.queueIndex);
    openSimplebox({ x: e.clientX, y: e.clientY }, [
      { label: 'Remove from queue', danger: true, onClick: () => player.removeFromQueue(index) },
    ]);
  });
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const row = e.target.closest('[data-queue-index]');
    if (row) player.playAt(Number(row.dataset.queueIndex));
  });

  player.subscribe(render);
  clear.addEventListener('click', () => player.clearQueue());
  render();
}
