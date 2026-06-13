$(document).ready(function () {
  // Navbar burger (mobile)
  $(".navbar-burger").click(function () {
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });

  // Comparison tabs switch
  $('.comparison-tabs li[data-comparison-tab]').on('click', function () {
    var tab = $(this).data('comparison-tab');
    $('.comparison-tabs li').removeClass('is-active');
    $(this).addClass('is-active');
    $('.comparison-tab-pane').removeClass('is-active');
    $('#comparison-' + tab).addClass('is-active');
    refreshPlayback();
  });

  // Group-sync helper: keep multiple videos in a grid aligned despite the
  // per-video loop/decode jitter. Used by Motivation grids and by every
  // qualitative-results details block.
  function attachGridSync(grid) {
    if (grid.dataset.syncAttached) return;
    var videos = Array.prototype.slice.call(grid.querySelectorAll('video'));
    if (videos.length < 2) return;
    grid.dataset.syncAttached = '1';
    // Disable each video's own loop; we restart them together when all end.
    videos.forEach(function (v) { v.loop = false; v.removeAttribute('loop'); });
    var endedCount = 0;
    var restart = function () {
      videos.forEach(function (v) {
        try { v.currentTime = 0; } catch (e) { }
        v.play().catch(function () { });
      });
    };
    videos.forEach(function (v) {
      v.addEventListener('ended', function () {
        endedCount += 1;
        if (endedCount >= videos.length) {
          endedCount = 0;
          restart();
        }
      });
    });
    // Periodically resync to the leader (first video) to suppress drift
    // caused by per-video decode jitter.
    var leader = videos[0];
    leader.addEventListener('timeupdate', function () {
      var lt = leader.currentTime;
      videos.forEach(function (v, i) {
        if (i === 0) return;
        if (v.readyState >= 2 && Math.abs(v.currentTime - lt) > 0.15) {
          try { v.currentTime = lt; } catch (e) { }
        }
      });
    });
  }

  // Sync videos in the Motivation section.
  var motivation = document.getElementById('motivation');
  if (motivation) {
    motivation.querySelectorAll('.compare-videos').forEach(attachGridSync);
  }

  // Each comparison category shows one example at a time, navigated with a
  // left/right arrow pager instead of a stack of collapsible blocks.
  var pagers = [];
  document.querySelectorAll('.comparison-by-id').forEach(function (container) {
    var blocks = Array.prototype.slice.call(
      container.querySelectorAll('details.compare-block'));
    if (!blocks.length) return;

    // Keep every block's content rendered; visibility is driven by .is-current.
    blocks.forEach(function (block) {
      block.open = true;
      block.querySelectorAll('.compare-videos').forEach(attachGridSync);
    });

    // Build the arrow pager (with dot indicators) below the example blocks.
    var pager = document.createElement('div');
    pager.className = 'id-pager';
    pager.innerHTML =
      '<button type="button" class="pager-arrow" data-pager-dir="prev" aria-label="Previous example">' +
      '<span aria-hidden="true">❮</span></button>' +
      '<div class="pager-dots"></div>' +
      '<button type="button" class="pager-arrow" data-pager-dir="next" aria-label="Next example">' +
      '<span aria-hidden="true">❯</span></button>';
    container.appendChild(pager);

    var state = { blocks: blocks, current: 0 };

    // One indicator per example; the active one stretches into a long segment.
    var dotsWrap = pager.querySelector('.pager-dots');
    var dots = blocks.map(function (block, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'pager-dot';
      dot.setAttribute('aria-label', 'Show example ' + (i + 1));
      dot.addEventListener('click', function () {
        state.current = i;
        render();
        refreshPlayback();
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function render() {
      blocks.forEach(function (block, i) {
        block.classList.toggle('is-current', i === state.current);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === state.current);
      });
    }

    pager.querySelectorAll('.pager-arrow').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var delta = btn.dataset.pagerDir === 'next' ? 1 : -1;
        state.current = (state.current + delta + blocks.length) % blocks.length;
        render();
        refreshPlayback();
      });
    });

    render();
    pagers.push(state);
  });

  // Play only the visible example of the active category; pause everything
  // else so hidden panes don't decode video in the background.
  function refreshPlayback() {
    pagers.forEach(function (state) {
      var pane = state.blocks[0].closest('.comparison-tab-pane');
      var paneActive = !pane || pane.classList.contains('is-active');
      state.blocks.forEach(function (block, i) {
        var active = paneActive && i === state.current;
        block.querySelectorAll('video').forEach(function (v) {
          if (active) {
            // Restart from 0 so the grid starts aligned each time it appears.
            if (v.paused) { try { v.currentTime = 0; } catch (e) { } }
            v.play().catch(function () { });
          } else {
            v.pause();
          }
        });
      });
    });
  }

  refreshPlayback();
});
