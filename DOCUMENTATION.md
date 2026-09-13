# 📘 Documentations Kb POS Astra

Caisse enregistreuse web (Next.js) — déploiement **Vercel** — base **MySQL/MariaDB cPanel**.

---

## 1. Vue d'ensemble

- **Next.js** (App Router, Turbopack), composants React côté client.
- Données servies/écrites par les routes `/api/sql/*` vers la base **`ahlemkou_kbpos`** sur **`ahlemkoubci.icu`** (MySQL distant, autorisation `%` dans cPanel → Remote MySQL).
- Mode **base unique** : catalogue ET ventes dans la même base (`getPosDb` = `DB_NAME`).
- Accès par **URL** ; sans mot de passe par défaut (voir § 7).

---

## 2. Structure des dossiers

| Dossier | Rôle |
|---|---|
| `src/app/` | Pages : `/` (caisse), `/admin/*`, `/stats`, `/connexion` |
| `src/app/api/` | Routes API : `sql/*`, `auth/*`, `json`, `data`, `spreadsheet`, `counter-order`, `complete-order` |
| `src/app/components/` | POS (`Category`, `NumPad`, `Total`, `MainContent`…) + `admin/` |
| `src/app/contexts/` | `ConfigProvider`, `DataProvider`, `CryptoProvider`, `PopupProvider` |
| `src/app/hooks/` | `usePay`, `useData`, `useConfig`, `useSummary`, `useCrypto` |
| `src/app/utils/` | `processData`, `constants`, `fullscreen`, `posPrinter`, `transactionStore`, `adminAuth` |
| `scripts/` | `setup-db.cjs`, `verify-db.cjs`, `firestore-to-mariadb.ts`, `import/` |
| `__tests__/` | Tests unitaires |
| `DOCUMENTATION.md` | Ce document |

---

## 3. Tables MySQL (20) et rôles

### Catalogue
| Table | Rôle | Colonnes clés |
|---|---|---|
| `categorie` | Catégories du POS | `id` (VARCHAR 10), `nom`, `ordre` |
| `article` | Produits | `nom` (unique), `prix`, `disponible`, `categorie`, `options` (JSON), `taux_tva`, `ordre` |
| `formule` | Menus composés | `nom`, `prix`, `ordre` |
| `element_formule` | Éléments de formule | `nom` |
| `rel_ef_formule` | élément↔formule | `id_formule`, `id_element_formule`, `ordre` |
| `rel_ef_article` | article↔élément | `id_element_formule`, `id_article`, `ordre` |

### Commandes (restaurant)
| Table | Rôle |
|---|---|
| `panier` | Une commande (`short_num_order`, `service_type`, `paid`, `preparation_started_at`) |
| `rel_panier_article` | Lignes articles (quantité, option, `kitchen_view`) |
| `rel_panier_formule` | Lignes formules |
| `rel_pf_ef` | Détail formule du panier |
| `rel_table_panier` | Table associée |

### Ventes
| Table | Rôle |
|---|---|
| `facturation` | Ticket encaissé (`user_id`, `payment_method_id`, `amount`, `currency`) |
| `facturation_article` | Lignes détaillées (remises, total) |

### Configuration
| Table | Rôle |
|---|---|
| `config_etablissement` | `mode_fonctionnement` (restaurant/fastfood/lite), kitchen/grafana booléens |
| `parameters` | `param_key`/`param_value` : `name`, `address`, `zipCode`, `city`, `id` (shop id), `email`, `thanksMessage`, `closingHour`, `yearStartDate`, `mercurial` |
| `users` | `id`, `key`, `name`, `role` |
| `payment_methods` | `label`, `address` (IBAN), `currency` (DA), `hidden` |
| `currency` | `label`, `symbol`, `max_value`, `decimals` — la 1ʳᵉ ligne = devise affichée |
| `printers` | `name`, `ip_address`, `note_enabled` |
| `theme_admin` | Couleurs clair/sombre (7 zones × 2) |

