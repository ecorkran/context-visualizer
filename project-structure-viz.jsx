import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ============================================================================
// THEME — edit to customize
// ============================================================================
const THEME = {
  colors: {
    foundation: { bg: "#2D5A4B", text: "#E8F5F0", border: "#3D7A65", accent: "#5BBFA0" },
    architecture: { bg: "#1B4965", text: "#E0F0FF", border: "#2B6990", accent: "#5BA4D9" },
    slicePlan: { bg: "#6B4C8A", text: "#F0E6FF", border: "#8B6CAA", accent: "#B794D6" },
    slice: { bg: "#7C5C9C", text: "#F0E6FF", border: "#9B7CBC", accent: "#C9A8E8" },
    tasks: { bg: "#2A7B6F", text: "#E0FFF8", border: "#3A9B8F", accent: "#5CCFB9" },
    feature: { bg: "#8B6914", text: "#FFF8E0", border: "#AB8934", accent: "#D4B45A" },
    review: { bg: "#8B3A3A", text: "#FFE8E8", border: "#AB5A5A", accent: "#D48A8A" },
    analysis: { bg: "#5A5A8B", text: "#E8E8FF", border: "#7A7AAB", accent: "#A0A0D4" },
    maintenance: { bg: "#5A7040", text: "#F0FFE8", border: "#7A9060", accent: "#A0C880" },
    devlog: { bg: "#CC7A00", text: "#FFF5E0", border: "#E69A20", accent: "#FFB84D" },
    projectLevel: { bg: "#1E3A5F", text: "#D0E8FF", border: "#2E5A8F", accent: "#6BAADF" },
  },
  fonts: {
    heading: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
    body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  radius: 12,
  sp: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  status: {
    complete: "#4CAF50",
    "in-progress": "#FF9800",
    "not-started": "#6880C0",
    deprecated: "#9E9E9E",
  },
};

// ============================================================================
// SVG PATTERN DEFS
// ============================================================================
const PatternDefs = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <pattern id="fh" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      </pattern>
      <pattern id="fhd" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      </pattern>
    </defs>
  </svg>
);

// ============================================================================
// TOOLTIP — viewport-aware positioning, won't clip edges
// ============================================================================
const Tooltip = ({ children, content }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, flipped: false });

  const onEnter = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const ty = r.top - 10;
    // Flip below if too close to top
    const flipped = ty < 50;
    setPos({ x: Math.max(120, Math.min(cx, window.innerWidth - 120)), y: flipped ? r.bottom + 10 : ty, flipped });
    setShow(true);
  }, []);

  if (!content) return children;
  return (
    <span onMouseEnter={onEnter} onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      {children}
      {show && (
        <div style={{
          position: "fixed", left: pos.x, top: pos.y,
          transform: pos.flipped ? "translate(-50%, 0)" : "translate(-50%, -100%)",
          backgroundColor: "#1A1A2E", border: "1px solid #3A3A5E", borderRadius: 8,
          padding: "6px 12px", zIndex: 1000, pointerEvents: "none", whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#CCCCDD" }}>{content}</div>
          {/* Arrow - top or bottom depending on flip */}
          <div style={{
            position: "absolute",
            [pos.flipped ? "top" : "bottom"]: -4,
            left: "50%",
            transform: `translateX(-50%) rotate(${pos.flipped ? "225" : "45"}deg)`,
            width: 8, height: 8, backgroundColor: "#1A1A2E",
            border: "1px solid #3A3A5E",
            borderTop: pos.flipped ? "1px solid #3A3A5E" : "none",
            borderLeft: pos.flipped ? "1px solid #3A3A5E" : "none",
            borderBottom: pos.flipped ? "none" : "1px solid #3A3A5E",
            borderRight: pos.flipped ? "none" : "1px solid #3A3A5E",
          }} />
        </div>
      )}
    </span>
  );
};

// ============================================================================
// DATA (loaded externally via projects/manifest.json)
// ============================================================================
const PROJECTS = window.__PROJECTS;

// ============================================================================
// UTILITIES
// ============================================================================
const fmtDate = (d) => d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null;
const dateTip = (item) => {
  if (!item?.dateCreated && !item?.dateUpdated) return null;
  const p = [];
  if (item.status === "complete") {
    if (item.dateCreated) p.push(`Started ${fmtDate(item.dateCreated)}`);
    if (item.dateUpdated) p.push(`Completed ${fmtDate(item.dateUpdated)}`);
  } else if (item.status === "in-progress") {
    if (item.dateCreated) p.push(`Started ${fmtDate(item.dateCreated)}`);
    if (item.dateUpdated) p.push(`Updated ${fmtDate(item.dateUpdated)}`);
  } else {
    if (item.dateCreated) p.push(`Created ${fmtDate(item.dateCreated)}`);
  }
  return p.join("  ·  ") || null;
};

// ============================================================================
// SMALL COMPONENTS
// ============================================================================

// Wider hover target — wraps both the dot AND the index number
const StatusZone = ({ status, item, index, colorSet }) => {
  const tip = dateTip(item);
  const inner = (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: THEME.sp.sm,
      padding: "2px 4px", borderRadius: 6, cursor: tip ? "default" : "inherit",
      transition: "background-color 0.15s ease",
    }}
      onMouseEnter={(e) => { if (tip) e.currentTarget.style.backgroundColor = "#ffffff08"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        backgroundColor: THEME.status[status] || THEME.status["not-started"], flexShrink: 0,
      }} />
      <span style={{
        fontFamily: THEME.fonts.heading, fontSize: 11,
        color: colorSet.accent, opacity: 0.8, minWidth: 28, flexShrink: 0,
      }}>{index}</span>
    </span>
  );
  return tip ? <Tooltip content={tip}>{inner}</Tooltip> : inner;
};

