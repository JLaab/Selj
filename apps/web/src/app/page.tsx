 "use client";

import styles from "./page.module.css";
import { ThemeToggle } from "../components/theme-toggle";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import type { Category, Listing } from "../lib/types";
import { placeholderImage } from "../lib/placeholders";

const counties = [
  "Stockholm",
  "Västra Götaland",
  "Skåne",
  "Uppsala",
  "Södermanland",
  "Östergötland",
  "Jönköping",
  "Kronoberg",
  "Kalmar",
  "Gotland",
  "Blekinge",
  "Halland",
  "Värmland",
  "Örebro",
  "Västmanland",
  "Dalarna",
  "Gävleborg",
  "Västernorrland",
  "Jämtland",
  "Västerbotten",
  "Norrbotten",
];

export default function Home() {
  const [saleType, setSaleType] = useState<"saljes" | "kopes">("saljes");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState<"latest" | "priceLow" | "priceHigh">("latest");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "browse" | "dashboard" | "messages" | "new" | "favorites"
  >("browse");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [viewAllCounties, setViewAllCounties] = useState(false);
  const [waitlist, setWaitlist] = useState<Set<string>>(new Set());
  const [showReply, setShowReply] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "",
    subcategory: "",
    price: "",
    city: "",
    description: "",
    name: "",
    email: "",
    password: "",
    sellerWebsite: "",
    phone: "",
    county: "",
  });

  const [categoriesState, setCategoriesState] = useState<Category[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const unreadCount = 3;
  const freeMonthsLeft = 2;

  const updateField =
    (key: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const updateFilterValue = (label: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [label]: value }));
  };
  const searchAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const cats = await fetch("/api/categories").then((r) => r.json());
      setCategoriesState(cats);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    setFilterValues({});
  }, [selectedCategory]);

  const performSearch = useCallback(async () => {
    if (searchAbort.current) {
      searchAbort.current.abort();
    }
    const controller = new AbortController();
    searchAbort.current = controller;

    const fetchAllListings = async () => {
      try {
        const res = await fetch("/api/listings");
        if (res.ok) {
          const all = await res.json();
          setListings(all);
          return true;
        }
      } catch (e) {
        console.error("Fallback /api/listings fail", e);
      }
      return false;
    };

    const params = new URLSearchParams();
    const q = searchTerm.trim();
    if (q) params.set("q", q);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedCounty && !viewAllCounties) params.set("county", selectedCounty);
    const cleanFilters: Record<string, string> = {};
    Object.entries(filterValues).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        cleanFilters[key] = val.toString();
      }
    });
    if (Object.keys(cleanFilters).length) {
      params.set("filters", JSON.stringify(cleanFilters));
    }

    try {
      setIsSearching(true);
      const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Sök misslyckades");
      const data = await res.json();
      if (!controller.signal.aborted) {
        const hits = data.hits ?? data ?? [];
        const isEmptyQuery =
          !q &&
          !selectedCategory &&
          (viewAllCounties || !selectedCounty) &&
          Object.keys(cleanFilters).length === 0;
        if (Array.isArray(hits) && hits.length === 0 && isEmptyQuery) {
          const ok = await fetchAllListings();
          if (ok) return;
        }
        setListings(hits);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Sökfel", err);
      const ok = await fetchAllListings();
      if (ok) return;
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, [filterValues, searchTerm, selectedCategory, selectedCounty, viewAllCounties]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch();
    }, 250);
    return () => clearTimeout(debounce);
  }, [performSearch]);

  useEffect(() => {
    return () => {
      searchAbort.current?.abort();
    };
  }, []);

  const showPreview = useMemo(
    () => Object.values(form).some((v) => v.trim().length > 0),
    [form]
  );
  const categoryLabelLookup = useMemo(
    () => Object.fromEntries(categoriesState.map((c) => [c.value, c.label])),
    [categoriesState]
  );
  const topCategories = useMemo(
    () => categoriesState.filter((c) => !c.parentValue),
    [categoriesState]
  );
  const childrenByParent = useMemo(() => {
    const map: Record<string, Category[]> = {};
    categoriesState.forEach((c) => {
      if (!c.parentValue) return;
      if (!map[c.parentValue]) map[c.parentValue] = [];
      map[c.parentValue].push(c);
    });
    return map;
  }, [categoriesState]);
  const flattenedCategories = useMemo(() => {
    const ordered: Category[] = [];
    topCategories.forEach((cat) => {
      ordered.push(cat);
      const children = childrenByParent[cat.value];
      if (children) children.forEach((child) => ordered.push(child));
    });
    return ordered;
  }, [childrenByParent, topCategories]);

  const resetCounty = () => {
    setSelectedCounty("");
    setViewAllCounties(false);
  };
  const selectListing = (item: Listing) => {
    setSelectedListing(item);
    setShowReply(false);
    setCurrentImageIdx(0);
    if (item.county && !viewAllCounties) setSelectedCounty(item.county);
  };

  const sortedListings = useMemo(() => {
    const list = [...listings];
    if (sortBy === "latest") return list;
    return list.sort((a, b) => {
      const av = a.priceValue ?? Number.POSITIVE_INFINITY;
      const bv = b.priceValue ?? Number.POSITIVE_INFINITY;
      if (sortBy === "priceLow") return av - bv;
      return bv - av;
    });
  }, [listings, sortBy]);

  const attributeSummary = (item: Listing) => {
    const attrs = getAttributeItems(item, true);
    if (attrs.length === 0) return "";
    return attrs.map((a) => `${a.label}: ${a.value}`).join(" • ");
  };

  const nextImage = () => {
    if (!selectedListing) return;
    const len = (selectedListing.images && selectedListing.images.length) || 1;
    setCurrentImageIdx((idx) => (idx + 1) % len);
  };

  const prevImage = () => {
    if (!selectedListing) return;
    const len = (selectedListing.images && selectedListing.images.length) || 1;
    setCurrentImageIdx((idx) => (idx - 1 + len) % len);
  };

  const toggleWaitlist = (title: string) => {
    setWaitlist((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const getAttributeItems = (listing: Listing, onlyRequired = false) => {
    const filtersForListing =
      categoriesState.find((c) => c.value === listing.category)?.createFields ??
      categoriesState.find((c) => c.value === listing.category)?.filters ??
      [];
    return filtersForListing
      .filter((f) => (onlyRequired ? f.required : true))
      .map((filter) => {
        if (filter.type === "range") {
          const min = listing.attributes?.[`${filter.label}-min`] || listing.attributes?.[filter.label];
          const max = listing.attributes?.[`${filter.label}-max`];
          if (!min && !max) return null;
          if (min && max) return { label: filter.label, value: `${min} – ${max}` };
          return { label: filter.label, value: min || max };
        }
        const val = listing.attributes?.[filter.label];
        if (!val) return null;
        return { label: filter.label, value: val };
      })
      .filter(Boolean) as { label: string; value: string }[];
  };

  if (selectedListing) {
    const displayImages =
      selectedListing.images && selectedListing.images.length > 0
        ? selectedListing.images
        : [placeholderImage];
    const attributeItems = getAttributeItems(selectedListing);

    return (
      <div className={styles.page}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.dot} />
            <span>selj</span>
          </div>
          <div className={styles.searchShell}>
            <input
              className={styles.searchInput}
              placeholder="Sök efter bilar, elektronik, med mera"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
              <select
                className={styles.categorySelect}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Alla kategorier</option>
              {flattenedCategories.map((cat) => {
                const parentLabel = cat.parentValue
                  ? categoryLabelLookup[cat.parentValue] || cat.parentValue
                  : "";
                return (
                  <option key={cat.value} value={cat.value}>
                    {parentLabel ? `${parentLabel} / ${cat.label}` : cat.label}
                  </option>
                );
              })}
              </select>
              <span className={styles.searchIcon}>🔍</span>
            </div>
          <div className={styles.topActions}>
            <a className={styles.adminToggle} href="/admin">
              Admin
            </a>
            <button
              className={styles.linkButton}
              onClick={() => setIsLoggedIn((v) => !v)}
              aria-label="Toggle inloggat läge"
            >
              {isLoggedIn ? "Logga ut" : "Logga in"}
            </button>
            <ThemeToggle />
          </div>
        </header>

        <section className={`${styles.card} ${styles.detailPage}`}>
          <div className={styles.detailHeader}>
            <div>
              <p className={styles.overtitle}>{selectedCounty || "Län"}</p>
              <h3 className={styles.heading3}>{selectedListing.title}</h3>
              <p className={styles.listMeta}>
                {(selectedListing.city && `${selectedListing.city}, `) || ""}
                {selectedListing.county || selectedCounty || "Okänt län"} • {selectedListing.date} •{" "}
                {selectedListing.seller}
                {saleType === "kopes" ? " • Köpes" : ""}
              </p>
            </div>
            <div className={styles.detailHeaderActions}>
              <button
                className={`${styles.favButton} ${
                  waitlist.has(selectedListing.title) ? styles.favButtonActive : ""
                }`}
                onClick={() => toggleWaitlist(selectedListing.title)}
              >
                {waitlist.has(selectedListing.title) ? "Favorit ✓" : "Favorit"}
              </button>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setSelectedListing(null);
                  setShowReply(false);
                }}
              >
                Tillbaka
              </button>
            </div>
          </div>

          <div className={styles.detailLayout}>
            <div
              className={styles.detailMedia}
              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchStartX === null) return;
                const delta = e.changedTouches[0].clientX - touchStartX;
                if (Math.abs(delta) > 30) {
                  if (delta < 0) {
                    nextImage();
                  } else {
                    prevImage();
                  }
                }
                setTouchStartX(null);
              }}
            >
              <div
                className={styles.detailImageWrap}
                onClick={() => setShowLightbox(true)}
                role="button"
                aria-label="Öppna bild i helskärm"
              >
                <button
                  className={styles.carouselNavLeft}
                  onClick={prevImage}
                  aria-label="Föregående bild"
                >
                  ‹
                </button>
                <Image
                  src={displayImages[currentImageIdx]}
                  alt={selectedListing.title}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1200px) 80vw, 60vw"
                  className={styles.detailImage}
                />
                <button
                  className={styles.carouselNavRight}
                  onClick={nextImage}
                  aria-label="Nästa bild"
                >
                  ›
                </button>
              </div>
              <div className={`${styles.thumbStrip} ${styles.detailThumbs}`}>
                {displayImages.map((img, idx) => (
                  <button
                    key={img + idx}
                    className={`${styles.thumbBtn} ${
                      currentImageIdx === idx ? styles.thumbBtnActive : ""
                    }`}
                    onClick={() => setCurrentImageIdx(idx)}
                    aria-label={`Visa bild ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${selectedListing.title} ${idx + 1}`}
                      fill
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.detailContent}>
              {attributeItems.length > 0 && (
                <div className={styles.attributeList}>
                  {attributeItems.map((attr) => (
                    <div key={attr.label} className={styles.attributeRow}>
                      <span className={styles.attributeLabel}>{attr.label}:</span>
                      <span className={styles.attributeValue}>{attr.value}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className={styles.body}>
                {selectedListing.description?.trim() ||
                  selectedListing.meta ||
                  "Beskrivning saknas. Lägg till mer info i admin."}
              </p>
              <p className={styles.listPrice}>{selectedListing.price}</p>
              {!showReply && (
                <div className={styles.detailActions}>
                  <button className={styles.primaryButton} onClick={() => setShowReply(true)}>
                    Kontakta säljare
                  </button>
                </div>
              )}
              {showReply && (
                <div className={styles.replyPanel}>
                  <div className={styles.replyHeader}>
                    <p className={styles.overtitle}>Meddela säljaren</p>
                  </div>
                  <div className={styles.replyBody}>
                    <div className={styles.replyMessage}>
                      <textarea placeholder="Skriv ditt meddelande..." />
                      <div className={styles.replyActions}>
                        <button className={styles.primaryButton}>Skicka</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.sellerStrip}>
            <p className={styles.overtitle}>Säljare</p>
            <p className={styles.listTitle}>
              {selectedListing.sellerName ||
                (selectedListing.seller === "Företag" ? "Företagssäljare" : "Privat säljare")}
            </p>
            <p className={styles.listMeta}>{selectedListing.seller}</p>
            {selectedListing.sellerWebsite && (
              <p className={styles.listMeta}>Hemsida: {selectedListing.sellerWebsite}</p>
            )}
            {selectedListing.sellerPhone && (
              <p className={styles.listMeta}>Telefon: {selectedListing.sellerPhone}</p>
            )}
            {selectedListing.sellerEmail && (
              <p className={styles.listMeta}>E-post: {selectedListing.sellerEmail}</p>
            )}
            {(selectedListing.city || selectedListing.county) && (
              <p className={styles.listMeta}>
                {(selectedListing.city && `${selectedListing.city}, `) || ""}
                {selectedListing.county}
              </p>
            )}
          </div>
        </section>

        {isLoggedIn && (
          <nav className={styles.mobileNav}>
            <button className={styles.navActive} onClick={() => setSelectedListing(null)}>
              Till listan
            </button>
          </nav>
        )}

        {showLightbox && selectedListing && (
          <div className={styles.lightboxOverlay} role="dialog" aria-modal="true">
            <div className={styles.lightboxCard}>
              <div className={styles.lightboxTop}>
                <button className={styles.lightboxClose} onClick={() => setShowLightbox(false)}>
                  Stäng
                </button>
              </div>
              <div
                className={styles.lightboxImageWrap}
                onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchStartX === null) return;
                  const delta = e.changedTouches[0].clientX - touchStartX;
                  if (Math.abs(delta) > 30) {
                    if (delta < 0) {
                      nextImage();
                    } else {
                      prevImage();
                    }
                  }
                  setTouchStartX(null);
                }}
              >
                <button
                  className={styles.carouselNavLeft}
                  onClick={prevImage}
                  aria-label="Föregående bild"
                >
                  ‹
                </button>
                <Image
                  src={selectedListing.images[currentImageIdx]}
                  alt={selectedListing.title}
                  fill
                  sizes="100vw"
                  className={styles.lightboxImage}
                />
                <button
                  className={styles.carouselNavRight}
                  onClick={nextImage}
                  aria-label="Nästa bild"
                >
                  ›
                </button>
              </div>
              <div className={`${styles.thumbStrip} ${styles.lightboxThumbs}`}>
                {displayImages.map((img, idx) => (
                  <button
                    key={img + idx}
                    className={`${styles.thumbBtn} ${
                      currentImageIdx === idx ? styles.thumbBtnActive : ""
                    }`}
                    onClick={() => setCurrentImageIdx(idx)}
                    aria-label={`Visa bild ${idx + 1}`}
                  >
                    <Image src={img} alt={`${selectedListing.title} ${idx + 1}`} fill sizes="80px" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <div className={styles.brand}>
                <span className={styles.dot} />
                <span>selj</span>
              </div>
              <p className={styles.body}>
                Selj är marknadsplatsen för snabba affärer på mobil och desktop. Fokus
                på rapp sök, stabil scroll och trygg kommunikation mellan köpare och säljare.
              </p>
              <div className={styles.footerMeta}>
                <span>Org.nr 5599-123456</span>
                <span>Stockholm, Sverige</span>
              </div>
            </div>
            <div className={styles.footerCol}>
              <h4>Produkt</h4>
              <a href="#">Sök annonser</a>
              <a href="#">Lägg upp annons</a>
              <a href="#">Kategorier</a>
              <a href="#">Säljes / Köpes</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Support</h4>
              <a href="#">Hjälpcenter</a>
              <a href="#">Rapportera annons</a>
              <a href="#">Säkerhet & bedrägerier</a>
              <a href="#">Cookie- och integritetspolicy</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Kontakt</h4>
              <a href="mailto:hej@selj.se">hej@selj.se</a>
              <a href="tel:+46812345678">+46 (0)8 12 34 56 78</a>
              <a href="#">Press & media</a>
              <a href="#">Jobb</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} Selj</span>
            <span>Byggd för hög trafik med edge-cache och typo-tolerant sök.</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.dot} />
          <span>selj</span>
        </div>
        <div className={styles.searchShell}>
          <input
            className={styles.searchInput}
            placeholder="Sök efter bilar, elektronik, med mera"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className={styles.categorySelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Alla kategorier</option>
                    {flattenedCategories.map((cat) => {
                      const parentLabel = cat.parentValue
                        ? categoryLabelLookup[cat.parentValue] || cat.parentValue
                        : "";
                      return (
                        <option key={cat.value} value={cat.value}>
                          {parentLabel ? `${parentLabel} / ${cat.label}` : cat.label}
                        </option>
                      );
                    })}
          </select>
          <span className={styles.searchIcon}>🔍</span>
        </div>
        <div className={styles.topActions}>
          <a className={styles.adminToggle} href="/admin">
            Admin
          </a>
          <button className={styles.iconButton} aria-label="Meddelanden">
            ✉️
            {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
          </button>
          <button
            className={styles.linkButton}
            onClick={() => setIsLoggedIn((v) => !v)}
            aria-label="Toggle inloggat läge"
          >
            {isLoggedIn ? "Logga ut" : "Logga in"}
          </button>
          {isLoggedIn && (
            <button
              className={styles.linkButton}
              onClick={() => setActivePanel("dashboard")}
            >
              Mina sidor
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>
      {activePanel === "browse" ? (
        selectedCounty || viewAllCounties ? (
          <section className={`${styles.card} ${styles.listView}`}>
            <div className={styles.listHeaderRow}>
              <div>
                <p className={styles.overtitle}>{viewAllCounties ? "Visar alla län" : "Valt län"}</p>
                <h2 className={styles.heading2}>{viewAllCounties ? "Alla annonser" : selectedCounty}</h2>
                <p className={styles.body}>
                  {sortedListings.length} exempelannonser. Senaste överst när vi kopplar på riktiga
                  data. {isSearching ? "Söker..." : ""}
                </p>
              </div>
              <div className={styles.listActions}>
                <div className={styles.sortRow}>
                  <button
                    className={sortBy === "latest" ? styles.segmentActive : styles.segment}
                    onClick={() => setSortBy("latest")}
                  >
                    Senaste
                  </button>
                  <button
                    className={sortBy === "priceLow" ? styles.segmentActive : styles.segment}
                    onClick={() => setSortBy("priceLow")}
                  >
                    Lägst pris
                  </button>
                  <button
                    className={sortBy === "priceHigh" ? styles.segmentActive : styles.segment}
                    onClick={() => setSortBy("priceHigh")}
                  >
                    Högst pris
                  </button>
                </div>
                <div className={styles.viewToggle}>
                  <button
                    className={viewMode === "grid" ? styles.segmentActive : styles.segment}
                    onClick={() => setViewMode("grid")}
                  >
                    Rutnät
                  </button>
                  <button
                    className={viewMode === "list" ? styles.segmentActive : styles.segment}
                    onClick={() => setViewMode("list")}
                  >
                    Lista
                  </button>
                </div>
                <div className={styles.switchRow}>
                  <button
                    className={
                      saleType === "saljes" ? styles.segmentActive : styles.segment
                    }
                    onClick={() => setSaleType("saljes")}
                  >
                    Säljes
                  </button>
                  <button
                    className={
                      saleType === "kopes" ? styles.segmentActive : styles.segment
                    }
                    onClick={() => setSaleType("kopes")}
                  >
                    Köpes
                  </button>
                </div>
                <button className={styles.linkButton} onClick={resetCounty}>
                  Byt län
                </button>
                {!viewAllCounties && (
                  <button className={styles.linkButton} onClick={() => setViewAllCounties(true)}>
                    Visa alla län
                  </button>
                )}
              </div>
            </div>

            {selectedCategory && (
          <div className={styles.filterBar}>
            <div className={styles.filterChips}>
                  {(categoriesState.find((cat) => cat.value === selectedCategory)?.searchFilters ??
                    categoriesState.find((cat) => cat.value === selectedCategory)?.filters ??
                    [])?.map((filter) => {
                      if (filter.type === "select") {
                        return (
                          <div key={filter.label} className={styles.filterField}>
                            <label>{filter.label}</label>
                            <select
                              value={filterValues[filter.label] || ""}
                              onChange={(e) => updateFilterValue(filter.label, e.target.value)}
                            >
                              <option value="">Alla</option>
                              {filter.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      if (filter.type === "range") {
                        const isSlider = filter.ui === "slider";
                        return (
                          <div key={filter.label} className={styles.filterField}>
                            <label>{filter.label}</label>
                            {isSlider ? (
                              <input
                                type="range"
                                min={filter.min}
                                max={filter.max}
                                value={filterValues[filter.label] || filter.min}
                                onChange={(e) => updateFilterValue(filter.label, e.target.value)}
                              />
                            ) : (
                              <div className={styles.rangeFields}>
                                <input
                                  type="number"
                                  placeholder={filter.min}
                                  value={filterValues[`${filter.label}-min`] || ""}
                                  onChange={(e) =>
                                    updateFilterValue(`${filter.label}-min`, e.target.value)
                                  }
                                />
                                <span>–</span>
                                <input
                                  type="number"
                                  placeholder={filter.max}
                                  value={filterValues[`${filter.label}-max`] || ""}
                                  onChange={(e) =>
                                    updateFilterValue(`${filter.label}-max`, e.target.value)
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      }
                      if (filter.type === "chip") {
                        return (
                          <div key={filter.label} className={styles.filterField}>
                            <label>{filter.label}</label>
                            <div className={styles.chipRow}>
                              {filter.options.map((opt) => {
                                const active = filterValues[filter.label] === opt;
                                return (
                                  <button
                                    key={opt}
                                    className={`${styles.chipButton} ${active ? styles.chipActive : ""}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      updateFilterValue(filter.label, active ? "" : opt);
                                    }}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
            </div>
          </div>
            )}

            {viewMode === "grid" ? (
              <div className={styles.listGrid}>
                {sortedListings.map((item) => (
                  <article
                    key={item.id}
                    className={styles.listCard}
                    onClick={() => selectListing(item)}
                  >
                    <div className={styles.listThumb}>
                      <Image
                        src={item.images?.[0] || placeholderImage}
                        alt={item.title}
                        fill
                        sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    </div>
                    <div className={styles.listCardBody}>
                      <p className={styles.listTitle}>{item.title}</p>
                      <p className={styles.listPrice}>{item.price}</p>
                      <p className={styles.listMeta}>
                        {(item.city && `${item.city}, `) || ""}
                        {item.county || selectedCounty || "Okänt län"} • {item.date} • {item.seller}
                      </p>
                      {attributeSummary(item) && (
                        <p className={styles.listMetaMuted}>{attributeSummary(item)}</p>
                      )}
                      <button
                        className={`${styles.waitButton} ${waitlist.has(item.title) ? styles.waitButtonActive : ""} ${styles.listHeart}`}
                        aria-label="Lägg på vänt"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWaitlist(item.title);
                        }}
                      >
                        ♥
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.listRows}>
                {sortedListings.map((item) => (
                  <article
                    key={item.id}
                    className={styles.listRow}
                    onClick={() => selectListing(item)}
                  >
                    <div className={styles.listRowThumb}>
                      <Image
                        src={item.images?.[0] || placeholderImage}
                        alt={item.title}
                        fill
                        sizes="160px"
                      />
                    </div>
                    <div className={styles.listRowBody}>
                      <p className={styles.listTitle}>{item.title}</p>
                      <p className={styles.listPrice}>{item.price}</p>
                      <p className={styles.listMeta}>
                        {(item.city && `${item.city}, `) || ""}
                        {item.county || selectedCounty || "Okänt län"} • {item.date} • {item.seller}
                      </p>
                      {attributeSummary(item) && (
                        <p className={styles.listMetaMuted}>{attributeSummary(item)}</p>
                      )}
                    </div>
                    <button
                      className={`${styles.waitButton} ${waitlist.has(item.title) ? styles.waitButtonActive : ""}`}
                      aria-label="Lägg på vänt"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWaitlist(item.title);
                      }}
                    >
                      ♥
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <main className={styles.layout}>
            <section className={`${styles.card} ${styles.createCard}`}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.overtitle}>Publicera gratis</p>
                  <h1 className={styles.heading1}>Lägg upp annons</h1>
                </div>
                <div className={styles.switchRow}>
                  <button
                    className={
                      saleType === "saljes" ? styles.segmentActive : styles.segment
                    }
                    onClick={() => setSaleType("saljes")}
                  >
                    Säljes
                  </button>
                  <button
                    className={
                      saleType === "kopes" ? styles.segmentActive : styles.segment
                    }
                    onClick={() => setSaleType("kopes")}
                  >
                    Köpes
                  </button>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Rubrik</label>
                  <input
                    placeholder="Ex. Volvo V70 2016"
                    value={form.title}
                    onChange={updateField("title")}
                  />
                </div>
                <div className={styles.inlineFields}>
                  <input
                    placeholder="Kategori"
                    value={form.category}
                    onChange={updateField("category")}
                  />
                  <input
                    placeholder="Underkategori"
                    value={form.subcategory}
                    onChange={updateField("subcategory")}
                  />
                </div>
                <div className={styles.inlineFields}>
                  <input
                    placeholder="Pris"
                    value={form.price}
                    onChange={updateField("price")}
                  />
                  <input
                    placeholder="Ort"
                    value={form.city}
                    onChange={updateField("city")}
                  />
                </div>
                <div className={styles.inlineFields}>
                  <input
                    placeholder="Län"
                    value={form.county}
                    onChange={updateField("county")}
                  />
                  <input
                    placeholder="Telefon"
                    value={form.phone}
                    onChange={updateField("phone")}
                  />
                </div>
                <div className={styles.field}>
                  <label>Beskrivning</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Fritext om annonsen"
                    value={form.description}
                    onChange={updateField("description")}
                  />
                </div>
                <div className={styles.inlineFields}>
                  <input
                    placeholder="Namn"
                    value={form.name}
                    onChange={updateField("name")}
                  />
                  <input
                    placeholder="E-post"
                    value={form.email}
                    onChange={updateField("email")}
                  />
                  <input
                    placeholder="Lösenord"
                    type="password"
                    value={form.password}
                    onChange={updateField("password")}
                  />
                </div>
                <div className={styles.inlineFields}>
                  <input
                    placeholder="Webbplats (företag)"
                    value={form.sellerWebsite}
                    onChange={updateField("sellerWebsite")}
                  />
                </div>
                <div className={styles.field}>
                  <label>Media (bild/video)</label>
                  <div className={styles.uploadZone}>
                    <p>Dra och släpp på desktop eller välj/ta foto på mobil.</p>
                    <p className={styles.micro}>Max 10MB per fil. Stöder bild och video.</p>
                    <div className={styles.uploadActions}>
                      <button type="button" className={styles.uploadButton}>
                        Välj filer
                      </button>
                      <button
                        type="button"
                        className={`${styles.uploadButton} ${styles.mobileOnly}`}
                      >
                        Öppna kamera
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {showPreview && (
                <div className={styles.preview}>
                  <p className={styles.overtitle}>Förhandsgranskning</p>
                  <div className={styles.previewCard}>
                    <div className={styles.previewImage} />
                    <div className={styles.previewContent}>
                      <p className={styles.listTitle}>
                        {form.title || "Rubrik visas här"}
                      </p>
                      <p className={styles.listPrice}>
                        {form.price ? `${form.price} kr` : "Pris"}
                      </p>
                      <p className={styles.listMeta}>
                        {(form.city && `${form.city} • `) || ""}
                        {form.category || "Kategori"}
                        {saleType === "kopes" ? " • Köpes" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.actions}>
                <button className={styles.primaryButton}>Publicera</button>
                <p className={styles.micro}>Utkast sparas automatiskt. Live i 90 dagar.</p>
              </div>
            </section>

            <section className={`${styles.card} ${styles.countyCard}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.heading2}>Välj län</h2>
              </div>
              <div className={styles.countyList}>
                {counties.map((county) => (
                  <button
                    key={county}
                    className={styles.countyRow}
                    onClick={() => {
                      setSelectedCounty(county);
                      setViewAllCounties(false);
                    }}
                  >
                    {county}
                  </button>
                ))}
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => {
                    setViewAllCounties(true);
                    setSelectedCounty("");
                  }}
                >
                  Visa alla län
                </button>
              </div>
            </section>
          </main>
        )
      ) : (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.heading2}>
              {activePanel === "dashboard"
                ? "Mina sidor"
                : activePanel === "messages"
                ? "Meddelanden"
                : activePanel === "new"
                ? "Ny annons"
                : "Favoriter"}
            </h2>
            <span className={styles.badge}>Inloggad</span>
          </div>
          <div className={styles.dashboardGrid}>
            {activePanel === "dashboard" && (
              <>
                <div className={styles.dashboardHero}>
                  <div>
                    <p className={styles.overtitle}>Översikt</p>
                    <h2 className={styles.heading2}>Mina sidor</h2>
                    <p className={styles.body}>Snabb koll på annonser, meddelanden och siffror.</p>
                  </div>
                  <div className={styles.heroStats}>
                    <div className={styles.statCard}>
                      <p className={styles.micro}>Visningar 7d</p>
                      <p className={styles.heading3}>230</p>
                      <div className={styles.statBar}>
                        <span style={{ width: "68%" }} />
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.micro}>Favoriter 7d</p>
                      <p className={styles.heading3}>12</p>
                      <div className={styles.statBar}>
                        <span style={{ width: "40%" }} />
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <p className={styles.micro}>Svarstid</p>
                      <p className={styles.heading3}>11 min</p>
                      <div className={styles.statPill}>Snabbt</div>
                    </div>
                  </div>
                </div>

                <div className={styles.dashboardCardAccent}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.overtitle}>Konversationer</p>
                      <p className={styles.heading3}>3 aktiva</p>
                    </div>
                    <button className={styles.primaryButton}>Öppna inbox</button>
                  </div>
                  <ul className={styles.listSimple}>
                    <li>Volvo V70 2016 — 2 nya</li>
                    <li>MacBook Air 13 — väntar svar</li>
                    <li>Soffa 3-sits — leveransfråga</li>
                  </ul>
                </div>

                <div className={styles.dashboardCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.overtitle}>Mina annonser</p>
                      <p className={styles.heading3}>2 aktiva</p>
                    </div>
                    <button className={styles.linkButton}>Skapa ny</button>
                  </div>
                  <div className={styles.userAds}>
                    {listings.slice(0, 3).map((item) => (
                      <div key={item.title} className={styles.userAdCard}>
                        <div className={styles.userAdThumb}>
                          <Image src={item.images[0]} alt={item.title} fill sizes="120px" />
                        </div>
                        <div className={styles.userAdBody}>
                          <p className={styles.listTitle}>{item.title}</p>
                          <p className={styles.listPrice}>{item.price}</p>
                          <p className={styles.listMetaMuted}>142 visningar • 6 favoriter</p>
                        </div>
                        <button className={styles.quickAction}>Hantera</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.dashboardCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.overtitle}>Fria annonsmånader</p>
                      <p className={styles.heading3}>{freeMonthsLeft} kvar</p>
                    </div>
                    <button className={styles.primaryButton}>Dela och få fler</button>
                  </div>
                  <p className={styles.body}>
                    Dela Selj i sociala medier för att låsa upp gratis annonser (värde 19 kr/st).
                    Ditt saldo dras automatiskt när du publicerar.
                  </p>
                  <div className={styles.statBar}>
                    <span style={{ width: `${Math.min(100, freeMonthsLeft * 20)}%` }} />
                  </div>
                  <div className={styles.metricList}>
                    <div>
                      <p className={styles.micro}>Så funkar det</p>
                      <p className={styles.body}>Dela unik länk → +1 månad per 5 klick.</p>
                    </div>
                    <div>
                      <p className={styles.micro}>Saldo auto-dragning</p>
                      <p className={styles.body}>Kvarstående saldo används före debitering.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.dashboardCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.overtitle}>Snabbgenvägar</p>
                      <p className={styles.heading3}>Jobba vidare</p>
                    </div>
                  </div>
                  <div className={styles.quickGrid}>
                    <button className={styles.quickAction}>Skapa ny annons</button>
                    <button className={styles.quickAction}>Hitta meddelanden</button>
                    <button className={styles.quickAction}>Se favoriter</button>
                    <button className={styles.quickAction}>Öppna statistik</button>
                  </div>
                </div>
              </>
            )}
            {activePanel === "messages" && (
              <div className={styles.dashboardCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.overtitle}>Meddelanden</p>
                    <p className={styles.heading3}>3 trådar</p>
                  </div>
                  <button className={styles.linkButton}>Visa alla</button>
                </div>
                <div className={styles.messagesShell}>
                  <div className={styles.threadList}>
                    {["Volvo V70 2016", "MacBook Air 13", "Soffa 3-sits"].map((t, idx) => (
                      <button
                        key={t}
                        className={`${styles.threadItem} ${idx === 0 ? styles.threadActive : ""}`}
                      >
                        <div className={styles.threadTitle}>{t}</div>
                        <div className={styles.threadMeta}>2 nya · 11:42</div>
                      </button>
                    ))}
                  </div>
                  <div className={styles.chatWindow}>
                    <div className={styles.chatHeader}>
                      <div>
                        <p className={styles.listTitle}>Volvo V70 2016</p>
                        <p className={styles.listMetaMuted}>Köpare · 11:40</p>
                      </div>
                      <span className={styles.statusDot}>● Aktiv</span>
                    </div>
                    <div className={styles.chatBubbles}>
                      <div className={`${styles.bubble} ${styles.bubbleIncoming}`}>
                        <p>Hej! Finns bilen kvar?</p>
                        <span className={styles.bubbleMeta}>11:41</span>
                      </div>
                      <div className={`${styles.bubble} ${styles.bubbleOutgoing}`}>
                        <p>Ja, den finns kvar. Vill du boka visning i helgen?</p>
                        <span className={styles.bubbleMeta}>11:42</span>
                      </div>
                      <div className={`${styles.bubble} ${styles.bubbleIncoming}`}>
                        <p>Perfekt. Kan du skicka fler bilder på interiören?</p>
                        <span className={styles.bubbleMeta}>11:43</span>
                      </div>
                    </div>
                    <div className={styles.chatInputRow}>
                      <div className={styles.attachButtons}>
                        <button className={styles.attachButton} aria-label="Öppna kamera">
                          📷
                        </button>
                        <button className={styles.attachButton} aria-label="Ladda upp fil">
                          📎
                        </button>
                      </div>
                      <input className={styles.chatInput} placeholder="Skriv ett meddelande..." />
                      <button className={styles.sendButton}>Skicka</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activePanel === "new" && (
              <div className={styles.dashboardCard}>
                <p className={styles.overtitle}>Ny annons (stub)</p>
                <p className={styles.body}>Här kommer skapa-annons-formen när vi kopplar på.</p>
              </div>
            )}
            {activePanel === "favorites" && (
              <div className={styles.dashboardCard}>
                <p className={styles.overtitle}>Favoriter</p>
                <ul className={styles.listSimple}>
                  <li>Volvo V70 2016</li>
                  <li>Elcykel pendling</li>
                  <li>PlayStation 5</li>
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {isLoggedIn && (
        <nav className={styles.mobileNav}>
          <button
            className={activePanel === "dashboard" ? styles.navActive : ""}
            onClick={() => setActivePanel("dashboard")}
          >
            Mina sidor
          </button>
          <button
            className={activePanel === "messages" ? styles.navActive : ""}
            onClick={() => setActivePanel("messages")}
          >
            Meddelanden
          </button>
          <button
            className={activePanel === "new" ? styles.navActive : ""}
            onClick={() => setActivePanel("new")}
          >
            Ny annons
          </button>
          <button
            className={activePanel === "favorites" ? styles.navActive : ""}
            onClick={() => setActivePanel("favorites")}
          >
            Favoriter
          </button>
          <button
            className={activePanel === "browse" ? styles.navActive : ""}
            onClick={() => setActivePanel("browse")}
          >
            Sök
          </button>
        </nav>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <div className={styles.brand}>
              <span className={styles.dot} />
              <span>selj</span>
            </div>
            <p className={styles.body}>
              Selj är marknadsplatsen för snabba affärer på mobil och desktop. Fokus
              på rapp sök, stabil scroll och trygg kommunikation mellan köpare och säljare.
            </p>
            <div className={styles.footerMeta}>
              <span>Org.nr 5599-123456</span>
              <span>Stockholm, Sverige</span>
            </div>
          </div>
          <div className={styles.footerCol}>
            <h4>Produkt</h4>
            <a href="#">Sök annonser</a>
            <a href="#">Lägg upp annons</a>
            <a href="#">Kategorier</a>
            <a href="#">Säljes / Köpes</a>
          </div>
          <div className={styles.footerCol}>
            <h4>Support</h4>
            <a href="#">Hjälpcenter</a>
            <a href="#">Rapportera annons</a>
            <a href="#">Säkerhet & bedrägerier</a>
            <a href="#">Cookie- och integritetspolicy</a>
          </div>
          <div className={styles.footerCol}>
            <h4>Kontakt</h4>
            <a href="mailto:hej@selj.se">hej@selj.se</a>
            <a href="tel:+46812345678">+46 (0)8 12 34 56 78</a>
            <a href="#">Press & media</a>
            <a href="#">Jobb</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Selj</span>
          <span>Byggd för hög trafik med edge-cache och typo-tolerant sök.</span>
        </div>
      </footer>
    </div>
  );
}
