"use client";

import { useEffect, useRef, useState } from "react";
import { externalLinks } from "@/lib/content";
import { LogoMark } from "@/components/logo-mark";
import { TrackedLink } from "@/components/tracked-link";

const navItems = [
  { href: "#coffee", label: "COFFEE" },
  { href: "#culture", label: "CULTURE" },
  { href: "#open-info", label: "OPEN" },
  { href: "#access", label: "ACCESS" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    firstMenuLinkRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <div className="sample-bar" role="note">
        <strong>UNOFFICIAL CONCEPT / SAMPLE</strong>
        <span>営業提案用の非公式サイトです</span>
      </div>
      <header className="site-header">
        <a className="site-brand" href="#top" aria-label="Bashiiin! coffee ページ上部へ">
          <LogoMark />
          <span>BASHIIIN!<small>COFFEE</small></span>
        </a>
        <nav className="desktop-nav" aria-label="メインナビゲーション">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <div className="header-actions">
          <TrackedLink
            href={externalLinks["open-info"].href!}
            eventName="open_info_click"
            placement="header"
            className="header-open"
            target="_blank"
            rel="noopener noreferrer"
          >
            OPEN INFO <span aria-hidden="true">↗</span>
          </TrackedLink>
          <button
            ref={menuButtonRef}
            type="button"
            className="menu-toggle"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            onClick={() => setIsOpen((value) => !value)}
          >
            <span className="sr-only">メニュー</span>
            <span aria-hidden="true">{isOpen ? "CLOSE" : "MENU"}</span>
          </button>
        </div>
        <div id="mobile-menu" className={`mobile-menu ${isOpen ? "is-open" : ""}`} hidden={!isOpen}>
          <nav aria-label="モバイルナビゲーション">
            {navItems.map((item, index) => (
              <a
                key={item.href}
                ref={index === 0 ? firstMenuLinkRef : undefined}
                href={item.href}
                onClick={() => setIsOpen(false)}
              >
                <span>0{index + 1}</span>{item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
