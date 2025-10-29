import type { ImgHTMLAttributes } from "react";
import styles from "./Image.module.css";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  rounded?: boolean;
};

export function Image({
  className = "",
  loading = "lazy",
  decoding = "async",
  rounded = true,
  ...rest
}: ImageProps) {
  const classes = [styles.image, rounded ? styles.rounded : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <img className={classes} loading={loading} decoding={decoding} {...rest} />
  );
}

export default Image;
