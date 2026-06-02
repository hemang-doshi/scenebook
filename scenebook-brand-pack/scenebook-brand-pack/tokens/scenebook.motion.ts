// SceneBook Framer Motion variants — timing derived from source .18s CSS transitions.
export const sbMotion = {
  duration: {
    instant: 0,
    micro: 0.09,
    fast: 0.18,
    standard: 0.27,
    slow: 0.36,
    receipt: 0.54,
  },
  layout: {
    workspaceRail: 0.27,
    floatingIsland: 0.27,
  },
  ease: 'easeInOut', // use only if your motion library needs a named equivalent; CSS source uses `ease`
};

export const panelEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: sbMotion.duration.standard } },
  exit: { opacity: 0, y: 6, transition: { duration: sbMotion.duration.fast } },
};

export const drawerEnter = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: { duration: sbMotion.duration.slow } },
  exit: { opacity: 0, x: 8, transition: { duration: sbMotion.duration.fast } },
};

export const receiptExpand = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto', transition: { duration: sbMotion.duration.receipt } },
  exit: { opacity: 0, height: 0, transition: { duration: sbMotion.duration.fast } },
};