const Badge = ({ children, colorSet, dimmed }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: "2px 8px",
    borderRadius: THEME.radius / 2,
    backgroundColor: dimmed ? colorSet.accent + "18" : colorSet.accent + "30",
    color: dimmed ? colorSet.accent + "90" : colorSet.accent,
    fontSize: 10, fontFamily: THEME.fonts.heading, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0,
  }}>{children}</span>
);

const TaskPill = ({ taskCount, completedTasks, accentColor }) => {
  if (taskCount === undefined) return null;
  const done = completedTasks === taskCount;
  const color = accentColor || (done ? THEME.status.complete : "#8888AA");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px",
      borderRadius: 4, backgroundColor: done ? THEME.status.complete + "20" : "#ffffff10",
      fontFamily: THEME.fonts.heading, fontSize: 10,
      color, flexShrink: 0,
    }}>
      <span style={{ fontSize: 8 }}>✓</span>{completedTasks}/{taskCount}
    </span>
  );
};

// ============================================================================
// TASK ITEM LIST — expandable from task blocks
// ============================================================================
const TaskItemList = ({ items, colorSet }) => {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: THEME.sp.sm, paddingLeft: 4 }}>
      {items.map((t, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: THEME.sp.sm,
          padding: "3px 0", borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
        }}>
          <span style={{
            fontSize: 11, lineHeight: "18px", flexShrink: 0,
            color: t.done ? THEME.status.complete : "#555577",
          }}>{t.done ? "✓" : "○"}</span>
          <span style={{
            fontFamily: THEME.fonts.body, fontSize: 12, lineHeight: "18px",
            color: t.done ? colorSet.text + "90" : colorSet.text + "60",
            textDecoration: t.done ? "none" : "none",
          }}>{t.name}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// FUTURE WORK BLOCK — solid dimmed border + hash pattern
// ============================================================================
const FutureBlock = ({ item, colorSet, label = "FUTURE" }) => (
  <div style={{
    position: "relative", borderRadius: THEME.radius,
    border: `1px solid ${colorSet.border}40`,
    padding: THEME.sp.md, marginBottom: THEME.sp.sm, overflow: "hidden",
  }}>
    <div style={{ position: "absolute", inset: 0, backgroundColor: colorSet.bg + "40", borderRadius: THEME.radius }} />
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: THEME.radius }}>
      <rect width="100%" height="100%" fill="url(#fh)" />
    </svg>
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: THEME.sp.sm }}>
      <span style={{
        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
        backgroundColor: THEME.status["not-started"], flexShrink: 0,
      }} />
      <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: colorSet.accent, opacity: 0.5, minWidth: 28 }}>{item.index}</span>
      <Badge colorSet={colorSet} dimmed>{label}</Badge>
      <span style={{ fontFamily: THEME.fonts.body, fontSize: 13, color: colorSet.text, opacity: 0.6, fontWeight: 500 }}>{item.name}</span>
    </div>
  </div>
);

