import React from "react";
import styles from "./mobile-shell.module.css";

interface MobileShellProps {
  children: React.ReactNode;
  className?: string;
  hideHeaderPad?: boolean;
}

export function MobileShell({ children, className = "", hideHeaderPad = false }: MobileShellProps) {
  return (
    <div className={styles.stage}>
      <div className={`${styles.viewport} ${className}`}>
        <div className={`${styles.content} ${hideHeaderPad ? styles.noPadTop : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
