import type { ImgHTMLAttributes } from "react";
import { normalizePath } from "@/utils/path";
import styles from "./Image.module.css";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  rounded?: boolean;
};

export function Image({
  className = "",
  loading = "lazy",
  decoding = "async",
  rounded = true,
  src,
  ...rest
}: ImageProps) {
  const classes = [styles.image, rounded ? styles.rounded : "", className]
    .filter(Boolean)
    .join(" ");

  // Нормализуем путь для работы с базовым путем GitHub Pages
  const normalizedSrc = src ? normalizePath(src) : src;

  return (
    <img
      className={classes}
      src={normalizedSrc}
      loading={loading}
      decoding={decoding}
      {...rest}
    />
  );
}

export default Image;
