"use client";

import styles from "./page.module.css";
import { ThemeToggle } from "../components/theme-toggle";
import { useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";

type FilterOption =
  | { type: "select"; label: string; options: string[] }
  | { type: "range"; label: string; min: string; max: string; placeholder?: string }
  | { type: "chip"; label: string; options: string[] };

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

const categories: Array<{
  value: string;
  label: string;
  filters: FilterOption[];
}> = [
  {
    value: "fordon",
    label: "Fordon",
    filters: [
      { type: "select", label: "Underkategori", options: ["Bilar", "MC", "Båt"] },
      { type: "range", label: "Årsmodell", min: "2000", max: "2024" },
      { type: "range", label: "Miltal", min: "0", max: "30 000" },
      { type: "select", label: "Drivmedel", options: ["Bensin", "Diesel", "Hybrid", "El"] },
      { type: "select", label: "Växellåda", options: ["Manuell", "Automat"] },
    ],
  },
  {
    value: "elektronik",
    label: "Elektronik",
    filters: [
      { type: "select", label: "Typ", options: ["Laptop", "Mobil", "TV", "Spelkonsol"] },
      { type: "select", label: "Skick", options: ["Nyskick", "Bra", "Använt"] },
      { type: "range", label: "Pris", min: "500", max: "30 000" },
    ],
  },
  {
    value: "hem",
    label: "Hem & möbler",
    filters: [
      { type: "select", label: "Typ", options: ["Soffor", "Bord", "Stolar", "Säng"] },
      { type: "select", label: "Material", options: ["Trä", "Tyg", "Läder"] },
      { type: "range", label: "Pris", min: "200", max: "20 000" },
    ],
  },
];

const sampleListings = [
  {
    title: "Volvo V70 2016",
    price: "160 000 kr",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=800&q=80",
    meta: "Bil • Automat • 15 000 mil",
    date: "12 dec",
    seller: "Privat",
  },
  {
    title: "MacBook Air 13",
    price: "8 500 kr",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    meta: "Laptop • M2 • 2022",
    date: "10 dec",
    seller: "Privat",
  },
  {
    title: "Matbord med stolar",
    price: "1 200 kr",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
    meta: "4 stolar • Trä",
    date: "8 dec",
    seller: "Företag",
  },
  {
    title: "Mountainbike",
    price: "3 800 kr",
    image:
      "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80",
    meta: "M • 27 växlar",
    date: "7 dec",
    seller: "Privat",
  },
  {
    title: "iPhone 14 Pro 256GB",
    price: "9 500 kr",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
    meta: "Lila • Olåst",
    date: "6 dec",
    seller: "Privat",
  },
  {
    title: "Soffa 3-sits",
    price: "4 500 kr",
    image:
      "https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=800&q=80",
    meta: "Grå • 2 år",
    date: "6 dec",
    seller: "Företag",
  },
  {
    title: "Barnvagn duo",
    price: "2 700 kr",
    image:
      "https://images.unsplash.com/photo-1523419400524-2230b6a006aa?auto=format&fit=crop&w=800&q=80",
    meta: "Inkl liggdel",
    date: "5 dec",
    seller: "Privat",
  },
  {
    title: "Fender Telecaster",
    price: "6 500 kr",
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80",
    meta: "Elgitarr • Case ingår",
    date: "5 dec",
    seller: "Privat",
  },
  {
    title: "PlayStation 5",
    price: "5 200 kr",
    image:
      "https://images.unsplash.com/photo-1606813902915-4b5b4c00cafd?auto=format&fit=crop&w=800&q=80",
    meta: "2 kontroller",
    date: "4 dec",
    seller: "Företag",
  },
  {
    title: "Kajak",
    price: "7 200 kr",
    image:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
    meta: "Enmans • Glasfiber",
    date: "3 dec",
    seller: "Privat",
  },
  {
    title: "Trädgårdsbord",
    price: "900 kr",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
    meta: "Utomhus • 4 sittplatser",
    date: "3 dec",
    seller: "Privat",
  },
  {
    title: "Gräsklippare Husqvarna",
    price: "3 400 kr",
    image:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80",
    meta: "Bensindriven",
    date: "2 dec",
    seller: "Företag",
  },
  {
    title: "Vinterdäck 17\"",
    price: "2 500 kr",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=800&q=80",
    meta: "På fälg • 7 mm",
    date: "2 dec",
    seller: "Privat",
  },
  {
    title: "Köksmaskin",
    price: "1 800 kr",
    image:
      "https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=800&q=80",
    meta: "Rostfri • 1000W",
    date: "1 dec",
    seller: "Privat",
  },
  {
    title: "Canon EOS R",
    price: "7 800 kr",
    image:
      "https://images.unsplash.com/photo-1519183071298-a2962be90b8e?auto=format&fit=crop&w=800&q=80",
    meta: "Fullformat • 24-105mm",
    date: "1 dec",
    seller: "Privat",
  },
  {
    title: "Kontorsstol ergonomisk",
    price: "1 200 kr",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
    meta: "Justerbar • Nackstöd",
    date: "30 nov",
    seller: "Företag",
  },
  {
    title: "Elcykel pendling",
    price: "14 500 kr",
    image:
      "https://images.unsplash.com/photo-1541625810712-95d527544570?auto=format&fit=crop&w=800&q=80",
    meta: "60 km räckvidd",
    date: "29 nov",
    seller: "Privat",
  },
  {
    title: "Vespa Primavera",
    price: "17 000 kr",
    image:
      "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?auto=format&fit=crop&w=800&q=80",
    meta: "125cc • 2019",
    date: "28 nov",
    seller: "Företag",
  },
  {
    title: "Flytthjälp timpris",
    price: "Offert",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80",
    meta: "Stockholm • Företag",
    date: "27 nov",
    seller: "Företag",
  },
  {
    title: "Barnsäng 90 cm",
    price: "900 kr",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
    meta: "Trä • Inkl madrass",
    date: "26 nov",
    seller: "Privat",
  },
];

export default function Home() {
  const [saleType, setSaleType] = useState<"saljes" | "kopes">("saljes");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
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
  });

  const updateField =
    (key: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const showPreview = useMemo(
    () => Object.values(form).some((v) => v.trim().length > 0),
    [form]
  );
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [selectedListing, setSelectedListing] = useState<(typeof sampleListings)[number] | null>(
    null
  );

  const resetCounty = () => setSelectedCounty("");
  const selectListing = (item: (typeof sampleListings)[number]) => {
    setSelectedListing(item);
    setShowReply(false);
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
          />
          <select
            className={styles.categorySelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Alla kategorier</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <span className={styles.searchIcon}>🔍</span>
        </div>
        <div className={styles.topActions}>
          <button className={styles.linkButton}>Logga in</button>
          <button className={styles.linkButton}>Meny</button>
          <ThemeToggle />
        </div>
      </header>

      {selectedCounty ? (
        <section className={`${styles.card} ${styles.listView}`}>
          <div className={styles.listHeaderRow}>
            <div>
              <p className={styles.overtitle}>Valt län</p>
              <h2 className={styles.heading2}>{selectedCounty}</h2>
              <p className={styles.body}>
                20 exempelannonser. Senaste överst när vi kopplar på riktiga data.
              </p>
            </div>
            <div className={styles.listActions}>
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
            </div>
          </div>

          {selectedCategory && (
            <div className={styles.filterBar}>
              <div className={styles.filterChips}>
                {categories
                  .find((cat) => cat.value === selectedCategory)
                  ?.filters.map((filter) => {
                    if (filter.type === "select") {
                      return (
                        <div key={filter.label} className={styles.filterField}>
                          <label>{filter.label}</label>
                          <select>
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
                      return (
                        <div key={filter.label} className={styles.filterField}>
                          <label>{filter.label}</label>
                          <div className={styles.rangeFields}>
                            <input placeholder={filter.min} />
                            <span>–</span>
                            <input placeholder={filter.max} />
                          </div>
                        </div>
                      );
                    }
                    if (filter.type === "chip") {
                      return (
                        <div key={filter.label} className={styles.filterField}>
                          <label>{filter.label}</label>
                          <div className={styles.chipRow}>
                            {filter.options.map((opt) => (
                              <button key={opt} className={styles.chipButton}>
                                {opt}
                              </button>
                            ))}
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
              {sampleListings.map((item) => (
                <article
                  key={item.title}
                  className={styles.listCard}
                  onClick={() => selectListing(item)}
                >
                  <div className={styles.listThumb}>
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </div>
                  <div className={styles.listCardBody}>
                    <p className={styles.listTitle}>{item.title}</p>
                    <p className={styles.listPrice}>{item.price}</p>
                    <p className={styles.listMeta}>
                      {selectedCounty} • {item.meta}
                      {saleType === "kopes" ? " • Köpes" : ""}
                    </p>
                    <p className={styles.listMetaMuted}>
                      {item.date} • {item.seller}
                    </p>
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
              {sampleListings.map((item) => (
                <article
                  key={item.title}
                  className={styles.listRow}
                  onClick={() => selectListing(item)}
                >
                  <div className={styles.listRowThumb}>
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="160px"
                    />
                  </div>
                  <div className={styles.listRowBody}>
                    <p className={styles.listTitle}>{item.title}</p>
                    <p className={styles.listPrice}>{item.price}</p>
                    <p className={styles.listMeta}>
                      {selectedCounty} • {item.meta}
                      {saleType === "kopes" ? " • Köpes" : ""}
                    </p>
                    <p className={styles.listMetaMuted}>
                      {item.date} • {item.seller}
                    </p>
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
                  onClick={() => setSelectedCounty(county)}
                >
                  {county}
                </button>
              ))}
            </div>
          </section>
        </main>
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

      {selectedListing && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.overtitle}>{selectedCounty || "Län"}</p>
                <h3 className={styles.heading3}>{selectedListing.title}</h3>
                <p className={styles.listMeta}>
                  {selectedListing.meta} • {selectedListing.date} • {selectedListing.seller}
                  {saleType === "kopes" ? " • Köpes" : ""}
                </p>
              </div>
              <div className={styles.modalHeaderActions}>
                <button
                  className={`${styles.favButton} ${waitlist.has(selectedListing.title) ? styles.favButtonActive : ""}`}
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
                  Stäng
                </button>
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalThumb}>
                <Image
                  src={selectedListing.image}
                  alt={selectedListing.title}
                  fill
                  sizes="(max-width: 700px) 100vw, 50vw"
                />
              </div>
              <div className={styles.modalContent}>
                <p className={styles.body}>
                  Exempeldescription: Här kan vi visa attribut, kontaktinfo och snabb-knappar för
                  meddelande. I riktiga vyn kommer schema-specifika fält in här.
                </p>
                <p className={styles.listPrice}>{selectedListing.price}</p>
              </div>
            </div>
            <div className={styles.modalActions}>
              {!showReply && (
                <button className={styles.primaryButton} onClick={() => setShowReply(true)}>
                  Kontakta säljare
                </button>
              )}
            </div>

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

            <div className={styles.sellerStrip}>
              {selectedListing.seller === "Företag" ? (
                <>
                  <p className={styles.overtitle}>Säljare</p>
                  <p className={styles.listTitle}>Exempelbolaget AB</p>
                  <p className={styles.listMeta}>Betyg: 4.6/5</p>
                  <p className={styles.listMeta}>Hemsida: exempelbolaget.se</p>
                  <p className={styles.listMeta}>Telefon: 08-123 45 67</p>
                  <p className={styles.listMeta}>Adress: Sveavägen 12, Stockholm</p>
                </>
              ) : (
                <>
                  <p className={styles.overtitle}>Säljare</p>
                  <p className={styles.listTitle}>Alex, privat</p>
                  <p className={styles.listMeta}>Medlem sedan 2021</p>
                  <p className={styles.listMeta}>Betyg: 4.8/5</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
