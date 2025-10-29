import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  PropsWithChildren,
} from "react";
import type { LinkProps } from "react-router-dom";
import { Link } from "react-router-dom";
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

type ButtonAsLink = PropsWithChildren<
  CommonProps &
    Omit<LinkProps, "className"> & {
      as: typeof Link;
    }
>;

type ButtonProps = ButtonAsButton | ButtonAsAnchor | ButtonAsLink;

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

  if (as === Link) {
    const linkProps = rest as Omit<LinkProps, "className">;
    return (
      <Link className={classes} {...linkProps}>
        {children}
      </Link>
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