> ⚠️ Ne pas appeler `/api/sql/init` (ancien schéma legacy incompatible ; supprimé par `setup-db.cjs`).

---

## 4. Fonctionnalités (visibles / cachées)

**Visibles**
1. Catégorie → produit → options/formules → quantité → panier.
2. Plein écran automatique au 1ᵉʳ produit (notre ajout).
3. Paiement **Espèce / Carte Bancaire / Chèque** (filtre par devise courante).
4. Mettre en attente, remboursement, impression thermique (port 9100).
5. Remises, changement de quantité, transactions du jour.
6. Reset journalier à `closingHour`.
7. Nav admin flottante sur `/admin/tradiz/?shop=…`.

**Cachées / conditionnelles**
- Paiement **crypto Solana/Ğ1** (QRCode) et **Virement** (IBAN) si méthodes en base.
- **Paiement partiel** sur commande restaurant (≥ 2 articles).
- **Mode transverse / tables** + **kitchen view** (`/admin/kitchen`, messages `ORDER_ID/REFRESH/CLOSE`).
- **TVA** par article, **Mercurial**, **multi-devises**.
- Mode lite/spreadsheet désactivé (`NEXT_PUBLIC_USE_DIGICARTE=true`).

---

## 5. Routes API

- **Lecture** : `getCatalog`, `getAllArticles`, `getCategories`, `getCurrencies`, `getDiscounts`, `getColors`, `getPrinters`, `getPaymentMethods`, `getUsers`, `getParameters`, `getEtabConfig`, `getDbConfig`, `getTransactions`, `getStatistics`, `getTransactionItems`, `getOrderItems`, `getOrderItemsForPayment`, `getPendingOrdersForCashier`.
- **Écriture** : `saveTransaction` (ventes — public pour la caisse), `savePartialPayment`, `updateArticles`, `updateCategories`, `updateParameters` (**protégées par mot de passe** si `ADMIN_PASSWORD` défini).
- **Auth** : `POST /api/auth/login`, `DELETE /api/auth/login` (déconnexion).

---

## 6. Paramétrage

**Variables Vercel**

| Variable | Valeur |
|---|---|
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `ahlemkoubci.icu` / `ahlemkou_kbuser` / … / `ahlemkou_kbpos` |
| `NEXT_CONFIG_USE_DIGICARTE` | `true` |
| `NEXT_CONFIG_WEB_URL` | `https://kb-pos-astra.vercel.app` |
| `ADMIN_PASSWORD` | (optionnel) mot de passe admin |

> Après modification → **Redeploy** (valeurs `NEXT_PUBLIC_*` gravées au build ; `next.config.js` remappe `NEXT_CONFIG_*`).

**Données boutique** : `/admin/edit_menu` (produits/catégories), `/admin/kitchen/config` (params + remises), phpMyAdmin (paiements, devises, imprimantes, users, couleurs, mode).

---

## 7. Authentification (protection admin)

Activée **uniquement** si la variable `ADMIN_PASSWORD` est définie : sinon accès libre (comportement d'origine).
- Pages protégées : `/admin/*` et `/stats` → redirection vers `/connexion`.
- Routes d'écriture protégées : `updateArticles`, `updateCategories`, `updateParameters` → 401 sans session.
- Session : cookie `admin_session` httpOnly HMAC-SHA256, durée 12 h.
- **La caisse `/` reste publique** : les ventes (`saveTransaction`) et le chargement du catalogue ne sont pas protégés.

**Accès à toutes les données** : cPanel → phpMyAdmin → base `ahlemkou_kbpos` (lecture/écriture complète). Diagnostic : `node scripts/verify-db.cjs`.

---

## 8. Exploitation quotidienne

1. Ouvrir la caisse → catalogue MySQL → plein écran au 1ᵉʳ produit.
2. Encaisser (Espèce/Chèque…) → écriture `facturation` + `facturation_article`.
3. `closingHour` → remise à zéro journalière.
4. Suivi via `/stats` (après connexion admin) ou phpMyAdmin.