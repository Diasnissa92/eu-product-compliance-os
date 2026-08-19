"use client";

import {
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  FileStack,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { WorkspaceContext } from "@/lib/auth/workspace";

const navigation = [
  { href: "/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/products", label: "Produits", icon: Boxes },
  { href: "/documents", label: "Documents", icon: FileStack },
  { href: "/settings", label: "Paramètres", icon: Settings, disabled: true },
];

function Brand() {
  return (
    <Link className="brand" href="/dashboard" aria-label="EU Product Compliance OS, accueil">
      <span className="brand-mark" aria-hidden="true">
        <ShieldCheck size={22} strokeWidth={2.2} />
      </span>
      <span>
        <strong>EU Compliance</strong>
        <small>Product OS</small>
      </span>
    </Link>
  );
}

function SidebarContent({ close, workspace }: { close?: () => void; workspace: WorkspaceContext }) {
  const pathname = usePathname();

  return (
    <>
      <div className="sidebar-top">
        <Brand />
        {close ? (
          <button className="icon-button sidebar-close" type="button" onClick={close} aria-label="Fermer le menu">
            <X size={19} />
          </button>
        ) : null}
      </div>

      <div className="workspace-switcher">
        <span className="avatar avatar-square">{workspace.organizationInitials}</span>
        <span>
          <small>Organisation</small>
          <strong>{workspace.organizationName}</strong>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </div>

      <nav className="sidebar-nav" aria-label="Navigation principale">
        <span className="nav-label">Espace de travail</span>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = !item.disabled && pathname.startsWith(item.href);
          if (item.disabled) {
            return (
              <span className="nav-item nav-item-disabled" key={item.href} title="Disponible prochainement">
                <Icon size={19} />
                {item.label}
                <small>Bientôt</small>
              </span>
            );
          }
          return (
            <Link className={`nav-item ${active ? "nav-item-active" : ""}`} href={item.href} key={item.href} onClick={close}>
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-insight">
        <span className="insight-icon"><Sparkles size={17} /></span>
        <strong>Diagnostic intelligent</strong>
        <p>Votre portefeuille est analysé à partir des règles V1.</p>
        <Link href="/products/luma-mini" onClick={close}>Voir un diagnostic</Link>
      </div>

      <div className="sidebar-footer">
        <button className="nav-item" type="button"><CircleHelp size={19} />Centre d’aide</button>
        {workspace.mode === "authenticated" ? (
          <div className="account-row">
            <span className="avatar">{workspace.userInitials}</span>
            <span><strong>{workspace.userName}</strong><small>{workspace.role}</small></span>
            <SignOutButton />
          </div>
        ) : (
          <Link className="account-row account-row-link" href="/login" onClick={close}>
            <span className="avatar">{workspace.userInitials}</span>
            <span><strong>Mode démonstration</strong><small>Se connecter</small></span>
            <ChevronDown size={16} />
          </Link>
        )}
      </div>
    </>
  );
}

export function AppShell({ children, workspace }: { children: React.ReactNode; workspace: WorkspaceContext }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar"><SidebarContent workspace={workspace} /></aside>

      {mobileOpen ? (
        <div className="mobile-navigation" role="dialog" aria-modal="true" aria-label="Menu principal">
          <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" />
          <aside className="mobile-sidebar"><SidebarContent close={() => setMobileOpen(false)} workspace={workspace} /></aside>
        </div>
      ) : null}

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
            <Menu size={20} />
          </button>
          <div className="topbar-context">
            <span className="status-dot" />
            {workspace.mode === "authenticated" ? "Données sécurisées" : "Données de démonstration"}
          </div>
          <div className="topbar-actions">
            <button className="icon-button notification-button" type="button" aria-label="Notifications">
              <Bell size={19} />
              <span aria-label="3 notifications">3</span>
            </button>
            <span className="topbar-divider" />
            <span className="avatar avatar-small">{workspace.userInitials}</span>
          </div>
        </header>
        <div className="workspace-content">{children}</div>
      </div>
    </div>
  );
}
