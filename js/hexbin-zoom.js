const hexbinZoomTargets = {
  ALL: { scale: 680,    tx: 395,    ty: 230 },
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

  view.addSignalListener('requestedState', (name, value) => {
    focusHexbinState(value);
  });
});
