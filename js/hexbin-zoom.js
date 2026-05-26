const hexbinStateInfo = {
  ALL: {
    name: 'All States', total: '199,354', share: '100%', frp: '89 MW', peak: 'Dec 2019', density: '—',
    blurb: 'NSW dominated with 50.9% of detections along the coastal ranges. WA and NT added high-count savanna burns at lower per-event intensity. SA and VIC recorded under 1% of detections yet produced the season\'s most destructive individual events.'
  },
  NSW: {
    name: 'New South Wales', total: '101,516', share: '50.9%', frp: '76 MW', peak: 'Dec 2019', density: '126.8 / 1k km²',
    blurb: 'Half of all national detections fell in the coastal ranges and tablelands. The fire corridor extended from the Queensland border to the Victorian Alps. At 126.8 per 1,000 km², NSW recorded six times the density of the next closest state.'
  },
  QLD: {
    name: 'Queensland', total: '34,158', share: '17.1%', frp: '50 MW', peak: 'Dec 2019', density: '19.7 / 1k km²',
    blurb: 'Fires peaked in December as dry conditions pushed south from the tropics. Activity centred on inland ranges where lightning ignited fires through dry grass. Low average FRP of 50 MW reflects open woodland burns rather than high-intensity forest fires.'
  },
  WA: {
    name: 'Western Australia', total: '33,964', share: '17.0%', frp: '117 MW', peak: 'Dec 2019', density: '13.4 / 1k km²',
    blurb: 'WA recorded the highest average FRP at 117 MW, driven by Kimberley and Pilbara savanna fires. Detection density was moderate at 13.4 per 1,000 km² despite the largest land area. Dispersed seasonal burns rather than the concentrated east-coast corridors.'
  },
  NT: {
    name: 'Northern Territory', total: '26,037', share: '13.1%', frp: '61 MW', peak: 'Aug 2019', density: '19.3 / 1k km²',
    blurb: 'The NT peaked in August–September, well before the south-east crisis. Savanna fires are managed by Indigenous rangers using cultural burning. The 2019 season saw above-average intensity due to heavy grass growth after the wet 2018–19 monsoon.'
  },
  SA: {
    name: 'South Australia', total: '2,834', share: '1.4%', frp: '93 MW', peak: 'Dec 2019', density: '2.9 / 1k km²',
    blurb: 'SA recorded few detections but high average intensity at 93 MW. The Kangaroo Island fires of January 2020 burned 210,000 hectares and killed an estimated 25,000 koalas. Despite its low count, SA produced the season\'s most ecologically significant events.'
  },
  VIC: {
    name: 'Victoria', total: '845', share: '0.4%', frp: '56 MW', peak: 'Jan 2020', density: '3.7 / 1k km²',
    blurb: 'Victoria had the fewest detections but the most destructive fires per event. East Gippsland alpine forests drove extreme pyroconvection under heavy fuel loads. January 2020 prompted Australia\'s first peacetime military deployment to a natural disaster.'
  },
  TAS: {
    name: 'Tasmania', total: '< 50', share: '< 0.1%', frp: '—', peak: '—', density: '—',
    blurb: 'Tasmania recorded negligible detections across the 2019–20 season. Its cooler, wetter climate insulated it from the drought and heat that devastated the mainland. Minor fire activity occurred in remote areas but was insignificant compared to any other state.'
  }
};

const hexbinZoomTargets = {
  ALL: { scale: 680,    tx: 470,    ty: 250 },
  NSW: { scale: 2137.9, tx: -110.1, ty: 6.0 },
  QLD: { scale: 1220.8, tx: 120.3,  ty: 407.9 },
  WA:  { scale: 1009.5, tx: 589.9,  ty: 294.1 },
  NT:  { scale: 1486.7, tx: 383.4,  ty: 489.1 },
  SA:  { scale: 1674.5, tx: 346.8,  ty: 88.9 },
  VIC: { scale: 3400,   tx: -287.6, ty: -396.6 },
  TAS: { scale: 3400,   tx: -347.6, ty: -829.0 }
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function setHexbinProjection(view, target) {
  view.signal('mapScale', target.scale);
  view.signal('mapTx', target.tx);
  view.signal('mapTy', target.ty);
  return view.runAsync();
}

function setHexbinDisplay(view, { selectedState, visibleStateA, visibleStateB = '', binResolution }) {
  view.signal('selectedState', selectedState);
  view.signal('visibleStateA', visibleStateA);
  view.signal('visibleStateB', visibleStateB);
  view.signal('binResolution', binResolution);
  return view.runAsync();
}

function setHexbinSignals(view, signals) {
  Object.entries(signals).forEach(([name, value]) => view.signal(name, value));
  return view.runAsync();
}

function animateHexbinProjection(view, target, duration, isCurrent) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || duration <= 0) {
    return setHexbinProjection(view, target).then(() => true);
  }

  const start = {
    scale: view.signal('mapScale'),
    tx: view.signal('mapTx'),
    ty: view.signal('mapTy')
  };
  const startTime = performance.now();

  return new Promise(resolve => {
    function frame(now) {
      if (!isCurrent()) {
        resolve(false);
        return;
      }
      const t = Math.min((now - startTime) / duration, 1);
      const eased = easeInOutCubic(t);
      setHexbinProjection(view, {
        scale: start.scale + (target.scale - start.scale) * eased,
        tx: start.tx + (target.tx - start.tx) * eased,
        ty: start.ty + (target.ty - start.ty) * eased
      }).then(() => {
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve(true);
        }
      });
    }
    requestAnimationFrame(frame);
  });
}

