<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tunyx</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="assets/css/tokens.css">
  <link rel="stylesheet" href="assets/css/shell.css">
  <link rel="stylesheet" href="assets/css/sidebar.css">
</head>
<body>
  <!-- Mount points are the contract main.js / router.js expect:
       #app (data-sidebar, data-panel), #sidebar, #topbar, #view, #panel, #playerbar -->
  <div id="app" data-sidebar="expanded" data-panel="closed">
    <div class="app-body">
      <aside id="sidebar"></aside>
      <main class="main">
        <header id="topbar"></header>
        <div id="view"></div>
      </main>
      <aside id="panel"></aside>
    </div>
    <footer id="playerbar"></footer>
  </div>

  <script type="module" src="assets/js/main.js"></script>
</body>
</html>
