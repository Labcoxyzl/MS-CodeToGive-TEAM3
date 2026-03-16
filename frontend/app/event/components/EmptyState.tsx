import styles from "../events.module.css";

interface Props {
  onClearFilters?: () => void;
  message?: string;
}

export default function EmptyState({
  onClearFilters,
  message = "No events match your filters.",
}: Props) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyStateIcon}>🍋</span>
      <p className={styles.emptyStateMsg}>{message}</p>
      {onClearFilters && (
        <button className={styles.emptyStateClear} onClick={onClearFilters}>
          Clear filters
        </button>
      )}
    </div>
  );
}
