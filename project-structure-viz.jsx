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
    collector: { bg: "#0A3A5A", text: "#E0F4FF", border: "#0870A8", accent: "#08A8F6" },
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
        <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.sm, minWidth: 60 }}>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            backgroundColor: THEME.status[initiative.arch?.status] || THEME.status["not-started"],
          }} />
          <span style={{
            fontFamily: THEME.fonts.heading, fontSize: 22, color: "#FFD700",
            fontWeight: 700, opacity: 0.3,
          }}>{band}</span>
        </div>
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
// MAINTENANCE COLLECTOR CARD — groups 9xx operational docs into a collapsible card
// ============================================================================

// ============================================================================
// ProjectDocsCard — collapsible card for project-level documents
// ============================================================================
const ProjectDocsCard = ({ foundation, architecture }) => {
  const [expanded, setExpanded] = useState(false);
  const total = foundation.length + architecture.length;

  return (
    <div style={{
      backgroundColor: "#1A1A2E", border: "1px solid #2A2A4E",
      borderRadius: THEME.radius + 4, padding: THEME.sp.lg, marginBottom: THEME.sp.lg,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.md, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{
          fontFamily: THEME.fonts.heading, fontSize: 18, color: "#6666AA",
          fontWeight: 700, opacity: 0.4,
        }}>&#x25A8;</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: THEME.fonts.heading, fontSize: 16, color: "#E8E8FF", fontWeight: 600, marginBottom: 4 }}>
            Project-Level Documents
          </div>
          <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#8888AA" }}>
            {total} {total === 1 ? "document" : "documents"}
          </span>
        </div>
        <span style={{
          color: "#8888AA", fontSize: 14, transition: "transform 0.15s ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
        }}>&#x25B6;</span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: THEME.sp.sm, marginTop: THEME.sp.md }}>
          {foundation.map((d, i) => (
            <DocBlock key={`f${i}`} colorSet={THEME.colors.foundation}
              label={d.type?.toUpperCase() || "FOUND"} name={d.name}
              index={d.index} status={d.status} item={d} />
          ))}
          {architecture.map((d, i) => (
            <DocBlock key={`a${i}`} colorSet={THEME.colors.projectLevel}
              label={d.type?.toUpperCase() || "ARCH"} name={d.name}
              index={d.index} status={d.status} item={d} />
          ))}
        </div>
      )}
    </div>
  );
};