// ============================================================================
// FUTURE SLICES GROUP — collapsible collection of future slices
// ============================================================================
const FutureSlicesGroup = ({ items }) => {
  const [expanded, setExpanded] = useState(false);
  const colorSet = THEME.colors.slice;
  return (
    <div style={{ marginTop: THEME.sp.sm }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          position: "relative", borderRadius: THEME.radius,
          border: `1px solid ${colorSet.border}40`,
          padding: `${THEME.sp.sm}px ${THEME.sp.md}px`, overflow: "hidden",
          cursor: "pointer", transition: "all 0.15s ease",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backgroundColor: colorSet.bg + "30", borderRadius: THEME.radius }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: THEME.radius }}>
          <rect width="100%" height="100%" fill="url(#fh)" />
        </svg>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: THEME.sp.sm }}>
          <span style={{
            color: colorSet.accent, fontSize: 12, fontFamily: THEME.fonts.heading,
            width: 16, flexShrink: 0, transition: "transform 0.15s ease",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", opacity: 0.5,
          }}>▶</span>
          <span style={{
            fontFamily: THEME.fonts.heading, fontSize: 10, color: "#555577",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>Features</span>
          <span style={{
            fontFamily: THEME.fonts.heading, fontSize: 10, color: colorSet.accent, opacity: 0.4,
          }}>{items.length}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: THEME.sp.sm, paddingLeft: THEME.sp.md }}>
          {[...items].sort((a, b) => parseInt(a.index) - parseInt(b.index)).map((fs, i) => <FutureBlock key={i} item={fs} colorSet={colorSet} label="FEATURE" />)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DOC BLOCK — core reusable block
// showTaskPill: only true at task-level or lower
// ============================================================================
const DocBlock = ({
  colorSet, label, name, index, status, children, expandable,
  defaultExpanded = false, count, countLabel, item,
  taskCount, completedTasks, showTaskPill = false, futureWork,
  taskItems,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasKids = expandable && (children || (taskItems && taskItems.length > 0));
  const hasFuture = futureWork?.length > 0;

  return (
    <div style={{
      backgroundColor: colorSet.bg, border: `1px solid ${colorSet.border}`,
      borderRadius: THEME.radius, padding: THEME.sp.md,
      marginBottom: THEME.sp.sm, transition: "all 0.15s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.sm,
        cursor: hasKids ? "pointer" : "default" }}
        onClick={hasKids ? (e) => { e.stopPropagation(); setExpanded(!expanded); } : undefined}
      >
        {hasKids && (
          <span style={{
            color: colorSet.accent, fontSize: 12, fontFamily: THEME.fonts.heading,
            width: 16, flexShrink: 0, transition: "transform 0.15s ease",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
          }}>▶</span>
        )}
        <StatusZone status={status} item={item} index={index} colorSet={colorSet} />
        <Badge colorSet={colorSet}>{label}</Badge>
        <span style={{
          fontFamily: THEME.fonts.body, fontSize: 13, color: colorSet.text, fontWeight: 500,
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{name}</span>
        {showTaskPill && <TaskPill taskCount={taskCount} completedTasks={completedTasks} accentColor={colorSet.accent} />}
        {count !== undefined && (
          <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: colorSet.accent, opacity: 0.7, flexShrink: 0 }}>
            {count} {countLabel || (count === 1 ? "slice" : "slices")}
          </span>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: THEME.sp.md, paddingLeft: hasKids ? THEME.sp.md : 0 }}>
          {children}
          {taskItems && taskItems.length > 0 && <TaskItemList items={taskItems} colorSet={colorSet} />}
          {hasFuture && (
            <>
              <div style={{
                fontFamily: THEME.fonts.heading, fontSize: 10, color: "#6666AA",
                textTransform: "uppercase", letterSpacing: "0.1em",
                margin: `${THEME.sp.md}px 0 ${THEME.sp.sm}px 0`,
                paddingTop: THEME.sp.sm, borderTop: "1px solid #2A2A4E",
              }}>Future Work</div>
              {futureWork.map((fw, i) => <FutureBlock key={i} item={fw} colorSet={colorSet} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// INITIATIVE CARD
// ============================================================================
const InitiativeCard = ({ band, initiative, futureSlices }) => {
  const [expanded, setExpanded] = useState(false);
  const done = initiative.slices.filter((s) => s.status === "complete").length;
  const total = initiative.slices.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const tTotal = initiative.slices.reduce((s, sl) => s + (sl.tasks?.taskCount || 0), 0);
  const tDone = initiative.slices.reduce((s, sl) => s + (sl.tasks?.completedTasks || 0), 0);
  const related = futureSlices?.filter((f) => f.parent === String(band)) || [];

  return (
    <div style={{
      backgroundColor: "#1A1A2E", border: "1px solid #2A2A4E",
      borderRadius: THEME.radius + 4, padding: THEME.sp.lg, marginBottom: THEME.sp.lg,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.md, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{
          fontFamily: THEME.fonts.heading, fontSize: 22, color: "#FFD700",
          fontWeight: 700, opacity: 0.3, minWidth: 48,
        }}>{band}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: THEME.fonts.heading, fontSize: 16, color: "#E8E8FF", fontWeight: 600, marginBottom: 4 }}>
            {initiative.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.md, flexWrap: "wrap" }}>
            {total > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.sm }}>
                <div style={{ width: 120, height: 4, backgroundColor: "#2A2A4E", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 2,
                    backgroundColor: pct === 100 ? THEME.status.complete : THEME.status["in-progress"],
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#8888AA" }}>{done}/{total}</span>
              </div>
            )}
            {tTotal > 0 && (
              <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#6666AA" }}>{tDone}/{tTotal} tasks</span>
            )}
            {related.length > 0 && (
              <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#555577", fontStyle: "italic" }}>+{related.length} future</span>
            )}
          </div>
        </div>
        <span style={{
          color: "#8888AA", fontSize: 14, transition: "transform 0.15s ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
        }}>▶</span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: THEME.sp.sm, marginTop: THEME.sp.md }}>
          {initiative.arch && (
            <DocBlock colorSet={THEME.colors.architecture} label="ARCH"
              name={initiative.arch.name} index={initiative.arch.index}
              status={initiative.arch.status} item={initiative.arch} />
          )}
          {initiative.slicePlan && (
            <DocBlock colorSet={THEME.colors.slicePlan} label="PLAN"
              name={initiative.slicePlan.name} index={initiative.slicePlan.index}
              status={initiative.slicePlan.status} item={initiative.slicePlan}
              expandable={initiative.slices.length > 0 || (initiative.slicePlan.futureWork || []).length > 0}
              count={initiative.slices.length} futureWork={initiative.slicePlan.futureWork}>
              {initiative.slices.map((sl, i) => (
                <DocBlock key={i} colorSet={THEME.colors.slice} label="SLICE"
                  name={sl.name} index={sl.index} status={sl.status} item={sl}
                  expandable={!!sl.tasks || sl.features?.length > 0}>
                  {sl.tasks && (
                    <DocBlock colorSet={THEME.colors.tasks} label="TASKS"
                      name={sl.tasks.name} index={sl.tasks.index}
                      status={sl.tasks.status} item={sl.tasks}
                      showTaskPill taskCount={sl.tasks.taskCount} completedTasks={sl.tasks.completedTasks}
                      expandable={sl.tasks.items?.length > 0}
                      taskItems={sl.tasks.items} />
                  )}
                  {sl.features?.map((f, j) => (
                    <DocBlock key={j} colorSet={THEME.colors.feature} label="FEAT"
                      name={f.name} index={f.index} status={f.status} item={f} />
                  ))}
                </DocBlock>
              ))}
            </DocBlock>
          )}

          {related.length > 0 && <FutureSlicesGroup items={related} />}

          {!initiative.slicePlan && initiative.slices.length === 0 && (
            <div style={{
              padding: THEME.sp.md, color: "#8888AA", fontFamily: THEME.fonts.body,
              fontSize: 12, fontStyle: "italic", borderLeft: "2px solid #2A2A4E", marginLeft: THEME.sp.md,
            }}>Slice planning not yet started</div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FEATURES CARD — standalone features/issues displayed as initiative-like band
// ============================================================================
const FeaturesCard = ({ features }) => {
  const [expanded, setExpanded] = useState(false);
  const tTotal = features.reduce((s, f) => s + (f.tasks?.taskCount || 0), 0);
  const tDone = features.reduce((s, f) => s + (f.tasks?.completedTasks || 0), 0);
  const colorSet = THEME.colors.feature;

  return (
    <div style={{
      backgroundColor: "#1A1A2E", border: "1px solid #2A2A4E",
      borderRadius: THEME.radius + 4, padding: THEME.sp.lg, marginBottom: THEME.sp.lg,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.md, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{
          fontFamily: THEME.fonts.heading, fontSize: 18, color: colorSet.accent,
          fontWeight: 700, opacity: 0.4,
        }}>★</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: THEME.fonts.heading, fontSize: 16, color: "#E8E8FF", fontWeight: 600, marginBottom: 4 }}>
            Features & Issues
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.md, flexWrap: "wrap" }}>
            <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#8888AA" }}>
              {features.length} {features.length === 1 ? "item" : "items"}
            </span>
            {tTotal > 0 && (
              <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#6666AA" }}>
                {tDone}/{tTotal} tasks
              </span>
            )}
          </div>
        </div>
        <span style={{
          color: "#8888AA", fontSize: 14, transition: "transform 0.15s ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
        }}>▶</span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: THEME.sp.sm, marginTop: THEME.sp.md }}>
          {[...features].sort((a, b) => parseInt(a.index) - parseInt(b.index)).map((f, i) => (
            <DocBlock key={i} colorSet={colorSet}
              label={f.docType === "issue" ? "ISSUE" : "FEAT"}
              name={f.name} index={f.index} status={f.status} item={f}
              expandable={!!f.tasks}
              showTaskPill={!!f.tasks}
              taskCount={f.tasks?.taskCount} completedTasks={f.tasks?.completedTasks}>
              {f.tasks && (
                <DocBlock colorSet={THEME.colors.tasks} label="TASKS"
                  name={f.tasks.name} index={f.tasks.index}
                  status={f.tasks.status} item={f.tasks}
                  showTaskPill taskCount={f.tasks.taskCount} completedTasks={f.tasks.completedTasks}
                  expandable={f.tasks.items?.length > 0}
                  taskItems={f.tasks.items} />
              )}
            </DocBlock>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PROJECT VIEW
// ============================================================================
const ProjectView = ({ data }) => {
  const bands = Object.entries(data.initiatives).sort(([a], [b]) => Number(a) - Number(b));
  const stats = useMemo(() => {
    let ts = 0, cs = 0, tt = 0, ct = 0;
    bands.forEach(([, init]) => {
      ts += init.slices.length;
      cs += init.slices.filter((s) => s.status === "complete").length;
      init.slices.forEach((s) => { tt += s.tasks?.taskCount || 0; ct += s.tasks?.completedTasks || 0; });
    });
    return { ts, cs, tt, ct, ni: bands.length };
  }, [bands]);

  return (
    <div>
      <div style={{ marginBottom: THEME.sp.xl }}>
        <h2 style={{ fontFamily: THEME.fonts.heading, fontSize: 20, color: "#E8E8FF", fontWeight: 700, margin: "0 0 4px 0" }}>
          {data.name}
        </h2>
        <p style={{ fontFamily: THEME.fonts.body, fontSize: 13, color: "#8888AA", margin: "0 0 12px 0" }}>{data.description}</p>
        <div style={{ display: "flex", gap: THEME.sp.lg, flexWrap: "wrap" }}>
          {[
            { l: "Initiatives", v: stats.ni },
            { l: "Slices", v: `${stats.cs}/${stats.ts}` },
            { l: "Tasks", v: `${stats.ct}/${stats.tt}` },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: THEME.sp.xs }}>
              <span style={{ fontFamily: THEME.fonts.heading, fontSize: 20, color: "#FFD700", fontWeight: 700 }}>{s.v}</span>
              <span style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#6666AA", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {(data.projectArchitecture.length > 0 || data.foundation.length > 0) && (
        <div style={{
          marginBottom: THEME.sp.xl, padding: THEME.sp.lg,
          backgroundColor: "#12121F", borderRadius: THEME.radius + 4, border: "1px solid #1E1E3A",
        }}>
          <div style={{
            fontFamily: THEME.fonts.heading, fontSize: 11, color: "#6666AA",
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: THEME.sp.md,
          }}>Project-Level Documents</div>
          {data.foundation.map((d, i) => (
            <DocBlock key={`f${i}`} colorSet={THEME.colors.foundation}
              label={d.type?.toUpperCase() || "FOUND"} name={d.name}
              index={d.index} status={d.status} item={d} />
          ))}
          {data.projectArchitecture.map((d, i) => (
            <DocBlock key={`a${i}`} colorSet={THEME.colors.projectLevel}
              label={d.type?.toUpperCase() || "ARCH"} name={d.name}
              index={d.index} status={d.status} item={d} />
          ))}
        </div>
      )}

      {bands.map(([band, init]) => (
        <InitiativeCard key={band} band={band} initiative={init} futureSlices={data.futureSlices} />
      ))}

      {/* Standalone features/issues — displayed as their own band */}
      {(data.standaloneFeatures || []).length > 0 && (
        <FeaturesCard features={data.standaloneFeatures} />
      )}

      {(data.quality.length > 0 || data.investigation.length > 0 || data.maintenance.length > 0) && (
        <div style={{ borderTop: "1px solid #2A2A4E", paddingTop: THEME.sp.lg, marginTop: THEME.sp.lg }}>
          <h3 style={{
            fontFamily: THEME.fonts.heading, fontSize: 12, color: "#6666AA",
            textTransform: "uppercase", letterSpacing: "0.1em", margin: `0 0 ${THEME.sp.md}px 0`,
          }}>Operational</h3>
          {data.quality.map((d, i) => <DocBlock key={`q${i}`} colorSet={THEME.colors.review} label="REVIEW" name={d.name} index={d.index} status={d.status} item={d} />)}
          {data.investigation.map((d, i) => <DocBlock key={`an${i}`} colorSet={THEME.colors.analysis} label="ANALYSIS" name={d.name} index={d.index} status={d.status} item={d} />)}
          {data.maintenance.map((d, i) => <DocBlock key={`m${i}`} colorSet={THEME.colors.maintenance} label="MAINT" name={d.name} index={d.index} status={d.status} item={d} />)}
        </div>
      )}

      {data.devlog && (
        <div style={{ marginTop: THEME.sp.md }}>
          <DocBlock colorSet={THEME.colors.devlog} label="DEVLOG" name="DEVLOG.md" index="—" status="in-progress" />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LEGEND
// ============================================================================
const Legend = () => (
  <div style={{
    display: "flex", gap: THEME.sp.xl, padding: THEME.sp.md,
    backgroundColor: "#12121F", borderRadius: THEME.radius, marginBottom: THEME.sp.xl, flexWrap: "wrap",
  }}>
    <div style={{ display: "flex", gap: THEME.sp.md, flexWrap: "wrap", flex: 1 }}>
      {[
        ["Architecture", THEME.colors.architecture],
        ["Slice Plan", THEME.colors.slicePlan],
        ["Slice", THEME.colors.slice],
        ["Tasks", THEME.colors.tasks],
        ["Feature", THEME.colors.feature],
        ["DevLog", THEME.colors.devlog],
      ].map(([l, cs]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: THEME.sp.xs }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: cs.bg, border: `1px solid ${cs.border}` }} />
          <span style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#8888AA" }}>{l}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.xs }}>
        <div style={{ position: "relative", width: 14, height: 14, borderRadius: 4, overflow: "hidden", border: "1px solid #9B7CBC40" }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "#7C5C9C40" }} />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <rect width="100%" height="100%" fill="url(#fhd)" />
          </svg>
        </div>
        <span style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#8888AA" }}>Future</span>
      </div>
    </div>
    <div style={{ display: "flex", gap: THEME.sp.md, borderLeft: "1px solid #2A2A4E", paddingLeft: THEME.sp.lg }}>
      {[
        ["Complete", THEME.status.complete],
        ["In Progress", THEME.status["in-progress"]],
        ["Not Started", THEME.status["not-started"]],
      ].map(([l, c]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: THEME.sp.xs }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: c }} />
          <span style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#8888AA" }}>{l}</span>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// PROJECT PANEL
// ============================================================================
const PANEL_COLORS = ["#5BA4D9", "#5CCFB9", "#D4B45A", "#C9A8E8", "#D48A8A", "#A0C880", "#A0A0D4", "#FFB84D"];

function ProjectPanel({ projects, active, onActivate, onRefreshAll, refreshState }) {
  return (
    <div style={{
      width: 240, flexShrink: 0, backgroundColor: "#111128",
      minHeight: "100vh", display: "flex", flexDirection: "column",
    }}>
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================
export default function ProjectStructureVisualizer() {
  const [projects, setProjects] = useState(PROJECTS);
  const keys = Object.keys(projects);
  const [active, setActive] = useState(keys[0]);
  // 'idle' | 'refreshing' | 'error'
  const [refreshState, setRefreshState] = useState('idle');

  const handleRefresh = useCallback(async () => {
    setRefreshState('refreshing');
    try {
      const resp = await fetch('/api/refresh', { method: 'POST' });
      const body = await resp.json();
      if (!resp.ok || body.status !== 'ok') {
        throw new Error(body.message || `HTTP ${resp.status}`);
      }
      // Re-fetch all project data without a page reload
      const fresh = await window.__loadProjects();
      setProjects(fresh);
      // Preserve active tab if it still exists, else fall back to first
      setActive((prev) => (fresh[prev] ? prev : Object.keys(fresh)[0]));
      setRefreshState('idle');
    } catch (err) {
      console.error('Refresh failed:', err);
      setRefreshState('error');
      setTimeout(() => setRefreshState('idle'), 3000);
    }
  }, []);

  return (
    <div style={{ backgroundColor: "#0D0D1A", minHeight: "100vh", fontFamily: THEME.fonts.body, display: "flex" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <PatternDefs />
      <ProjectPanel
        projects={projects}
        active={active}
        onActivate={setActive}
        onRefreshAll={handleRefresh}
        refreshState={refreshState}
      />
      <div style={{ flex: 1, overflow: "auto", padding: THEME.sp.xl }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: THEME.sp.xl, flexWrap: "wrap", gap: THEME.sp.md,
        }}>
          <div>
            <h1 style={{ fontFamily: THEME.fonts.heading, fontSize: 24, color: "#E8E8FF", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#FFD700", opacity: 0.6 }}>⬡</span> Project Structure
            </h1>
            <p style={{ fontFamily: THEME.fonts.body, fontSize: 12, color: "#6666AA", margin: "4px 0 0 0" }}>
              ai-project-guide methodology visualizer
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.xs }}>
            {keys.map((k) => (
              <button key={k} onClick={() => setActive(k)} style={{
                fontFamily: THEME.fonts.heading, fontSize: 12,
                padding: `${THEME.sp.sm}px ${THEME.sp.lg}px`,
                borderRadius: THEME.radius, border: "1px solid",
                borderColor: active === k ? "#FFD700" : "#2A2A4E",
                backgroundColor: active === k ? "#FFD70015" : "transparent",
                color: active === k ? "#FFD700" : "#6666AA",
                cursor: "pointer", transition: "all 0.15s ease",
              }}>
                {projects[k].name}
              </button>
            ))}
            {/* Refresh button — positioned immediately right of project tabs */}
            <button
              onClick={handleRefresh}
              disabled={refreshState === 'refreshing'}
              title={refreshState === 'error' ? 'Refresh failed' : 'Refresh project data'}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: THEME.radius,
                border: `1px solid ${refreshState === 'error' ? '#FF6B6B' : '#2A2A4E'}`,
                backgroundColor: refreshState === 'error' ? '#FF6B6B18' : 'transparent',
                color: refreshState === 'error' ? '#FF6B6B' : '#6666AA',
                cursor: refreshState === 'refreshing' ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                pointerEvents: refreshState === 'refreshing' ? 'none' : 'auto',
                fontSize: 16,
              }}
            >
              <span style={{
                display: 'inline-block',
                animation: refreshState === 'refreshing' ? 'spin 0.8s linear infinite' : 'none',
              }}>&#x21bb;</span>
            </button>
          </div>
        </div>
        <Legend />
        <ProjectView data={projects[active]} />
      </div>
    </div>
  );
}
