// Up next (Sidebar_R). Mounted by main.js: mountUpNext(document.getElementById('panel')).
// Queue = player.state.queue; compact rows; a click jumps to that queue index (playAt keeps the queue).
// Panel width/padding/gap live in shell.css (#app[data-panel]); this file only fills it.
import { player } from '../player.js';
import { emptyHTML } from '../util.js';
import { trackRowHTML, syncRows } from './trackRow.js';

export function mountUpNext(el) {
  el.innerHTML = `
    <div class="un-head">
      <h2 class="un-title text-title">Up next</h2>
      <p class="un-from text-caption"></p>
    </div>
    <div class="un-list" data-un-list></div>`;

  const from = el.querySelector('.un-from');
  const list = el.querySelector('[data-un-list]');

  function render() {
    const { queue, index, label } = player.state;
    from.textContent = label ? `Playing from ${label}` : '';
    from.hidden = !label;

    const start = Math.max(0, index);
    list.innerHTML = queue.length
      ? queue.slice(start).map((t, i) =>
          `<div class="un-row" data-queue-index="${start + i}">${trackRowHTML(t, { variant: 'compact' })}</div>`).join('')
      : emptyHTML('list-music', 'Nothing queued', '', '', true);

    syncRows(el);
  }

  list.addEventListener('click', (e) => {
    const row = e.target.closest('[data-queue-index]');
    if (row) player.playAt(Number(row.dataset.queueIndex));
  });
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const row = e.target.closest('[data-queue-index]');
    if (row) player.playAt(Number(row.dataset.queueIndex));
  });

  player.subscribe(render);
  render();
}
