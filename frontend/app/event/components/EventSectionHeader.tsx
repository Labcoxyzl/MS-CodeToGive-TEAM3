import styles from "../events.module.css";

interface Props {
  title: string;
  count: number;
  collapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function EventSectionHeader({
  title,
  count,
  collapsible,
  isExpanded,
  onToggle,
}: Props) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionHeaderTitle}>{title}</span>
      <span className={styles.sectionHeaderCount}>{count}</span>
      {collapsible && (
        <button
          className={styles.sectionHeaderToggle}
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      )}
    </div>
  );
}
