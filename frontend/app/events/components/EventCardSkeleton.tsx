import styles from "./EventCardSkeleton.module.css";

interface Props {
  count?: number;
}

function SingleSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.imageArea} />
      <div className={styles.body}>
        <div className={styles.line} />
        <div className={styles.lineShort} />
        <div className={styles.lineShort} />
      </div>
    </div>
  );
}

export default function EventCardSkeleton({ count = 6 }: Props) {
  return (
    <div className={count === 2 ? styles.gridTwo : styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SingleSkeleton key={i} />
      ))}
    </div>
  );
}
