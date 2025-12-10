"use client";

import styles from "./admin.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Category, FilterOption, Listing } from "../../lib/types";
import { counties } from "../../lib/countyList";
import { placeholderImage } from "../../lib/placeholders";

type FilterDraft = {
  id: string;
  label: string;
  type: FilterOption["type"];
  ui?: FilterOption["ui"];
  required: boolean;
  min?: string;
  max?: string;
  options?: string[];
};

const createDraftId = () => Math.random().toString(36).slice(2);
const slugifyLabel = (label: string) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u00c0-\u017f\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const filterToDraft = (filter: FilterOption): FilterDraft => {
  if (filter.type === "range") {
    return {
      id: createDraftId(),
      label: filter.label,
      type: "range",
      min: filter.min,
      max: filter.max,
      ui: filter.ui ?? "number",
      required: Boolean(filter.required),
    };
  }
  return {
    id: createDraftId(),
    label: filter.label,
    type: filter.type,
    options: filter.options,
    ui: filter.ui,
    required: Boolean(filter.required),
  };
};

const draftToFilter = (draft: FilterDraft): FilterOption | null => {
  const label = draft.label.trim();
  if (!label) return null;
  if (draft.type === "range") {
    if (!draft.min || !draft.max) return null;
    const ui: FilterOption["ui"] = draft.ui === "slider" ? "slider" : "number";
    return {
      type: "range",
      label,
      min: draft.min,
      max: draft.max,
      ui,
      required: draft.required,
    };
  }
  const options = (draft.options || []).map((o) => o.trim()).filter(Boolean);
  if (options.length === 0) return null;
  if (draft.type === "select") {
    return { type: "select", label, options, required: draft.required, ui: "dropdown" };
  }
  return { type: "chip", label, options, required: draft.required, ui: "chip" };
};

