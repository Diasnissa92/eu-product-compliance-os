"use client";

import { ArrowUpDown, ChevronRight, Filter, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ProductVisual } from "@/components/product-visual";
import { StatusPill } from "@/components/status-pill";
import type { ComplianceStatus, Product } from "@/lib/types";

const filters: Array<{ value: "all" | ComplianceStatus; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "compliant", label: "Conformes" },
  { value: "incomplete", label: "À compléter" },
  { value: "risk", label: "À risque" },
  { value: "blocking", label: "Bloquants" },
];

export function ProductTable({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ComplianceStatus>("all");
  const deferredQuery = useDeferredValue(query);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("fr");
    return products.filter((product) => {
      const matchesFilter = filter === "all" || product.status === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [product.name, product.sku, product.category, product.manufacturer]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [deferredQuery, filter, products]);

  return (
    <div className="product-table-wrap">
      {!compact ? (
        <div className="product-toolbar">
          <label className="search-field">
            <Search size={18} />
            <span className="sr-only">Rechercher un produit</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par produit, SKU, fabricant…"
            />
          </label>
          <button className="button button-secondary filter-button" type="button">
            <SlidersHorizontal size={17} /> Filtres avancés
          </button>
        </div>
      ) : null}

      {!compact ? (
        <div className="filter-tabs" role="group" aria-label="Filtrer les produits par statut">
          {filters.map((item) => (
            <button
              className={filter === item.value ? "filter-tab filter-tab-active" : "filter-tab"}
              type="button"
              key={item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span>
                {item.value === "all"
                  ? products.length
                  : products.filter((product) => product.status === item.value).length}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="table-scroll">
        <table className="product-table">
          <thead>
            <tr>
              <th><button type="button">Produit <ArrowUpDown size={13} /></button></th>
              <th>Catégorie</th>
              <th>Marchés</th>
              <th>Progression</th>
              <th>Statut</th>
              <th>Mise à jour</th>
              <th><span className="sr-only">Ouvrir</span></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <Link className="product-cell" href={`/products/${product.id}`}>
                    <ProductVisual tone={product.imageTone} size="small" />
                    <span><strong>{product.name}</strong><small>{product.sku}</small></span>
                  </Link>
                </td>
                <td><span className="table-primary">{product.category}</span></td>
                <td><span className="market-stack">EU</span><small className="market-count">{product.destinationMarkets.length} pays</small></td>
                <td>
                  <div className="score-cell">
                    <span className="mini-progress"><span style={{ width: `${product.score}%` }} /></span>
                    <strong>{product.score}%</strong>
                  </div>
                </td>
                <td><StatusPill status={product.status} compact /></td>
                <td><span className="table-muted">{product.updatedAt}</span></td>
                <td><Link className="row-link" href={`/products/${product.id}`} aria-label={`Ouvrir ${product.name}`}><ChevronRight size={17} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="table-empty">
          <Filter size={22} />
          <strong>Aucun produit trouvé</strong>
          <p>Modifiez la recherche ou sélectionnez un autre statut.</p>
        </div>
      ) : null}
    </div>
  );
}