function animateHexbinSignals(view, targetSignals, duration, isCurrent) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || duration <= 0) {
    return setHexbinSignals(view, targetSignals).then(() => true);
  }

  const startSignals = {};
  Object.keys(targetSignals).forEach(name => {
    startSignals[name] = view.signal(name);
  });
  const startTime = performance.now();

  return new Promise(resolve => {
    function frame(now) {
      if (!isCurrent()) {
        resolve(false);
        return;
      }
      const t = Math.min((now - startTime) / duration, 1);
      const eased = easeInOutCubic(t);
      const nextSignals = {};
      Object.entries(targetSignals).forEach(([name, target]) => {
        nextSignals[name] = startSignals[name] + (target - startSignals[name]) * eased;
      });
      setHexbinSignals(view, nextSignals).then(() => {
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve(true);
        }
      });
    }
    requestAnimationFrame(frame);
  });
}

embedChart('#viz-hexbin', 'vega/09_hexbin.json?v=hierarchy-20260525', embedOpts).then(result => {
  const view = result.view;
  let activeState = 'ALL';
  let zoomToken = 0;

  async function focusHexbinState(targetState) {
    if (!hexbinZoomTargets[targetState] || targetState === activeState) return;
    const sourceState = activeState;
    const token = ++zoomToken;
    const isCurrent = () => token === zoomToken;

    if (targetState === 'ALL') {
      activeState = 'ALL';
      const fadedOut = await animateHexbinSignals(view, {
        fineBinFadeA: 0,
        fineBinFadeB: 0
      }, 220, isCurrent);
      if (!fadedOut || !isCurrent()) return;

      await setHexbinDisplay(view, {
        selectedState: 'ALL',
        visibleStateA: 'ALL',
        binResolution: 'coarse'
      });
      await setHexbinSignals(view, {
        coarseBinFade: 0,
        fineBinFadeA: 0,
        fineBinFadeB: 0
      });
      await Promise.all([
        animateHexbinProjection(view, hexbinZoomTargets.ALL, 620, isCurrent),
        animateHexbinSignals(view, { coarseBinFade: 1 }, 420, isCurrent)
      ]);
      return;
    }

    if (sourceState === 'ALL') {
      activeState = targetState;
      const fadedOut = await animateHexbinSignals(view, { coarseBinFade: 0 }, 220, isCurrent);
      if (!fadedOut || !isCurrent()) return;

      await setHexbinDisplay(view, {
        selectedState: targetState,
        visibleStateA: targetState,
        binResolution: 'fine'
      });
      await setHexbinSignals(view, {
        fineBinFadeA: 0,
        fineBinFadeB: 0
      });
      await Promise.all([
        animateHexbinProjection(view, hexbinZoomTargets[targetState], 760, isCurrent),
        animateHexbinSignals(view, { fineBinFadeA: 1 }, 420, isCurrent)
      ]);
      return;
    }

    activeState = targetState;
    await setHexbinDisplay(view, {
      selectedState: targetState,
      visibleStateA: sourceState,
      visibleStateB: targetState,
      binResolution: 'fine'
    });
    await setHexbinSignals(view, {
      coarseBinFade: 0,
      fineBinFadeA: 1,
      fineBinFadeB: 0
    });

    const [returnedToAll] = await Promise.all([
      animateHexbinProjection(view, hexbinZoomTargets.ALL, 420, isCurrent),
      animateHexbinSignals(view, { fineBinFadeB: 1 }, 280, isCurrent)
    ]);
    if (!returnedToAll || !isCurrent()) return;

    await animateHexbinProjection(
      view,
      hexbinZoomTargets[targetState],
      760,
      isCurrent
    );
    if (!isCurrent()) return;

    const fadedSource = await animateHexbinSignals(view, { fineBinFadeA: 0 }, 260, isCurrent);
    if (!fadedSource || !isCurrent()) return;

    await setHexbinDisplay(view, {
      selectedState: targetState,
      visibleStateA: targetState,
      binResolution: 'fine'
    });
    await setHexbinSignals(view, {
      fineBinFadeA: 1,
      fineBinFadeB: 0
    });
  }

  function setHexbinBtnActive(state) {
    document.querySelectorAll('#hexbin-state-btns .hexbin-state-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.state === state);
    });
  }

  function updateHexbinInfoBoard(state) {
    const info = hexbinStateInfo[state] || hexbinStateInfo.ALL;
    document.getElementById('hexbin-ib-name').textContent    = info.name;
    document.getElementById('hexbin-ib-total').textContent   = info.total;
    document.getElementById('hexbin-ib-share').textContent   = info.share;
    document.getElementById('hexbin-ib-frp').textContent     = info.frp;
    document.getElementById('hexbin-ib-peak').textContent    = info.peak;
    document.getElementById('hexbin-ib-density').textContent = info.density;
    document.getElementById('hexbin-ib-blurb').textContent   = info.blurb;
  }

  document.querySelectorAll('#hexbin-state-btns .hexbin-state-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setHexbinBtnActive(btn.dataset.state);
      updateHexbinInfoBoard(btn.dataset.state);
      focusHexbinState(btn.dataset.state);
    });
  });
});
