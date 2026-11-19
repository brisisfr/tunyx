// Inline rename used by the sidebar playlist rows and the playlist view title.
// Swaps `labelEl` for an input: Enter or blur saves, Esc cancels. onSave(trimmed) may be async;
// the caller handles its own errors/toasts. The original element is always restored.
export function inlineRename(labelEl, { value, className = '', onSave }) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = className;
  input.value = value;
  input.setAttribute('aria-label', 'Playlist name');
  let done = false;

  const finish = (save) => {
    if (done) return;
    done = true;
    const next = input.value.trim();
    input.replaceWith(labelEl);
    if (save && next && next !== value) onSave?.(next);
  };

  // The sidebar row is an <a>: keep clicks/Enter from navigating while editing.
  input.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
  input.addEventListener('mousedown', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));

  labelEl.replaceWith(input);
  input.focus();
  input.select();
}
