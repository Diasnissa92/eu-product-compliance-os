"use client";

import { ArrowUpDown, ChevronRight, Filter, Search, X } from "lucide-react";
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

type ProductSort = "recent" | "name-asc" | "name-desc" | "score-desc";

export function ProductTable({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ComplianceStatus>("all");
  const [sort, setSort] = useState<ProductSort>("recent");
  const deferredQuery = useDeferredValue(query);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("fr");
    const result = products.filter((product) => {
      const matchesFilter = filter === "all" || product.status === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [product.name, product.sku, product.category, product.manufacturer]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });

    return result.toSorted((left, right) => {
      if (sort === "name-asc") return left.name.localeCompare(right.name, "fr");
      if (sort === "name-desc") return right.name.localeCompare(left.name, "fr");
      if (sort === "score-desc") return right.score - left.score || left.name.localeCompare(right.name, "fr");
      return 0;
    });
  }, [deferredQuery, filter, products, sort]);

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
            {query ? <button className="search-clear" type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche"><X size={15} /></button> : null}
          </label>
          <label className="sort-field product-sort-field">
            <ArrowUpDown size={16} />
            <span className="sr-only">Trier les produits</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as ProductSort)}>
              <option value="recent">Plus récents</option>
              <option value="name-asc">Nom A–Z</option>
              <option value="name-desc">Nom Z–A</option>
              <option value="score-desc">Meilleur score</option>
            </select>
          </label>
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
              aria-pressed={filter === item.value}
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

      {!compact ? <p className="results-status" aria-live="polite">{filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} affiché{filteredProducts.length > 1 ? "s" : ""}</p> : null}

      <div className="table-scroll">
        <table className="product-table">
          <thead>
            <tr>
              <th aria-sort={sort === "name-asc" ? "ascending" : sort === "name-desc" ? "descending" : "none"}>
                <button type="button" onClick={() => setSort((current) => current === "name-asc" ? "name-desc" : "name-asc")}>
                  Produit <ArrowUpDown size={13} />
                </button>
              </th>
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
