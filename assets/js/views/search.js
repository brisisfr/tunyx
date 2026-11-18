// Old /search link target (search is a dropdown in the top bar now). Router still imports it until
// Claude's router.js change lands; it just forwards home. Delete when that import is gone.
export default {
  panel: false,
  render(el) {
    el.replaceChildren();
    location.replace('#/home');
  },
};