export default function AdminPage() {
  const [tab, setTab] = useState<
    "dashboard" | "moderation" | "categories" | "blocked" | "rules" | "create"
  >("dashboard");
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [categoryForm, setCategoryForm] = useState({ value: "", label: "", parentValue: "" });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [createDrafts, setCreateDrafts] = useState<FilterDraft[]>([]);
  const [searchDrafts, setSearchDrafts] = useState<FilterDraft[]>([]);
  const [categoryErrors, setCategoryErrors] = useState<string[]>([]);
  const [categorySuccess, setCategorySuccess] = useState<string>("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const filterPresets: { label: string; hint: string; draft: Partial<FilterDraft> }[] = [
    {
      label: "Underkategori (dropdown)",
      hint: "Väljbar lista, t.ex. Bilar/MC/Båt",
      draft: {
        type: "select",
        label: "Underkategori",
        options: ["Bilar", "MC", "Båt"],
        ui: "dropdown",
        required: true,
      },
    },
    {
      label: "Pris (slider)",
      hint: "Slider med min/max",
      draft: { type: "range", label: "Pris", min: "0", max: "100000", ui: "slider" },
    },
    {
      label: "Miltal (manuell)",
      hint: "Två nummerfält, bra för miltal",
      draft: { type: "range", label: "Miltal", min: "0", max: "30000", ui: "number" },
    },
    {
      label: "Taggar (chips)",
      hint: "Snabbval / toggles",
      draft: { type: "chip", label: "Typ", options: ["Alternativ 1", "Alternativ 2"], ui: "chip" },
    },
  ];

  const fetchCategories = useCallback(async () => {
    const cats = await fetch("/api/categories").then((r) => r.json());
    setCategories(cats);
    return cats as Category[];
  }, []);

  const resetCategoryForm = useCallback(() => {
    setEditingCategory(null);
    setCategoryForm({ value: "", label: "", parentValue: "" });
    setCreateDrafts([]);
    setSearchDrafts([]);
    setCategoryErrors([]);
    setCategorySuccess("");
  }, []);

  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat.value);
    setCategoryForm({ value: cat.value, label: cat.label, parentValue: cat.parentValue || "" });
    const createFields = cat.createFields ?? cat.filters ?? [];
    const searchFilters = cat.searchFilters ?? cat.filters ?? [];
    setCreateDrafts(createFields.map(filterToDraft));
    setSearchDrafts(searchFilters.map(filterToDraft));
    setCategoryErrors([]);
    setCategorySuccess("");
    setShowCategoryForm(true);
  };

  const getDraftState = (kind: "create" | "search") =>
    kind === "create"
      ? [createDrafts, setCreateDrafts] as const
      : [searchDrafts, setSearchDrafts] as const;

  const addFilterDraft = (kind: "create" | "search", draft?: Partial<FilterDraft>) => {
    const [, setDrafts] = getDraftState(kind);
    setDrafts((prev) => [
      ...prev,
      {
        id: createDraftId(),
        label: draft?.label ?? "",
        type: draft?.type ?? "select",
        ui:
          draft?.ui ??
          (draft?.type === "chip"
            ? "chip"
            : draft?.type === "range"
            ? "slider"
            : "dropdown"),
        min: draft?.min,
        max: draft?.max,
        options:
          draft?.options ??
          (draft?.type === "range" ? undefined : ["Alternativ 1", "Alternativ 2"]),
        required: draft?.required ?? false,
      },
    ]);
  };

  const updateFilterDraft = (kind: "create" | "search", id: string, patch: Partial<FilterDraft>) => {
    const [, setDrafts] = getDraftState(kind);
    setDrafts((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const next: FilterDraft = { ...f, ...patch };
        if (patch.type && patch.type !== f.type) {
          if (patch.type === "range") {
            next.min = next.min ?? "0";
            next.max = next.max ?? "100";
            next.options = undefined;
            next.ui = patch.ui === "slider" ? "slider" : "number";
          } else {
            next.min = undefined;
            next.max = undefined;
            next.options = patch.options ?? f.options ?? ["Alternativ 1", "Alternativ 2"];
            next.ui = patch.type === "chip" ? "chip" : "dropdown";
          }
        }
        return next;
      })
    );
  };

  const removeFilterDraft = (kind: "create" | "search", id: string) => {
    const [, setDrafts] = getDraftState(kind);
    setDrafts((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFilterOptions = (kind: "create" | "search", id: string, value: string) => {
    const options = value
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    updateFilterDraft(kind, id, { options });
  };

  const copyCreateToSearch = () => {
    setSearchDrafts(createDrafts.map((d) => ({ ...d, id: createDraftId() })));
  };
  const [newListing, setNewListing] = useState({
    title: "",
    price: "",
    category: "",
    meta: "",
                      image: "",
    seller: "Privat",
    sellerName: "",
    sellerPhone: "",
    sellerEmail: "",
    sellerWebsite: "",
    county: "",
    city: "",
  });

  const stats = useMemo(() => {
    const totalListings = listings.length;
    const pending = listings.filter((l) => (l.status ?? "active") === "pending").length;
    const todayListings = 12;
    const monthListings = 320;
    const newUsersToday = 18;
    const newUsersMonth = 540;
    const totalUsers = 12800;
    const revenueToday = 19 * 8; // dummy: 8 betal-annonser idag
    const revenueMonth = 19 * 120; // dummy
    return {
      totalListings,
      pending,
      todayListings,
      monthListings,
      newUsersToday,
      newUsersMonth,
      totalUsers,
      revenueToday,
      revenueMonth,
    };
  }, []);

  const pendingListings = useMemo(
    () => listings.filter((item) => (item.status ?? "active") === "pending"),
    [listings]
  );

  const categoryLabelLookup = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.value, c.label])),
    [categories]
  );
  const topCategories = useMemo(() => categories.filter((c) => !c.parentValue), [categories]);
  const childrenByParent = useMemo(() => {
    const map: Record<string, Category[]> = {};
    categories.forEach((c) => {
      if (!c.parentValue) return;
      if (!map[c.parentValue]) map[c.parentValue] = [];
      map[c.parentValue].push(c);
    });
    return map;
  }, [categories]);
  const flattenedCategoryOptions = useMemo(() => {
    const ordered: Category[] = [];
    topCategories.forEach((cat) => {
      ordered.push(cat);
      const children = childrenByParent[cat.value];
      if (children) {
        children.forEach((child) => ordered.push(child));
      }
    });
    return ordered;
  }, [childrenByParent, topCategories]);

  useEffect(() => {
    const load = async () => {
      const [cats, lst] = await Promise.all([fetchCategories(), fetch("/api/listings").then((r) => r.json())]);
      setListings(lst);
    };
    load();
  }, [fetchCategories]);
  const updateStatus = (id: string, status: Listing["status"]) => {
    fetch("/api/listings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).then(() => {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    });
  };

  const approveAll = () => {
    const pendingIds = listings.filter((l) => (l.status ?? "active") === "pending").map((l) => l.id);
    pendingIds.forEach((id) => updateStatus(id, "active"));
  };

  const onCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!newListing.title.trim() || newListing.title.trim().length < 3) {
      errors.push("Titel måste vara minst 3 tecken");
    }
    const priceNumber = Number(newListing.price);
    if (!newListing.price.trim() || Number.isNaN(priceNumber) || priceNumber <= 0) {
      errors.push("Pris måste vara > 0");
    }
    const countyValid = newListing.county.trim().length > 0;
    if (!countyValid) errors.push("Välj ett län");
    const phoneDigits = (newListing.sellerPhone.match(/\d/g) || []).length;
    if (newListing.sellerPhone && phoneDigits < 7) {
      errors.push("Telefon måste ha minst 7 siffror");
    }
    if (newListing.sellerEmail) {
      const at = newListing.sellerEmail.indexOf("@");
      const dot = newListing.sellerEmail.lastIndexOf(".");
      if (at === -1 || dot === -1 || dot < at + 2) {
        errors.push("Ogiltig e-post");
      }
    }
    const selectedFilters =
      categories.find((c) => c.value === newListing.category)?.createFields ??
      categories.find((c) => c.value === newListing.category)?.filters ??
      [];
    selectedFilters.forEach((f) => {
      if (f.required) {
        if (f.type === "range") {
          const min = attrValues[`${f.label}-min`] || attrValues[f.label];
          const max = attrValues[`${f.label}-max`];
          if (!min && !max) errors.push(`${f.label} saknas`);
        } else if (!attrValues[f.label]) {
          errors.push(`${f.label} saknas`);
        }
      }
    });
    if (errors.length) {
      setCreateErrors(errors);
      return;
    }
    setCreateErrors([]);
    fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      title: newListing.title,
      price: `${newListing.price} kr`,
      priceValue: priceNumber || null,
      category: newListing.category || undefined,
      description: newListing.meta,
      meta: newListing.meta,
      images: newListing.image ? [newListing.image] : [placeholderImage],
      seller: newListing.seller as Listing["seller"],
        sellerName: newListing.sellerName,
      sellerPhone: newListing.sellerPhone,
      sellerEmail: newListing.sellerEmail,
      sellerWebsite: newListing.sellerWebsite,
      county: newListing.county,
      city: newListing.city,
      status: "pending",
      attributes: attrValues,
    }),
    }).then(async () => {
      const refreshed = await fetch("/api/listings").then((r) => r.json());
      setListings(refreshed);
    });
    setNewListing({
      title: "",
      price: "",
      category: "",
      meta: "",
      image: "",
      seller: "Privat",
      sellerName: "",
      sellerPhone: "",
      sellerEmail: "",
      sellerWebsite: "",
      county: "",
      city: "",
    });
    setAttrValues({});
    setTab("moderation");
  };

  const onSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    const label = categoryForm.label.trim();
    const parentValue = categoryForm.parentValue.trim();
    const value = editingCategory || slugifyLabel(label);
    const activeCreate = createDrafts.filter((draft) => {
      const hasOptions = (draft.options?.length ?? 0) > 0;
      return draft.label.trim().length > 0 || hasOptions || draft.min || draft.max;
    });
    const activeSearch = searchDrafts.filter((draft) => {
      const hasOptions = (draft.options?.length ?? 0) > 0;
      return draft.label.trim().length > 0 || hasOptions || draft.min || draft.max;
    });
    if (!label) errors.push("Kategorinamn krävs");
    if (!value) errors.push("Kunde inte skapa slug från namnet");
    if (parentValue && parentValue === value) errors.push("Förälder kan inte vara samma som slug");
    activeCreate.forEach((draft, idx) => {
      const labelText = draft.label.trim() || `Filter ${idx + 1}`;
      if (!draft.label.trim()) {
        errors.push(`${labelText}: lägg till label (visas i UI)`);
      }
      if (draft.type === "range") {
        if (!draft.min || !draft.max) {
          errors.push(`${labelText}: min och max krävs för slider/nummer`);
        }
      } else if (!draft.options || draft.options.length === 0) {
        errors.push(`${labelText}: lägg till alternativ (kommaseparerat)`);
      }
    });
    activeSearch.forEach((draft, idx) => {
      const labelText = draft.label.trim() || `Sökfilter ${idx + 1}`;
      if (!draft.label.trim()) {
        errors.push(`${labelText}: lägg till label`);
      }
      if (draft.type === "range") {
        if (!draft.min || !draft.max) {
          errors.push(`${labelText}: min och max krävs för slider/nummer`);
        }
      } else if (!draft.options || draft.options.length === 0) {
        errors.push(`${labelText}: lägg till alternativ (kommaseparerat)`);
      }
    });
    if (errors.length) {
      setCategoryErrors(errors);
      setCategorySuccess("");
      return;
    }
    const createFields = activeCreate.map(draftToFilter).filter((f): f is FilterOption => Boolean(f));
    const searchFilters = activeSearch.map(draftToFilter).filter((f): f is FilterOption => Boolean(f));
    setCategoryErrors([]);
    setIsSavingCategory(true);
    setCategorySuccess("");
    try {
      const res = await fetch("/api/categories", {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value,
          label,
          createFields,
          searchFilters,
          parentValue: parentValue || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryErrors(data.errors ?? ["Kunde inte spara kategori"]);
        return;
      }
      await fetchCategories();
      setCategorySuccess(editingCategory ? "Kategori uppdaterad" : "Kategori sparad");
      setCategoryErrors([]);
      setEditingCategory(value);
      setCategoryForm({
        value,
        label,
        parentValue,
      });
      if (data.createFields) {
        setCreateDrafts(data.createFields.map(filterToDraft));
      }
      if (data.searchFilters) {
        setSearchDrafts(data.searchFilters.map(filterToDraft));
      }
    } catch (err) {
      setCategoryErrors(["Tekniskt fel vid sparande av kategori"]);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const onDeleteCategory = async (value: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Ta bort kategorin? Annonser behåller sitt value.");
      if (!confirmed) return;
    }
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryErrors(data.errors ?? ["Kunde inte ta bort kategori"]);
        return;
      }
      await fetchCategories();
      if (editingCategory === value) {
        resetCategoryForm();
      }
      setNewListing((prev) => (prev.category === value ? { ...prev, category: "" } : prev));
      setCategorySuccess("Kategori borttagen");
    } catch (err) {
      setCategoryErrors(["Tekniskt fel vid borttagning av kategori"]);
    }
  };

  const startSubcategory = (parent: Category) => {
    setEditingCategory(null);
    setCategoryForm({ value: "", label: "", parentValue: parent.value });
    const createFields = parent.createFields ?? parent.filters ?? [];
    const searchFilters = parent.searchFilters ?? parent.filters ?? [];
    setCreateDrafts(createFields.map(filterToDraft));
    setSearchDrafts(searchFilters.map(filterToDraft));
    setCategoryErrors([]);
    setCategorySuccess("");
    setShowCategoryForm(true);
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>selj admin</div>
        <nav className={styles.nav}>
          <button
            className={`${styles.navItem} ${tab === "dashboard" ? styles.navItemActive : ""}`}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`${styles.navItem} ${tab === "create" ? styles.navItemActive : ""}`}
            onClick={() => setTab("create")}
          >
            Skapa annons
          </button>
          <button
            className={`${styles.navItem} ${tab === "moderation" ? styles.navItemActive : ""}`}
            onClick={() => setTab("moderation")}
          >
            Granska
          </button>
          <button
            className={`${styles.navItem} ${tab === "categories" ? styles.navItemActive : ""}`}
            onClick={() => setTab("categories")}
          >
            Kategorier & filter
          </button>
          <button
            className={`${styles.navItem} ${tab === "blocked" ? styles.navItemActive : ""}`}
            onClick={() => setTab("blocked")}
          >
            Blockerade konton
          </button>
          <button
            className={`${styles.navItem} ${tab === "rules" ? styles.navItemActive : ""}`}
            onClick={() => setTab("rules")}
          >
            Annonsregler
          </button>
        </nav>
      </aside>

      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.overtitle}>Admin</p>
            <h1 className={styles.heading}>Moderera och konfigurera</h1>
            <p className={styles.body}>
              Pending annonser, kategorier och filter. Byggt som modul i samma app men förberett att
              kunna flyttas ut.
            </p>
          </div>
          <div className={styles.actions}>
            <a className={styles.adminToggle} href="/">
              Till webbvyn
            </a>
            <div className={styles.badge}>Roll: admin</div>
          </div>
        </header>

        {tab === "dashboard" && (
          <>
            <section className={styles.cardsGrid}>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Annonser idag</p>
                <p className={styles.statNumber}>{stats.todayListings}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Annonser denna månad</p>
                <p className={styles.statNumber}>{stats.monthListings}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Nya användare idag</p>
                <p className={styles.statNumber}>{stats.newUsersToday}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Nya användare denna månad</p>
                <p className={styles.statNumber}>{stats.newUsersMonth}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Användare totalt</p>
                <p className={styles.statNumber}>{stats.totalUsers}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Annonser totalt</p>
                <p className={styles.statNumber}>{stats.totalListings}</p>
              </div>
              <div className={styles.statCardAccent}>
                <p className={styles.statLabel}>Intjänat idag</p>
                <p className={styles.statNumber}>{stats.revenueToday} kr</p>
              </div>
              <div className={styles.statCardAccent}>
                <p className={styles.statLabel}>Intjänat denna månad</p>
                <p className={styles.statNumber}>{stats.revenueMonth} kr</p>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.overtitle}>Snabbstatus</p>
                  <h2 className={styles.subheading}>{stats.pending} pending just nu</h2>
                </div>
                <button className={styles.primary}>Öppna granska</button>
              </div>
              <p className={styles.body}>
                Håll koll på pendingannonser, kategorier och kommande uppdelning av admin till egen
                app. Den här ytan kan byggas ut med fler grafer när vi kopplar riktiga data.
              </p>
            </section>
          </>
        )}

        {tab === "create" && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.overtitle}>Skapa annons</p>
                <h2 className={styles.subheading}>Lägg till annons från admin</h2>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.ghost}
                  onClick={() => {
                    const sampleCategory = categories[0]?.value || "";
                    setNewListing({
                      title: "Testannons 123",
                      price: "9900",
                      category: sampleCategory,
                      meta: "Automat • 10 000 mil",
                      image: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=800&q=80",
                      seller: "Privat",
                      sellerName: "Test Testsson",
                      sellerPhone: "0701234567",
                      sellerEmail: "test@example.com",
                      sellerWebsite: "https://example.com",
                      county: counties[0] || "",
                      city: "Stockholm",
                    });
                    setAttrValues({});
                    setCreateErrors([]);
                  }}
                >
                  Fyll i testdata
                </button>
                <span className={styles.meta}>
                  Fält bör spegla kategoriregler (kopplas när backend kommer).
                </span>
              </div>
            </div>
            <form className={styles.formGrid} onSubmit={onCreateListing}>
              {createErrors.length > 0 && (
                <div className={styles.errorBox}>
                  {createErrors.map((err) => (
                    <p key={err}>{err}</p>
                  ))}
                </div>
              )}
              <label className={styles.field}>
                <span>Titel</span>
                <input
                  value={newListing.title}
                  onChange={(e) => setNewListing((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex. Volvo V70 2016"
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Ort</span>
                <input
                  value={newListing.city}
                  onChange={(e) => setNewListing((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Stockholm"
                />
              </label>
              <label className={styles.field}>
                <span>Län</span>
                <select
                  value={newListing.county}
                  onChange={(e) => setNewListing((p) => ({ ...p, county: e.target.value }))}
                >
                  <option value="">Välj län</option>
                  {counties.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Säljarnamn / Företag</span>
                <input
                  value={newListing.sellerName}
                  onChange={(e) => setNewListing((p) => ({ ...p, sellerName: e.target.value }))}
                  placeholder="Exempelbolaget AB"
                />
              </label>
              <label className={styles.field}>
                <span>Telefon</span>
                <input
                  value={newListing.sellerPhone}
                  onChange={(e) => setNewListing((p) => ({ ...p, sellerPhone: e.target.value }))}
                  placeholder="08-123 45 67"
                />
              </label>
              <label className={styles.field}>
                <span>E-post</span>
                <input
                  value={newListing.sellerEmail}
                  onChange={(e) => setNewListing((p) => ({ ...p, sellerEmail: e.target.value }))}
                  placeholder="kontakt@exempel.se"
                />
              </label>
              <label className={styles.field}>
                <span>Webbplats (företag)</span>
                <input
                  value={newListing.sellerWebsite}
                  onChange={(e) => setNewListing((p) => ({ ...p, sellerWebsite: e.target.value }))}
                  placeholder="https://exempel.se"
                />
              </label>
              <label className={styles.field}>
                <span>Pris (kr)</span>
                <input
                  value={newListing.price}
                  onChange={(e) => setNewListing((p) => ({ ...p, price: e.target.value }))}
                  placeholder="19000"
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Kategori</span>
                <select
                  value={newListing.category}
                  onChange={(e) => setNewListing((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="">Välj kategori</option>
                  {flattenedCategoryOptions.map((cat) => {
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
              </label>
              {(categories.find((c) => c.value === newListing.category)?.createFields ??
                categories.find((c) => c.value === newListing.category)?.filters ??
                [])?.map((filter) => {
                  if (filter.type === "select") {
                    return (
                      <label key={filter.label} className={styles.field}>
                        <span>{filter.label}</span>
                        <select
                          value={attrValues[filter.label] || ""}
                          onChange={(e) =>
                            setAttrValues((prev) => ({ ...prev, [filter.label]: e.target.value }))
                          }
                        >
                          <option value="">Välj</option>
                          {filter.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }
                  if (filter.type === "range") {
                    const isSlider = filter.ui === "slider";
                    return (
                      <div key={filter.label} className={styles.field}>
                        <span>{filter.label}</span>
                        {isSlider ? (
                          <input
                            type="range"
                            min={filter.min}
                            max={filter.max}
                            value={attrValues[filter.label] || filter.min}
                            onChange={(e) =>
                              setAttrValues((prev) => ({ ...prev, [filter.label]: e.target.value }))
                            }
                          />
                        ) : (
                          <div className={styles.inlineFields}>
                            <input
                              type="number"
                              placeholder={filter.min}
                              value={attrValues[`${filter.label}-min`] || ""}
                              onChange={(e) =>
                                setAttrValues((prev) => ({
                                  ...prev,
                                  [`${filter.label}-min`]: e.target.value,
                                }))
                              }
                            />
                            <input
                              type="number"
                              placeholder={filter.max}
                              value={attrValues[`${filter.label}-max`] || ""}
                              onChange={(e) =>
                                setAttrValues((prev) => ({
                                  ...prev,
                                  [`${filter.label}-max`]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (filter.type === "chip") {
                    return (
                      <div key={filter.label} className={styles.field}>
                        <span>{filter.label}</span>
                        <div className={styles.inlineFields}>
                          {filter.options.map((opt) => {
                            const active = attrValues[filter.label] === opt;
                            return (
                              <button
                                type="button"
                                key={opt}
                                className={`${styles.quickAction} ${
                                  active ? styles.navItemActive : ""
                                }`}
                                onClick={() =>
                                  setAttrValues((prev) => ({
                                    ...prev,
                                    [filter.label]: active ? "" : opt,
                                  }))
                                }
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
              <label className={styles.field}>
                <span>Beskrivning / Meta</span>
                <textarea
                  value={newListing.meta}
                  onChange={(e) => setNewListing((p) => ({ ...p, meta: e.target.value }))}
                  placeholder="Kort info, t.ex. Automat • 12 000 mil"
                  rows={3}
                />
              </label>
              <label className={styles.field}>
                <span>Bild-URL</span>
                <input
                  value={newListing.image}
                  onChange={(e) => setNewListing((p) => ({ ...p, image: e.target.value }))}
                  placeholder="https://…"
                />
              </label>
              <label className={styles.field}>
                <span>Säljartyp</span>
                <select
                  value={newListing.seller}
                  onChange={(e) => setNewListing((p) => ({ ...p, seller: e.target.value }))}
                >
                  <option>Privat</option>
                  <option>Företag</option>
                </select>
              </label>
              <div className={styles.actionsRow}>
                <button type="submit" className={styles.primary}>
                  Skapa annons
                </button>
                <span className={styles.meta}>
                  Filtreringsregler från kategorier kopplas senare till båda vyerna.
                </span>
              </div>
            </form>
          </section>
        )}

        {tab === "moderation" && (
          <section className={styles.cardAccent}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.overtitle}>Pending annonser</p>
                  <h2 className={styles.subheading}>{pendingListings.length} att granska</h2>
                </div>
                <button className={styles.primary} onClick={approveAll}>
                  Bulk: godkänn alla
                </button>
              </div>
              <div className={styles.list}>
                {pendingListings.map((item) => (
                  <div key={item.id} className={styles.listRow}>
                    <div>
                    <p className={styles.title}>{item.title}</p>
                    <p className={styles.meta}>
                      {item.category || "Kategori saknas"} • {item.price} • {item.seller}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.ghost}>Öppna</button>
                    <button className={styles.primary} onClick={() => updateStatus(item.id, "active")}>
                      Godkänn
                    </button>
                    <button className={styles.danger} onClick={() => updateStatus(item.id, "rejected")}>
                      Avslå
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "categories" && (
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.overtitle}>Kategorier & filter</p>
                <h2 className={styles.subheading}>{categories.length} st</h2>
                <p className={styles.body}>
                  Lägg till kravfält för annonsformulär och sök. Välj slider, min/max eller valbara
                  alternativ så att webben vet vilket UI som ska användas.
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.primary}
                  type="button"
                  onClick={() => {
                    resetCategoryForm();
                    setShowCategoryForm(true);
                    setCategoryForm({ value: "", label: "", parentValue: "" });
                  }}
                >
                  Ny huvudkategori
                </button>
                <button className={styles.ghost} type="button" onClick={fetchCategories}>
                  Ladda om
                </button>
              </div>
            </div>
            <div className={styles.list}>
              {topCategories.map((cat) => {
                const createFields = cat.createFields ?? cat.filters ?? [];
                const searchFilters = cat.searchFilters ?? cat.filters ?? [];
                return (
                  <div key={cat.value} className={styles.listGroup}>
                    <div className={styles.listRow}>
                      <div className={styles.listRowInfo}>
                        <p className={styles.title}>{cat.label}</p>
                        <p className={styles.meta}>
                          {createFields.length} publiceringsfält • {searchFilters.length} sökfilter • slug: {cat.value}
                        </p>
                        <div className={styles.filterPills}>
                          {createFields.map((f) => (
                            <span key={f.label} className={styles.pill}>
                              {f.label}
                              <span className={styles.pillMeta}>
                                {f.type === "range"
                                  ? f.ui === "slider"
                                    ? "slider"
                                    : "min/max"
                                  : f.type === "chip"
                                  ? "chips"
                                  : "dropdown"}
                              </span>
                            </span>
                          ))}
                        </div>
                        {searchFilters.length > 0 && (
                          <div className={styles.filterPills}>
                            {searchFilters.map((f) => (
                              <span key={f.label} className={styles.pillAlt}>
                                {f.label}
                                <span className={styles.pillMeta}>
                                  {f.type === "range"
                                    ? f.ui === "slider"
                                      ? "slider"
                                      : "min/max"
                                    : f.type === "chip"
                                    ? "chips"
                                    : "dropdown"}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={styles.actions}>
                        <button className={styles.quickAction} onClick={() => startSubcategory(cat)}>
                          <span className={styles.quickTitle}>Ny underkategori</span>
                          <span className={styles.micro}>Kopierar fälten, välj nytt namn</span>
                        </button>
                        <button className={styles.ghost} onClick={() => startEditCategory(cat)}>
                          Redigera
                        </button>
                        <button className={styles.danger} onClick={() => onDeleteCategory(cat.value)}>
                          Ta bort
                        </button>
                      </div>
                    </div>
                    {childrenByParent[cat.value]?.length ? (
                      <div className={styles.subList}>
                        {childrenByParent[cat.value].map((child) => {
                          const childCreate = child.createFields ?? child.filters ?? [];
                          const childSearch = child.searchFilters ?? child.filters ?? [];
                          return (
                            <div key={child.value} className={styles.listRow}>
                              <div className={styles.listRowInfo}>
                                <p className={styles.title}>
                                  {child.label} <span className={styles.micro}>({cat.label})</span>
                                </p>
                                <p className={styles.meta}>
                                  {childCreate.length} publiceringsfält • {childSearch.length} sökfilter • slug: {child.value}
                                </p>
                                <div className={styles.filterPills}>
                                  {childCreate.map((f) => (
                                    <span key={f.label} className={styles.pill}>
                                      {f.label}
                                      <span className={styles.pillMeta}>
                                        {f.type === "range"
                                          ? f.ui === "slider"
                                            ? "slider"
                                            : "min/max"
                                          : f.type === "chip"
                                          ? "chips"
                                          : "dropdown"}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                                {childSearch.length > 0 && (
                                  <div className={styles.filterPills}>
                                    {childSearch.map((f) => (
                                      <span key={f.label} className={styles.pillAlt}>
                                        {f.label}
                                        <span className={styles.pillMeta}>
                                          {f.type === "range"
                                            ? f.ui === "slider"
                                              ? "slider"
                                              : "min/max"
                                            : f.type === "chip"
                                            ? "chips"
                                            : "dropdown"}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className={styles.actions}>
                                <button className={styles.ghost} onClick={() => startEditCategory(child)}>
                                  Redigera
                                </button>
                                <button className={styles.danger} onClick={() => onDeleteCategory(child.value)}>
                                  Ta bort
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {categories.length === 0 && <p className={styles.meta}>Inga kategorier ännu.</p>}
            </div>
            {showCategoryForm && (
              <>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.overtitle}>
                      {editingCategory ? "Redigera kategori" : "Ny kategori"}
                    </p>
                    <h3 className={styles.subheading}>
                      {editingCategory
                        ? categoryForm.label || editingCategory
                        : "Skapa kategori + fält"}
                    </h3>
                    <p className={styles.meta}>
                      Lägg till fält för underkategori, slider (min/max) eller chips. Krävs både för
                      annonsformuläret och sök.
                    </p>
                  </div>
                  {categorySuccess && <span className={styles.badge}>{categorySuccess}</span>}
                </div>
                <form className={styles.formGrid} onSubmit={onSaveCategory}>
                  {categoryErrors.length > 0 && (
                    <div className={styles.errorBox}>
                      {categoryErrors.map((err) => (
                        <p key={err}>{err}</p>
                      ))}
                    </div>
                  )}
                  <label className={styles.field}>
                    <span>{categoryForm.parentValue ? "Ny underkategori" : "Ny huvudkategori"}</span>
                    <input
                      value={categoryForm.label}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, label: e.target.value }))}
                      placeholder={
                        categoryForm.parentValue ? "ex. Bilar eller MC" : "ex. Fordon eller Elektronik"
                      }
                    />
                  </label>
                  <div className={styles.fullRow}>
                    <p className={styles.overtitle}>Fält vid publicering</p>
                    <div className={styles.presetRow}>
                      <span className={styles.meta}>Snabbval</span>
                      {filterPresets.map((preset) => (
                        <button
                          type="button"
                          key={preset.label}
                          className={styles.quickAction}
                          onClick={() => addFilterDraft("create", preset.draft)}
                        >
                          <span className={styles.quickTitle}>{preset.label}</span>
                          <span className={styles.micro}>{preset.hint}</span>
                        </button>
                      ))}
                      <button type="button" className={styles.ghost} onClick={() => addFilterDraft("create")}>
                        Tomt fält
                      </button>
                    </div>
                    <div className={styles.filterBuilder}>
                      {createDrafts.length === 0 && (
                        <p className={styles.meta}>
                          Inga fält ännu. Lägg till underkategori, slider eller chips ovan.
                        </p>
                      )}
                      {createDrafts.map((filter) => (
                        <div key={filter.id} className={styles.filterCard}>
                          <div className={styles.filterCardHeader}>
                            <label className={styles.field}>
                              <span>Fältnamn</span>
                              <input
                                value={filter.label}
                                onChange={(e) =>
                                  updateFilterDraft("create", filter.id, { label: e.target.value })
                                }
                                placeholder="ex. Miltal eller Drivmedel"
                              />
                            </label>
                            <div className={styles.filterMetaRow}>
                              <label className={styles.smallLabel}>Typ</label>
                              <select
                                value={filter.type}
                                onChange={(e) =>
                                  updateFilterDraft("create", filter.id, {
                                    type: e.target.value as FilterOption["type"],
                                  })
                                }
                              >
                                <option value="select">Dropdown</option>
                                <option value="chip">Chips / snabbval</option>
                                <option value="range">Range (slider/min-max)</option>
                              </select>
                              <label className={styles.checkboxLabel}>
                                <input
                                  type="checkbox"
                                  checked={filter.required}
                                  onChange={(e) =>
                                    updateFilterDraft("create", filter.id, {
                                      required: e.target.checked,
                                    })
                                  }
                                />
                                Obligatoriskt
                              </label>
                            </div>
                          </div>
                          {filter.type === "range" ? (
                            <div className={styles.inlineFields}>
                              <input
                                type="number"
                                placeholder="Min (ex. 0)"
                                value={filter.min ?? ""}
                                onChange={(e) =>
                                  updateFilterDraft("create", filter.id, { min: e.target.value })
                                }
                              />
                              <input
                                type="number"
                                placeholder="Max (ex. 30000)"
                                value={filter.max ?? ""}
                                onChange={(e) =>
                                  updateFilterDraft("create", filter.id, { max: e.target.value })
                                }
                              />
                              <select
                                value={filter.ui === "slider" ? "slider" : "number"}
                                onChange={(e) =>
                                  updateFilterDraft("create", filter.id, {
                                    ui: e.target.value as FilterOption["ui"],
                                  })
                                }
                              >
                                <option value="slider">Slider (ett värde)</option>
                                <option value="number">Min & max fält</option>
                              </select>
                            </div>
                          ) : (
                            <div className={styles.field}>
                              <span>Alternativ (kommaseparerade)</span>
                              <input
                                value={(filter.options || []).join(", ")}
                                onChange={(e) => updateFilterOptions("create", filter.id, e.target.value)}
                                placeholder="ex. Bensin, Diesel, El"
                              />
                              <span className={styles.meta}>
                                Visas som {filter.type === "chip" ? "chips/toggles" : "dropdown"}.
                              </span>
                            </div>
                          )}
                          <div className={styles.filterFooter}>
                            <span className={styles.meta}>
                              Form:{" "}
                              {filter.type === "range"
                                ? filter.ui === "slider"
                                  ? "Slider (ett värde)"
                                  : "Min & max-fält"
                                : filter.type === "chip"
                                ? "Klickbara taggar"
                                : "Dropdown"}
                            </span>
                            <button
                              type="button"
                              className={styles.danger}
                              onClick={() => removeFilterDraft("create", filter.id)}
                            >
                              Ta bort fält
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.fullRow}>
                    <div className={styles.filterHeaderRow}>
                      <p className={styles.overtitle}>Filter vid sök</p>
                      <div className={styles.actions}>
                        <button type="button" className={styles.ghost} onClick={copyCreateToSearch}>
                          Kopiera från publicering
                        </button>
                        <button
                          type="button"
                          className={styles.ghost}
                          onClick={() => addFilterDraft("search")}
                        >
                          Tomt filter
                        </button>
                      </div>
                    </div>
                    <div className={styles.presetRow}>
                      <span className={styles.meta}>Snabbval</span>
                      {filterPresets.map((preset) => (
                        <button
                          type="button"
                          key={preset.label}
                          className={styles.quickAction}
                          onClick={() => addFilterDraft("search", preset.draft)}
                        >
                          <span className={styles.quickTitle}>{preset.label}</span>
                          <span className={styles.micro}>{preset.hint}</span>
                        </button>
                      ))}
                    </div>
                    <div className={styles.filterBuilder}>
                      {searchDrafts.length === 0 && (
                        <p className={styles.meta}>Inga filter ännu. Lägg till eller kopiera ovan.</p>
                      )}
                      {searchDrafts.map((filter) => (
                        <div key={filter.id} className={styles.filterCard}>
                          <div className={styles.filterCardHeader}>
                            <label className={styles.field}>
                              <span>Fältnamn</span>
                              <input
                                value={filter.label}
                                onChange={(e) =>
                                  updateFilterDraft("search", filter.id, { label: e.target.value })
                                }
                                placeholder="ex. Miltal eller Drivmedel"
                              />
                            </label>
                            <div className={styles.filterMetaRow}>
                              <label className={styles.smallLabel}>Typ</label>
                              <select
                                value={filter.type}
                                onChange={(e) =>
                                  updateFilterDraft("search", filter.id, {
                                    type: e.target.value as FilterOption["type"],
                                  })
                                }
                              >
                                <option value="select">Dropdown</option>
                                <option value="chip">Chips / snabbval</option>
                                <option value="range">Range (slider/min-max)</option>
                              </select>
                            </div>
                          </div>
                          {filter.type === "range" ? (
                            <div className={styles.inlineFields}>
                              <input
                                type="number"
                                placeholder="Min (ex. 0)"
                                value={filter.min ?? ""}
                                onChange={(e) =>
                                  updateFilterDraft("search", filter.id, { min: e.target.value })
                                }
                              />
                              <input
                                type="number"
                                placeholder="Max (ex. 30000)"
                                value={filter.max ?? ""}
                                onChange={(e) =>
                                  updateFilterDraft("search", filter.id, { max: e.target.value })
                                }
                              />
                              <select
                                value={filter.ui === "slider" ? "slider" : "number"}
                                onChange={(e) =>
                                  updateFilterDraft("search", filter.id, {
                                    ui: e.target.value as FilterOption["ui"],
                                  })
                                }
                              >
                                <option value="slider">Slider (ett värde)</option>
                                <option value="number">Min & max fält</option>
                              </select>
                            </div>
                          ) : (
                            <div className={styles.field}>
                              <span>Alternativ (kommaseparerade)</span>
                              <input
                                value={(filter.options || []).join(", ")}
                                onChange={(e) => updateFilterOptions("search", filter.id, e.target.value)}
                                placeholder="ex. Bensin, Diesel, El"
                              />
                              <span className={styles.meta}>
                                Visas som {filter.type === "chip" ? "chips/toggles" : "dropdown"}.
                              </span>
                            </div>
                          )}
                          <div className={styles.filterFooter}>
                            <span className={styles.meta}>
                              Sökfilter:{" "}
                              {filter.type === "range"
                                ? filter.ui === "slider"
                                  ? "Slider (ett värde)"
                                  : "Min & max-fält"
                                : filter.type === "chip"
                                ? "Klickbara taggar"
                                : "Dropdown"}
                            </span>
                            <button
                              type="button"
                              className={styles.danger}
                              onClick={() => removeFilterDraft("search", filter.id)}
                            >
                              Ta bort filter
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.actionsRow}>
                    <button type="submit" className={styles.primary} disabled={isSavingCategory}>
                      {isSavingCategory
                        ? "Sparar..."
                        : editingCategory
                        ? "Spara ändringar"
                        : "Skapa kategori"}
                    </button>
                    <button type="button" className={styles.ghost} onClick={resetCategoryForm}>
                      Rensa formulär
                    </button>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => {
                        resetCategoryForm();
                        setShowCategoryForm(false);
                      }}
                    >
                      Stäng
                    </button>
                    <span className={styles.meta}>
                      Tydliga fält här ger rätt UI i både admin och sök (slider/droplist/chips).
                    </span>
                  </div>
                </form>
              </>
            )}
          </section>
        )}

        {tab === "blocked" && (
          <section className={styles.card}>
            <p className={styles.overtitle}>Blockerade konton</p>
            <p className={styles.body}>Här lägger vi listan när backend finns på plats.</p>
          </section>
        )}

        {tab === "rules" && (
          <section className={styles.card}>
            <p className={styles.overtitle}>Annonsregler</p>
            <p className={styles.body}>Här kan vi redigera reglerna när vi kopplar riktig backend.</p>
          </section>
        )}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.overtitle}>Separera admin senare</p>
              <h2 className={styles.subheading}>Plan för egen app</h2>
            </div>
          </div>
          <ol className={styles.listSteps}>
            <li>Lägg delade typer/UI/API i packages (redan gjort som blueprint).</li>
            <li>Flytta admin till egen app/repo och importera samma paket.</li>
            <li>Behåll backend/API som central sanning med rollbaserad auth.</li>
            <li>Justera env/urls för admin i egen deployment.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
