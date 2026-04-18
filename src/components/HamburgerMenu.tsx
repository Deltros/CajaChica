"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/cuentas", label: "Mantenedor de tarjetas" },
  { href: "/categorias", label: "Categorías de gastos" },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: 40, height: 40, borderRadius: 999,
          background: "var(--card)", border: "1px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--ink)", flexShrink: 0,
        }}
        aria-label="Menú"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 18, height: 18 }}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(22,20,16,0.4)" }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "relative", width: 272, maxWidth: "80vw",
            background: "var(--card)", height: "100%",
            display: "flex", flexDirection: "column",
            borderRight: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 20px", borderBottom: "1px solid var(--line)",
            }}>
              <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 22, letterSpacing: "-0.01em" }}>
                caja · chica
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: 99,
                  border: "1px solid var(--line)", background: "var(--bg)",
                  color: "var(--ink-3)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}
                aria-label="Cerrar menú"
              >
                ×
              </button>
            </div>
            <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "flex", alignItems: "center",
                      padding: "10px 14px", borderRadius: 14,
                      fontSize: 14, fontWeight: 500, textDecoration: "none",
                      background: isActive ? "var(--accent-soft)" : "transparent",
                      color: isActive ? "var(--accent)" : "var(--ink-2)",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ padding: "16px 10px", borderTop: "1px solid var(--line)" }}>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  width: "100%", textAlign: "left", fontSize: 14,
                  color: "var(--ink-3)", padding: "10px 14px", borderRadius: 14,
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
