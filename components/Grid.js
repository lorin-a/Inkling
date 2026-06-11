import styles from "./Grid.module.css";

/**
 * The shared broadsheet layout primitives. Every page composes from these so
 * the column system, side bleed, and vertical rhythm are identical everywhere
 * — the grid is defined once, not re-hand-rolled per surface.
 *
 * <Bleed>  — a full-bleed section: edge padding (--bleed) + vertical rhythm
 *            (--rhythm), with an optional hard editorial rule beneath.
 * <Grid>   — the 12-column grid (--grid-cols / --gutter). Place children with
 *            the `col-*` helpers in Grid.module.css or inline grid-column.
 *
 * Register (see GRID.md): brand surfaces compose asymmetrically and may break
 * the grid for emphasis; product surfaces keep placement predictable.
 */
export function Bleed({ as: Tag = "section", rule = false, flush = false, className = "", children, ...rest }) {
  return (
    <Tag
      className={`${styles.bleed} ${rule ? styles.rule : ""} ${flush ? styles.flush : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Grid({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag className={`${styles.grid} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