const MaintenanceCollectorCard = ({ quality, investigation, maintenance }) => {
  const [expanded, setExpanded] = useState(false);
  const total = quality.length + investigation.length + maintenance.length;
  if (total === 0) return null;
  const colorSet = THEME.colors.collector;

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
        }}>⚙</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: THEME.fonts.heading, fontSize: 16, color: "#E8E8FF", fontWeight: 600, marginBottom: 4 }}>
            Maintenance &amp; Operations
          </div>
          <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#8888AA" }}>
            {total} {total === 1 ? "item" : "items"}
          </span>
        </div>
        <span style={{
          color: "#8888AA", fontSize: 14, transition: "transform 0.15s ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
        }}>▶</span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: THEME.sp.sm, marginTop: THEME.sp.md }}>
          {quality.map((d, i) => (
            <DocBlock key={`q${i}`} colorSet={THEME.colors.review} label="REVIEW"
              name={d.name} index={d.index} status={d.status} item={d} />
          ))}
          {investigation.map((d, i) => (
            <DocBlock key={`an${i}`} colorSet={THEME.colors.analysis} label="ANALYSIS"
              name={d.name} index={d.index} status={d.status} item={d} />
          ))}
          {maintenance.map((d, i) => (
            <DocBlock key={`m${i}`} colorSet={THEME.colors.maintenance} label="MAINT"
              name={d.name} index={d.index} status={d.status} item={d} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FUTURE WORK COLLECTOR CARD — aggregated future work from MCP (config-gated)
// ============================================================================
const FutureWorkCollectorCard = ({ futureWork }) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  if (!futureWork || !futureWork.groups || futureWork.groups.length === 0) return null;

  const colorSet = THEME.colors.collector;
  const toggleGroup = (idx) => setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }));

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
        }}>◈</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: THEME.fonts.heading, fontSize: 16, color: "#E8E8FF", fontWeight: 600, marginBottom: 4 }}>
            Future Work
          </div>
          <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#8888AA" }}>
            {futureWork.completedItems}/{futureWork.totalItems} complete
          </span>
        </div>
        <span style={{
          color: "#8888AA", fontSize: 14, transition: "transform 0.15s ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
        }}>▶</span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: THEME.sp.sm, marginTop: THEME.sp.md }}>
          {futureWork.groups.map((group, gi) => (
            <div key={gi} style={{
              borderRadius: THEME.radius, border: `1px solid ${colorSet.border}60`,
              marginBottom: THEME.sp.sm, overflow: "hidden",
            }}>
              <div
                onClick={() => toggleGroup(gi)}
                style={{
                  display: "flex", alignItems: "center", gap: THEME.sp.sm,
                  padding: `${THEME.sp.sm}px ${THEME.sp.md}px`, cursor: "pointer",
                  backgroundColor: colorSet.bg + "60",
                }}>
                <span style={{
                  color: colorSet.accent, fontSize: 12, fontFamily: THEME.fonts.heading,
                  width: 16, flexShrink: 0, transition: "transform 0.15s ease",
                  transform: expandedGroups[gi] ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", opacity: 0.5,
                }}>▶</span>
                <span style={{
                  fontFamily: THEME.fonts.body, fontSize: 13, color: colorSet.text, fontWeight: 500,
                  flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{group.initiativeName}</span>
                <span style={{
                  fontFamily: THEME.fonts.heading, fontSize: 11, color: "#8888AA", flexShrink: 0,
                }}>{group.completedItems}/{group.totalItems}</span>
              </div>
              {expandedGroups[gi] && (
                <div style={{ padding: `${THEME.sp.xs}px ${THEME.sp.md}px ${THEME.sp.sm}px` }}>
                  {group.items.map((item, ii) => (
                    <div key={ii} style={{
                      display: "flex", alignItems: "flex-start", gap: THEME.sp.sm,
                      padding: "3px 0",
                      borderBottom: ii < group.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}>
                      <span style={{
                        fontSize: 11, lineHeight: "18px", flexShrink: 0,
                        color: item.done ? THEME.status.complete : "#555577",
                      }}>{item.done ? "✓" : "○"}</span>
                      <span style={{
                        fontFamily: THEME.fonts.heading, fontSize: 11, color: colorSet.accent,
                        opacity: 0.5, minWidth: 28, flexShrink: 0, lineHeight: "18px",
                      }}>{item.index}</span>
                      <span style={{
                        fontFamily: THEME.fonts.body, fontSize: 12, lineHeight: "18px",
                        color: item.done ? (colorSet.text + "60") : (colorSet.text + "B0"),
                        textDecoration: item.done ? "line-through" : "none",
                      }}>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
        <ProjectDocsCard foundation={data.foundation} architecture={data.projectArchitecture} />
      )}

      {bands.map(([band, init]) => (
        <InitiativeCard key={band} band={band} initiative={init} futureSlices={data.futureSlices} />
      ))}

      {/* Standalone features/issues — displayed as their own band */}
      {(data.standaloneFeatures || []).length > 0 && (
        <FeaturesCard features={data.standaloneFeatures} />
      )}

      <MaintenanceCollectorCard quality={data.quality} investigation={data.investigation} maintenance={data.maintenance} />
      <FutureWorkCollectorCard futureWork={data.futureWork} />

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
        ["Collector", THEME.colors.collector],
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

function ProjectPanel({ projects, active, onActivate, onRefreshAll, refreshState, onProjectsChanged, expanded, onToggle }) {
  const isMcp = window.__projectsMode === 'mcp';
  const projectList = Object.keys(projects).map((k, i) => ({
    key: k,
    name: projects[k].name || k,
    color: PANEL_COLORS[i % PANEL_COLORS.length],
  }));

  // Add-project state
  const [addPath, setAddPath] = useState('');
  const [addState, setAddState] = useState('idle'); // 'idle' | 'adding' | 'error'
  const [addError, setAddError] = useState('');

  // Per-row refresh state: { [key]: 'idle' | 'refreshing' }
  const [rowRefreshState, setRowRefreshState] = useState({});

  // Discover section state
  const [showDiscover, setShowDiscover] = useState(false);
  const [scanRoot, setScanRoot] = useState('');
  const [scanState, setScanState] = useState('idle'); // 'idle'|'scanning'|'done'|'error'
  const [scanResults, setScanResults] = useState([]);
  const [scanError, setScanError] = useState('');
  const [rowAddState, setRowAddState] = useState({}); // { [path]: 'idle'|'adding' }

  const handleAdd = async () => {
    if (!addPath.trim()) return;
    setAddState('adding');
    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: addPath.trim() }),
      });
      const body = await resp.json();
      if (!resp.ok || body.status !== 'ok') {
        throw new Error(body.message || `HTTP ${resp.status}`);
      }
      await onProjectsChanged();
      onActivate(body.project.key);
      setAddPath('');
      setAddState('idle');
    } catch (err) {
      console.error('Add project failed:', err);
      setAddError(err.message);
      setAddState('error');
      setTimeout(() => { setAddState('idle'); setAddError(''); }, 3000);
    }
  };

  const handleRemove = async (key) => {
    try {
      const resp = await fetch(`/api/projects/${encodeURIComponent(key)}`, { method: 'DELETE' });
      const body = await resp.json();
      if (!resp.ok || body.status !== 'ok') {
        throw new Error(body.message || `HTTP ${resp.status}`);
      }
      const fresh = await onProjectsChanged();
      if (active === key) {
        const remaining = Object.keys(fresh);
        onActivate(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Remove project failed:', err);
    }
  };

  const handleRowRefresh = async (key) => {
    setRowRefreshState((s) => ({ ...s, [key]: 'refreshing' }));
    try {
      const resp = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: [key] }),
      });
      const body = await resp.json();
      if (!resp.ok || body.status !== 'ok') {
        throw new Error(body.message || `HTTP ${resp.status}`);
      }
      await onProjectsChanged();
    } catch (err) {
      console.error('Row refresh failed:', err);
    } finally {
      setRowRefreshState((s) => ({ ...s, [key]: 'idle' }));
    }
  };

  const handleToggleDiscover = async () => {
    const opening = !showDiscover;
    setShowDiscover(opening);
    if (opening && scanRoot === '') {
      try {
        const resp = await fetch('/api/info');
        const body = await resp.json();
        if (resp.ok && body.status === 'ok') setScanRoot(body.scanRoot);
      } catch (err) {
        console.error('Failed to fetch scan root:', err);
      }
    }
  };

  const handleFind = async () => {
    if (!scanRoot.trim()) return;
    setScanState('scanning');
    setScanResults([]);
    setScanError('');
    try {
      const resp = await fetch(`/api/discover?root=${encodeURIComponent(scanRoot.trim())}`);
      const body = await resp.json();
      if (!resp.ok || body.status !== 'ok') throw new Error(body.message || `HTTP ${resp.status}`);
      setScanResults(body.candidates);
      setScanState('done');
    } catch (err) {
      setScanError(err.message);
      setScanState('error');
      setTimeout(() => { setScanState('idle'); setScanError(''); }, 3000);
    }
  };

  const handleRowAdd = async (path) => {
    setRowAddState((s) => ({ ...s, [path]: 'adding' }));
    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const body = await resp.json();
      if (!resp.ok || body.status !== 'ok') throw new Error(body.message || `HTTP ${resp.status}`);
      await onProjectsChanged();
      onActivate(body.project.key);
    } catch (err) {
      console.error('Row add failed:', err);
    } finally {
      setRowAddState((s) => ({ ...s, [path]: 'idle' }));
    }
  };

  const panelWidth = expanded ? 240 : 36;

  // Collapsed strip
  if (!expanded) {
    return (
      <div
        style={{
          width: panelWidth, flexShrink: 0, backgroundColor: "#111128",
          display: "flex", flexDirection: "column", alignItems: "center",
          borderRight: "1px solid #1E1E3A", transition: "width 0.2s ease",
          overflow: "hidden", paddingTop: THEME.sp.sm,
        }}
      >
        {/* Expand chevron */}
        <button
          onClick={onToggle}
          title="Expand panel"
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: 6, border: "1px solid #2A2A4E",
            backgroundColor: "transparent", color: "#6666AA",
            cursor: "pointer", fontSize: 14, padding: 0, marginBottom: THEME.sp.sm,
            transition: "color 0.15s ease", flexShrink: 0,
          }}
        >›</button>
        {/* Color dots — click to activate */}
        {projectList.map(({ key, color }) => (
          <div
            key={key}
            onClick={() => onActivate(key)}
            title={projects[key].name || key}
            style={{
              width: 10, height: 10, borderRadius: "50%",
              backgroundColor: color, cursor: "pointer",
              marginBottom: THEME.sp.sm, flexShrink: 0,
              border: `2px solid ${active === key ? "#FFD700" : "transparent"}`,
              transition: "border-color 0.15s ease",
            }}
          />
        ))}
      </div>
    );
  }

  // Expanded panel
  return (
    <div style={{
      width: panelWidth, flexShrink: 0, backgroundColor: "#111128",
      display: "flex", flexDirection: "column", borderRight: "1px solid #1E1E3A",
      transition: "width 0.2s ease", overflow: "hidden",
    }}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: `${THEME.sp.md}px ${THEME.sp.md}px`,
        borderBottom: "1px solid #1E1E3A", flexShrink: 0,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: THEME.fonts.heading, fontSize: 11, color: "#8888AA", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Projects
          </span>
          {window.__projectsMode === 'mcp' && (
            <span title="Data sourced from MCP server" style={{
              fontFamily: THEME.fonts.mono, fontSize: 9, fontWeight: 700,
              color: "#7B68EE", background: "#7B68EE18",
              border: "1px solid #7B68EE44",
              borderRadius: 3, padding: "1px 4px", letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>
              MCP
            </span>
          )}
        </span>
        <div style={{ display: "flex", gap: THEME.sp.xs, alignItems: "center" }}>
          <button
            onClick={onRefreshAll}
            disabled={refreshState === 'refreshing'}
            title={refreshState === 'error' ? 'Refresh failed' : 'Refresh all projects'}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6,
              border: `1px solid ${refreshState === 'error' ? '#FF6B6B' : '#2A2A4E'}`,
              backgroundColor: refreshState === 'error' ? '#FF6B6B18' : 'transparent',
              color: refreshState === 'error' ? '#FF6B6B' : '#6666AA',
              cursor: refreshState === 'refreshing' ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
              pointerEvents: refreshState === 'refreshing' ? 'none' : 'auto',
              fontSize: 14, padding: 0,
            }}
          >
            <span style={{ display: 'inline-block', animation: refreshState === 'refreshing' ? 'spin 0.8s linear infinite' : 'none' }}>
              &#x21bb;
            </span>
          </button>
          {/* Collapse chevron */}
          <button
            onClick={onToggle}
            title="Collapse panel"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6, border: "1px solid #2A2A4E",
              backgroundColor: "transparent", color: "#6666AA",
              cursor: "pointer", fontSize: 14, padding: 0,
              transition: "color 0.15s ease",
            }}
          >‹</button>
        </div>
      </div>

      {/* Project list */}
      <div className="panel-list" style={{ flex: 1, overflowY: "auto", padding: `${THEME.sp.sm}px 0` }}>
        {projectList.map(({ key, name, color }) => (
          <div
            key={key}
            className="panel-row"
            onClick={() => onActivate(key)}
            style={{
              display: "flex", alignItems: "center", gap: THEME.sp.sm,
              padding: `${THEME.sp.sm}px ${THEME.sp.sm}px ${THEME.sp.sm}px ${THEME.sp.md}px`,
              cursor: "pointer", transition: "background-color 0.15s ease",
              borderLeft: `3px solid ${active === key ? "#FFD700" : "transparent"}`,
              backgroundColor: active === key ? "#FFD70008" : "transparent",
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: color, flexShrink: 0, display: "inline-block",
            }} />
            <span style={{
              fontFamily: THEME.fonts.body, fontSize: 13, color: active === key ? "#E8E8FF" : "#8888AA",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
            }}>{name}</span>
            {/* Per-row refresh */}
            <button
              onClick={(e) => { e.stopPropagation(); handleRowRefresh(key); }}
              title="Refresh this project"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: 4, border: "1px solid transparent",
                backgroundColor: "transparent", color: "#555577",
                cursor: "pointer", flexShrink: 0, fontSize: 12, padding: 0,
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#8888AA"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#555577"; }}
            >
              <span style={{ display: 'inline-block', animation: rowRefreshState[key] === 'refreshing' ? 'spin 0.8s linear infinite' : 'none' }}>
                &#x21bb;
              </span>
            </button>
            {/* Remove — disabled in MCP mode (project list is managed by context-forge) */}
            <button
              onClick={(e) => { e.stopPropagation(); if (!isMcp) handleRemove(key); }}
              title={isMcp ? "Projects are managed by MCP — remove via context-forge" : "Remove this project"}
              disabled={isMcp}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: 4, border: "1px solid transparent",
                backgroundColor: "transparent",
                color: isMcp ? "#333350" : "#555577",
                cursor: isMcp ? "not-allowed" : "pointer",
                flexShrink: 0, fontSize: 14, padding: 0,
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => { if (!isMcp) e.currentTarget.style.color = "#FF6B6B"; }}
              onMouseLeave={(e) => { if (!isMcp) e.currentTarget.style.color = "#555577"; }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add-project input */}
      <div style={{ padding: THEME.sp.sm, borderTop: "1px solid #1E1E3A", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: THEME.sp.xs }}>
          <input
            type="text"
            value={addPath}
            onChange={(e) => setAddPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={isMcp ? "Managed by MCP" : "Project path..."}
            disabled={addState === 'adding' || isMcp}
            title={isMcp ? "Projects are managed by MCP — add via context-forge" : undefined}
            style={{
              flex: 1, fontFamily: THEME.fonts.body, fontSize: 12,
              padding: `${THEME.sp.xs}px ${THEME.sp.sm}px`,
              backgroundColor: "#0D0D1A", border: "1px solid #2A2A4E",
              borderRadius: 6, color: "#C0C0D0", outline: "none",
              opacity: addState === 'adding' || isMcp ? 0.4 : 1,
              cursor: isMcp ? "not-allowed" : undefined,
            }}
          />
          <button
            onClick={handleAdd}
            disabled={addState === 'adding' || !addPath.trim() || isMcp}
            style={{
              fontFamily: THEME.fonts.heading, fontSize: 11,
              padding: `${THEME.sp.xs}px ${THEME.sp.sm}px`,
              borderRadius: 6, border: "1px solid #2A2A4E",
              backgroundColor: "transparent", color: "#8888AA",
              cursor: addState === 'adding' || !addPath.trim() ? 'default' : 'pointer',
              opacity: addState === 'adding' || !addPath.trim() ? 0.5 : 1,
              transition: "all 0.15s ease", flexShrink: 0,
            }}
          >
            {addState === 'adding' ? '…' : 'Add'}
          </button>
        </div>
        {addState === 'error' && (
          <div style={{
            marginTop: THEME.sp.xs, fontFamily: THEME.fonts.body, fontSize: 11,
            color: "#FF6B6B", lineHeight: 1.4,
          }}>{addError}</div>
        )}
      </div>

      {/* Find projects section — hidden in MCP mode (project list managed by context-forge) */}
      {!isMcp && <div style={{ borderTop: "1px solid #1E1E3A", flexShrink: 0 }}>
        {/* Toggle button */}
        <button
          onClick={handleToggleDiscover}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: `${THEME.sp.xs}px ${THEME.sp.sm}px`,
            backgroundColor: "transparent", border: "none",
            color: "#6666AA", fontFamily: THEME.fonts.body, fontSize: 12,
            cursor: "pointer", textAlign: "left",
          }}
        >
          <span>Find projects</span>
          <span style={{ fontSize: 14 }}>{showDiscover ? '‹' : '›'}</span>
        </button>

        {showDiscover && (
          <div style={{ padding: `0 ${THEME.sp.sm}px ${THEME.sp.sm}px` }}>
            {/* Root input + Find button */}
            <div style={{ display: "flex", gap: THEME.sp.xs, marginBottom: THEME.sp.xs }}>
              <input
                type="text"
                value={scanRoot}
                onChange={(e) => setScanRoot(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                placeholder="Root directory..."
                style={{
                  flex: 1, fontFamily: THEME.fonts.body, fontSize: 12,
                  padding: `${THEME.sp.xs}px ${THEME.sp.sm}px`,
                  backgroundColor: "#0D0D1A", border: "1px solid #2A2A4E",
                  borderRadius: 6, color: "#C0C0D0", outline: "none",
                }}
              />
              <button
                onClick={handleFind}
                disabled={scanState === 'scanning' || !scanRoot.trim()}
                style={{
                  fontFamily: THEME.fonts.heading, fontSize: 11,
                  padding: `${THEME.sp.xs}px ${THEME.sp.sm}px`,
                  borderRadius: 6, border: "1px solid #2A2A4E",
                  backgroundColor: "transparent", color: "#8888AA",
                  cursor: scanState === 'scanning' || !scanRoot.trim() ? 'default' : 'pointer',
                  opacity: scanState === 'scanning' || !scanRoot.trim() ? 0.5 : 1,
                  transition: "all 0.15s ease", flexShrink: 0,
                }}
              >
                {scanState === 'scanning' ? '…' : 'Find'}
              </button>
            </div>

            {/* Scan error */}
            {scanState === 'error' && (
              <div style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#FF6B6B", marginBottom: THEME.sp.xs }}>
                {scanError}
              </div>
            )}

            {/* Results */}
            {scanState === 'done' && (() => {
              const trackedPaths = new Set(Object.values(projects).map(p => p.sourcePath).filter(Boolean));
              return scanResults.length === 0 ? (
                <div style={{ fontFamily: THEME.fonts.body, fontSize: 11, color: "#555577", fontStyle: "italic" }}>
                  No projects found here
                </div>
              ) : scanResults.map((candidate) => {
                const isTracked = trackedPaths.has(candidate.path);
                const isAdding = rowAddState[candidate.path] === 'adding';
                return (
                  <div key={candidate.path} style={{ marginBottom: THEME.sp.xs }}>
                    <div style={{ display: "flex", alignItems: "center", gap: THEME.sp.xs }}>
                      <span style={{ color: isTracked ? "#444466" : "#8888AA", fontSize: 10, flexShrink: 0 }}>
                        {isTracked ? '○' : '●'}
                      </span>
                      <span style={{
                        fontFamily: THEME.fonts.body, fontSize: 12,
                        color: isTracked ? "#444466" : "#C0C0D0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                      }}>
                        {candidate.displayName}
                      </span>
                      {isTracked ? (
                        <span style={{ fontFamily: THEME.fonts.body, fontSize: 10, color: "#444466", flexShrink: 0 }}>
                          already added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRowAdd(candidate.path)}
                          disabled={isAdding}
                          style={{
                            fontFamily: THEME.fonts.heading, fontSize: 10,
                            padding: `1px ${THEME.sp.xs}px`,
                            borderRadius: 4, border: "1px solid #2A2A4E",
                            backgroundColor: "transparent", color: "#8888AA",
                            cursor: isAdding ? 'default' : 'pointer',
                            opacity: isAdding ? 0.5 : 1, flexShrink: 0,
                          }}
                        >
                          {isAdding ? '…' : 'Add'}
                        </button>
                      )}
                    </div>
                    <div style={{
                      fontFamily: THEME.fonts.body, fontSize: 10, color: "#444466",
                      paddingLeft: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {candidate.path}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>}
    </div>
  );
}

// ============================================================================
// MAIN
// ============================================================================
export default function ProjectStructureVisualizer() {
  const [projects, setProjects] = useState(PROJECTS);
  const [active, setActive] = useState(() => {
    try {
      const saved = localStorage.getItem('active-project');
      if (saved && PROJECTS[saved]) return saved;
    } catch { /* ignore */ }
    return Object.keys(PROJECTS)[0];
  });
  // 'idle' | 'refreshing' | 'error'
  const [refreshState, setRefreshState] = useState('idle');
  const [panelExpanded, setPanelExpanded] = useState(() => {
    try { return JSON.parse(localStorage.getItem('panel-expanded')) ?? false; } catch { return false; }
  });
  const handlePanelToggle = useCallback(() => {
    setPanelExpanded((v) => { const next = !v; localStorage.setItem('panel-expanded', JSON.stringify(next)); return next; });
  }, []);
  const handleActivate = useCallback((key) => {
    try { localStorage.setItem('active-project', key); } catch { /* ignore */ }
    setActive(key);
  }, []);

  // Called after add/remove/per-row refresh — reloads project data and updates state
  const handleProjectsChanged = useCallback(async () => {
    const fresh = await window.__loadProjects();
    setProjects(fresh);
    setActive((prev) => (fresh[prev] ? prev : Object.keys(fresh)[0] ?? null));
    return fresh;
  }, []);

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
    <div style={{ backgroundColor: "#0D0D1A", minHeight: "100vh", fontFamily: THEME.fonts.body, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .panel-row:hover { background-color: #ffffff08 !important; }
        .panel-list::-webkit-scrollbar { width: 4px; }
        .panel-list::-webkit-scrollbar-track { background: transparent; }
        .panel-list::-webkit-scrollbar-thumb { background: #2A2A4E; border-radius: 2px; }
        .panel-list::-webkit-scrollbar-thumb:hover { background: #3A3A6E; }
      `}</style>
      <PatternDefs />
      {/* Full-width header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: `${THEME.sp.lg}px ${THEME.sp.xl}px`,
        borderBottom: "1px solid #1E1E3A", flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontFamily: THEME.fonts.heading, fontSize: 24, color: "#E8E8FF", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#FFD700", opacity: 0.6 }}>⬡</span> Project Structure
          </h1>
          <p style={{ fontFamily: THEME.fonts.body, fontSize: 12, color: "#6666AA", margin: "4px 0 0 0" }}>
            ai-project-guide methodology visualizer
          </p>
        </div>
      </div>
      {/* Two-column body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <ProjectPanel
          projects={projects}
          active={active}
          onActivate={handleActivate}
          onRefreshAll={handleRefresh}
          refreshState={refreshState}
          onProjectsChanged={handleProjectsChanged}
          expanded={panelExpanded}
          onToggle={handlePanelToggle}
        />
        <div style={{ flex: 1, overflow: "auto", padding: THEME.sp.xl }}>
          {Object.keys(projects).length === 0 || !active ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "60%", fontFamily: THEME.fonts.body, fontSize: 14,
              color: "#555577", fontStyle: "italic",
            }}>
              No projects. Add one using the panel.
            </div>
          ) : (
            <>
              <Legend />
              <ProjectView data={projects[active]} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
