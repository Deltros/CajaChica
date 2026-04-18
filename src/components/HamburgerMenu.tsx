"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/cuentas", label: "Mantenedor de tarjetas" },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col gap-1.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Menú"
      >
        <span className="block w-5 h-0.5 bg-gray-600 rounded" />
        <span className="block w-5 h-0.5 bg-gray-600 rounded" />
        <span className="block w-5 h-0.5 bg-gray-600 rounded" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="font-semibold text-gray-800">CajaChica</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full text-left text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
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
