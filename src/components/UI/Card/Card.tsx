import type { HTMLAttributes, PropsWithChildren } from "react";
import styles from "./Card.module.css";

type CardProps = PropsWithChildren<
  {
    accent?: "primary" | "secondary";
  } & HTMLAttributes<HTMLElement>
>;

export function Card({
  accent = "primary",
  className = "",
  children,
  ...rest
}: CardProps) {
  const classes = [styles.card, styles[accent], className]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes} {...rest}>
      {children}
    </article>
  );
}

export default Card;
