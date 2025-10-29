import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  PropsWithChildren,
} from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "ghost";

type CommonProps = {
  variant?: ButtonVariant;
  className?: string;
};

type ButtonAsButton = PropsWithChildren<
  CommonProps &
    ButtonHTMLAttributes<HTMLButtonElement> & {
      as?: "button";
    }
>;

type ButtonAsAnchor = PropsWithChildren<
  CommonProps &
    AnchorHTMLAttributes<HTMLAnchorElement> & {
      as: "a";
    }
>;

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button({
  variant = "primary",
  className = "",
  children,
  as = "button",
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  if (as === "a") {
    const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  const { type, ...buttonRest } =
    rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={classes} type={type ?? "button"} {...buttonRest}>
      {children}
    </button>
  );
}

export default Button;
